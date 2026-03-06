import { useState, useCallback, useRef, useEffect } from "react";
import { Platform } from "react-native";
import base64js from "base64-js";

let AudioContext: any = null;
let AudioManager: any = null;
let ExpoAudioStreamModule: any = null;
let useAudioRecorderImport: any = null;

try {
  const audioApi = require("react-native-audio-api");
  AudioContext = audioApi.AudioContext;
  AudioManager = audioApi.AudioManager;
} catch {}

try {
  const audioStudio = require("@siteed/expo-audio-studio");
  ExpoAudioStreamModule = audioStudio.ExpoAudioStreamModule;
  useAudioRecorderImport = audioStudio.useAudioRecorder;
} catch {}

const GEMINI_WS_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained";

// Accumulate ~200ms of 24kHz 16-bit mono PCM before enqueuing (9600 bytes)
const FLUSH_THRESHOLD = 9600;

export type VoiceStatus = "idle" | "connecting" | "connected" | "error";

export interface TranscriptEntry {
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

interface UseGeminiVoiceProps {
  onTranscript?: (entry: TranscriptEntry) => void;
  onTranscriptUpdate?: (role: "user" | "assistant", fullText: string) => void;
  onStatusChange?: (status: VoiceStatus) => void;
  onError?: (error: string) => void;
}

export function useGeminiVoice({
  onTranscript,
  onTranscriptUpdate,
  onStatusChange,
  onError,
}: UseGeminiVoiceProps = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<InstanceType<typeof AudioContext> | null>(null);
  const audioSourceRef = useRef<any>(null);
  const isSourceStartedRef = useRef(false);
  const isMutedRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTokenRef = useRef<string | null>(null);
  const lastPromptRef = useRef<string | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const intentionalCloseRef = useRef(false);

  // Buffer accumulation for smoother playback
  const pendingPcmRef = useRef<Uint8Array[]>([]);
  const pendingSizeRef = useRef(0);

  // Transcript accumulation
  const outputTranscriptRef = useRef("");
  const inputTranscriptRef = useRef("");
  const currentOutputIdxRef = useRef(-1);
  const currentInputIdxRef = useRef(-1);
  const audioChunkCountRef = useRef(0);
  const playCountRef = useRef(0);

  const recorder = useAudioRecorderImport
    ? useAudioRecorderImport()
    : { startRecording: async () => {}, stopRecording: async () => {} };
  const { startRecording, stopRecording } = recorder;

  const updateStatus = useCallback(
    (newStatus: VoiceStatus) => {
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    },
    [onStatusChange],
  );

  const addTranscriptEntry = useCallback(
    (role: "user" | "assistant", text: string) => {
      if (!text.trim()) return;
      const entry: TranscriptEntry = { role, text: text.trim(), timestamp: Date.now() };
      setTranscript((prev) => [...prev, entry]);
      onTranscript?.(entry);
    },
    [onTranscript],
  );

  const audioSessionConfiguredRef = useRef(false);

  // Create AudioContext and BufferQueueSource
  const ensureAudioPipeline = useCallback(async () => {
    if (!AudioContext) return false;

    // Configure iOS audio session ONCE per connection
    if (AudioManager && Platform.OS === "ios" && !audioSessionConfiguredRef.current) {
      try {
        AudioManager.setAudioSessionOptions({
          iosCategory: "playAndRecord",
          iosMode: "voiceChat",
          iosOptions: ["defaultToSpeaker", "allowBluetoothA2DP"],
        });
        audioSessionConfiguredRef.current = true;
        console.log("[GeminiVoice] Audio session configured: playAndRecord + defaultToSpeaker");
      } catch (e: any) {
        console.warn("[GeminiVoice] Audio session config failed:", e?.message);
      }
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      console.log("[GeminiVoice] AudioContext created");
    }

    const ctx = audioContextRef.current;
    if (ctx.state === "suspended" || ctx.state === "interrupted") {
      try { await ctx.resume(); } catch {}
    }

    if (!audioSourceRef.current && Platform.OS !== "web") {
      // @ts-ignore
      const source = ctx.createBufferQueueSource();
      source.connect(ctx.destination);
      audioSourceRef.current = source;
      isSourceStartedRef.current = false;
      console.log("[GeminiVoice] BufferQueueSource created");
    }

    return true;
  }, []);

  // Convert pending PCM bytes to float32 AudioBuffer and enqueue
  const flushPendingAudio = useCallback(() => {
    if (pendingSizeRef.current === 0) return;
    const ctx = audioContextRef.current;
    const source = audioSourceRef.current;
    if (!ctx || !source) return;

    const totalLen = pendingSizeRef.current;
    const combined = new Uint8Array(totalLen);
    let off = 0;
    for (const chunk of pendingPcmRef.current) {
      combined.set(chunk, off);
      off += chunk.length;
    }
    pendingPcmRef.current = [];
    pendingSizeRef.current = 0;

    const sampleCount = combined.length / 2;
    const samples = new Float32Array(sampleCount);
    const dv = new DataView(combined.buffer, combined.byteOffset, combined.byteLength);
    for (let i = 0; i < sampleCount; i++) {
      const v = dv.getInt16(i * 2, true);
      samples[i] = v < 0 ? v / 32768 : v / 32767;
    }

    const buf = ctx.createBuffer(1, sampleCount, 24000);
    buf.copyToChannel(samples, 0);
    source.enqueueBuffer(buf);

    if (!isSourceStartedRef.current) {
      source.start();
      isSourceStartedRef.current = true;
      console.log("[GeminiVoice] Audio playback started");
    }

    playCountRef.current += 1;
    if (playCountRef.current <= 3 || playCountRef.current % 50 === 0) {
      console.log("[GeminiVoice] Enqueued audio #" + playCountRef.current + ", samples:" + sampleCount);
    }
  }, []);

  const playAudioChunk = useCallback(
    async (base64Data: string) => {
      try {
        await ensureAudioPipeline();
        const byteArray = base64js.toByteArray(base64Data);
        pendingPcmRef.current.push(byteArray);
        pendingSizeRef.current += byteArray.length;

        if (pendingSizeRef.current >= FLUSH_THRESHOLD) {
          flushPendingAudio();
        }
      } catch (err: any) {
        console.error("[GeminiVoice] playAudioChunk error:", err?.message ?? err);
      }
    },
    [ensureAudioPipeline, flushPendingAudio],
  );

  const clearAudioPlayback = useCallback(() => {
    pendingPcmRef.current = [];
    pendingSizeRef.current = 0;
    if (audioSourceRef.current) {
      try { audioSourceRef.current.clearBuffers(); } catch {}
    }
  }, []);

  // Recreate the source after an interruption so we get a fresh queue
  const resetAudioSource = useCallback(async () => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
        audioSourceRef.current.disconnect();
      } catch {}
      audioSourceRef.current = null;
      isSourceStartedRef.current = false;
    }
    pendingPcmRef.current = [];
    pendingSizeRef.current = 0;
    await ensureAudioPipeline();
  }, [ensureAudioPipeline]);

  const connect = useCallback(
    async (token: string, systemPrompt?: string) => {
      try {
        updateStatus("connecting");
        lastTokenRef.current = token;
        lastPromptRef.current = systemPrompt ?? null;
        intentionalCloseRef.current = false;

        if (!AudioContext || !ExpoAudioStreamModule) {
          updateStatus("error");
          onError?.("Voice requires a native dev build. Rebuild in Xcode after pod install.");
          return;
        }

        const permResult = await ExpoAudioStreamModule.requestPermissionsAsync();
        if (!permResult.granted) {
          updateStatus("error");
          onError?.("Microphone permission denied");
          return;
        }

        await ensureAudioPipeline();

        const wsUrl = `${GEMINI_WS_URL}?access_token=${token}`;
        console.log("[GeminiVoice] Connecting WebSocket...");
        const ws = new WebSocket(wsUrl);

        ws.onopen = async () => {
          console.log("[GeminiVoice] WebSocket opened, sending setup...");
          wsRef.current = ws;

          const setupMsg: any = {
            setup: {
              model: "models/gemini-2.5-flash-native-audio-latest",
              generationConfig: {
                responseModalities: ["AUDIO"],
                temperature: 0.8,
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: "Kore" },
                  },
                },
              },
              inputAudioTranscription: {},
              outputAudioTranscription: {},
            },
          };
          if (systemPrompt) {
            setupMsg.setup.systemInstruction = {
              parts: [{ text: systemPrompt }],
            };
          }
          console.log("[GeminiVoice] Setup sent, prompt length:", systemPrompt?.length ?? 0);
          ws.send(JSON.stringify(setupMsg));
        };

        ws.onmessage = async (event) => {
          try {
            let raw = "";
            if (typeof event.data === "string") {
              raw = event.data;
            } else if (event.data instanceof Blob) {
              raw = await event.data.text();
            } else if (event.data instanceof ArrayBuffer) {
              raw = new TextDecoder().decode(event.data);
            }
            if (!raw) return;

            const data = JSON.parse(raw);

            if (data.setupComplete) {
              setIsConnected(true);
              updateStatus("connected");
              reconnectAttemptsRef.current = 0;
              console.log("[GeminiVoice] Setup complete, starting mic...");

              // Keep-alive: send a silent audio frame every 15s to prevent idle timeout
              if (keepAliveRef.current) clearInterval(keepAliveRef.current);
              keepAliveRef.current = setInterval(() => {
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                  // 320 bytes = 10ms of 16kHz 16-bit mono silence
                  const silence = new Uint8Array(320);
                  const b64 = base64js.fromByteArray(silence);
                  wsRef.current.send(
                    JSON.stringify({
                      realtimeInput: {
                        audio: { mimeType: "audio/pcm;rate=16000", data: b64 },
                      },
                    }),
                  );
                }
              }, 15000);

              ws.send(JSON.stringify({
                clientContent: {
                  turns: [{ role: "user", parts: [{ text: "Hello" }] }],
                  turnComplete: true,
                },
              }));

              audioChunkCountRef.current = 0;
              playCountRef.current = 0;
              await startRecording({
                sampleRate: 16000,
                channels: 1,
                encoding: "pcm_16bit",
                interval: 100,
                onAudioStream: async (audioEvent: any) => {
                  if (
                    wsRef.current?.readyState === WebSocket.OPEN &&
                    audioEvent.data &&
                    !isMutedRef.current &&
                    !isSpeakingRef.current
                  ) {
                    audioChunkCountRef.current += 1;
                    if (audioChunkCountRef.current <= 3 || audioChunkCountRef.current % 200 === 0) {
                      console.log("[GeminiVoice] Mic chunk #" + audioChunkCountRef.current);
                    }
                    const b64 = typeof audioEvent.data === "string" ? audioEvent.data : "";
                    if (b64) {
                      wsRef.current.send(
                        JSON.stringify({
                          realtimeInput: {
                            audio: {
                              mimeType: "audio/pcm;rate=16000",
                              data: b64,
                            },
                          },
                        }),
                      );
                    }
                  }
                },
              });
              console.log("[GeminiVoice] Mic recording started");
              return;
            }

            if (data.serverContent) {
              const sc = data.serverContent;

              // Audio response chunks — mute mic while model speaks to prevent echo
              if (sc.modelTurn?.parts) {
                setIsSpeaking(true);
                isSpeakingRef.current = true;
                for (const part of sc.modelTurn.parts) {
                  if (part.inlineData?.data) {
                    await playAudioChunk(part.inlineData.data);
                  }
                }
              }

              // Turn complete — flush any remaining audio and finalize transcripts
              if (sc.turnComplete) {
                flushPendingAudio();
                setIsSpeaking(false);
                isSpeakingRef.current = false;
                outputTranscriptRef.current = "";
                inputTranscriptRef.current = "";
                currentOutputIdxRef.current = -1;
                currentInputIdxRef.current = -1;
              }

              // Interrupted by user — clear audio queue, reset source for next turn
              if (sc.interrupted) {
                await resetAudioSource();
                setIsSpeaking(false);
                isSpeakingRef.current = false;
                outputTranscriptRef.current = "";
                currentOutputIdxRef.current = -1;
              }

              // Input transcription (user speech)
              if (sc.inputTranscription) {
                const txt = sc.inputTranscription.text ?? "";
                if (currentInputIdxRef.current === -1) {
                  inputTranscriptRef.current = txt;
                  addTranscriptEntry("user", txt);
                  currentInputIdxRef.current = 1;
                } else {
                  inputTranscriptRef.current += txt;
                  onTranscriptUpdate?.("user", inputTranscriptRef.current);
                }
              }

              // Output transcription (model speech)
              if (sc.outputTranscription) {
                const txt = sc.outputTranscription.text ?? "";
                if (currentOutputIdxRef.current === -1) {
                  outputTranscriptRef.current = txt;
                  addTranscriptEntry("assistant", txt);
                  currentOutputIdxRef.current = 1;
                } else {
                  outputTranscriptRef.current += txt;
                  onTranscriptUpdate?.("assistant", outputTranscriptRef.current);
                }
              }
            }

            if (data.error) {
              console.error("[GeminiVoice] API error:", JSON.stringify(data.error));
            }
          } catch (parseErr: any) {
            console.error("[GeminiVoice] Parse error:", parseErr?.message);
          }
        };

        ws.onclose = async (e: any) => {
          console.log("[GeminiVoice] WS closed, code:", e?.code, "reason:", e?.reason);
          if (keepAliveRef.current) {
            clearInterval(keepAliveRef.current);
            keepAliveRef.current = null;
          }
          setIsConnected(false);
          setIsSpeaking(false);
          wsRef.current = null;
          try {
            await Promise.race([
              stopRecording(),
              new Promise((resolve) => setTimeout(resolve, 2000)),
            ]);
          } catch {}

          // Auto-reconnect on unexpected close (up to 2 attempts)
          if (
            !intentionalCloseRef.current &&
            reconnectAttemptsRef.current < 2 &&
            lastTokenRef.current
          ) {
            reconnectAttemptsRef.current += 1;
            console.log("[GeminiVoice] Auto-reconnecting, attempt", reconnectAttemptsRef.current);
            updateStatus("connecting");
            setTimeout(() => {
              connect(lastTokenRef.current!, lastPromptRef.current ?? undefined);
            }, 1000);
          } else if (!intentionalCloseRef.current) {
            updateStatus("error");
            onError?.("Voice connection lost. Please start a new session.");
          } else {
            updateStatus("idle");
          }
        };

        ws.onerror = (e: any) => {
          console.error("[GeminiVoice] WS error:", e?.message ?? e);
          updateStatus("error");
          setIsConnected(false);
          onError?.("Connection error — check that the token is valid");
        };
      } catch (err: any) {
        updateStatus("error");
        onError?.(err?.message ?? "Failed to connect");
      }
    },
    [
      updateStatus,
      onError,
      ensureAudioPipeline,
      startRecording,
      stopRecording,
      playAudioChunk,
      flushPendingAudio,
      resetAudioSource,
      addTranscriptEntry,
      status,
    ],
  );

  const disconnect = useCallback(async () => {
    intentionalCloseRef.current = true;
    reconnectAttemptsRef.current = 0;

    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      try { wsRef.current.close(); } catch {}
      wsRef.current = null;
    }

    // Native calls can hang — wrap each with a hard timeout
    try {
      await Promise.race([
        stopRecording(),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    } catch {}

    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
        audioSourceRef.current.disconnect();
      } catch {}
      audioSourceRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        await Promise.race([
          audioContextRef.current.close(),
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ]);
      } catch {}
      audioContextRef.current = null;
    }

    pendingPcmRef.current = [];
    pendingSizeRef.current = 0;
    isSourceStartedRef.current = false;
    audioSessionConfiguredRef.current = false;
    setIsConnected(false);
    setIsSpeaking(false);
    updateStatus("idle");
  }, [stopRecording, updateStatus]);

  const setMutedFn = useCallback((muted: boolean) => {
    setIsMuted(muted);
    isMutedRef.current = muted;
  }, []);

  useEffect(() => {
    return () => {
      intentionalCloseRef.current = true;
      if (keepAliveRef.current) clearInterval(keepAliveRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        try { wsRef.current.close(); } catch {}
      }
      if (audioSourceRef.current) {
        try { audioSourceRef.current.stop(); audioSourceRef.current.disconnect(); } catch {}
      }
      // Don't await audioContext.close() in cleanup — it can hang and block unmount
      if (audioContextRef.current) {
        const ctx = audioContextRef.current;
        audioContextRef.current = null;
        try { ctx.close(); } catch {}
      }
    };
  }, []);

  return {
    connect,
    disconnect,
    isConnected,
    isSpeaking,
    status,
    transcript,
    setMuted: setMutedFn,
    isMuted,
  };
}
