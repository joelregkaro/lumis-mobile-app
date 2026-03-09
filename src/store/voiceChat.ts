import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/analytics";

export interface VoiceTranscriptMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export type VoiceSessionStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "speaking"
  | "error";

interface VoiceChatState {
  status: VoiceSessionStatus;
  sessionId: string | null;
  sessionNumber: number;
  companionName: string;
  transcriptMessages: VoiceTranscriptMessage[];
  elapsed: number;
  isMuted: boolean;
  error: string | null;
  _accessToken: string | null;

  startSession: () => Promise<{ token: string; sessionId: string; systemPrompt: string }>;
  endSession: () => Promise<void>;
  addTranscript: (role: "user" | "assistant", content: string) => void;
  updateLastTranscript: (role: "user" | "assistant", content: string) => void;
  setStatus: (status: VoiceSessionStatus) => void;
  setMuted: (muted: boolean) => void;
  setElapsed: (elapsed: number) => void;
  reset: () => void;
}

export const useVoiceChatStore = create<VoiceChatState>((set, get) => ({
  status: "idle",
  sessionId: null,
  sessionNumber: 1,
  companionName: "Lumis",
  transcriptMessages: [],
  elapsed: 0,
  isMuted: false,
  error: null,
  _accessToken: null,

  startSession: async () => {
    set({ status: "connecting", error: null });

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      set({ status: "error", error: "Not authenticated" });
      throw new Error("Not authenticated");
    }

    const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/voice-session-token`;
    console.log("[VoiceStore] Fetching token from:", url);

    const MAX_RETRIES = 2;
    const TIMEOUT_MS = 15_000;
    let data: any = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (!res.ok) {
          const errBody = await res.text();
          console.error("[VoiceStore] Token fetch failed:", res.status, errBody);
          set({ status: "error", error: errBody });
          throw new Error(errBody);
        }

        data = await res.json();
        console.log("[VoiceStore] Token received, sessionId:", data.sessionId);
        break;
      } catch (err: any) {
        const isNetworkError = err?.name === "AbortError" || err?.message?.includes("Network request failed");
        if (isNetworkError && attempt < MAX_RETRIES) {
          const delay = (attempt + 1) * 1500;
          console.warn(`[VoiceStore] Attempt ${attempt + 1} failed (${err?.message}), retrying in ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        const msg = err?.name === "AbortError"
          ? "Connection timed out. Check your internet and try again."
          : err?.message ?? "Failed to start session";
        set({ status: "error", error: msg });
        throw new Error(msg);
      }
    }

    if (!data) {
      set({ status: "error", error: "Failed to start session after retries" });
      throw new Error("Failed to start session after retries");
    }

    set({
      sessionId: data.sessionId,
      sessionNumber: data.sessionNumber,
      companionName: data.companionName ?? "Lumis",
      transcriptMessages: [],
      elapsed: 0,
      status: "connecting",
      _accessToken: session.access_token,
    });

    track("voice_session_started", { session_number: data.sessionNumber, session_id: data.sessionId });
    return { token: data.token, sessionId: data.sessionId, systemPrompt: data.systemPrompt ?? "" };
  },

  endSession: async () => {
    const { sessionId, transcriptMessages, _accessToken } = get();
    if (!sessionId) return;

    const merged: { role: string; content: string }[] = [];
    for (const m of transcriptMessages) {
      const last = merged[merged.length - 1];
      if (last && last.role === m.role) {
        last.content += " " + m.content;
      } else {
        merged.push({ role: m.role, content: m.content });
      }
    }
    const transcript = merged;

    // Try stored token first, then refresh if needed
    let token = _accessToken;
    if (!token) {
      const { data } = await supabase.auth.refreshSession();
      token = data.session?.access_token ?? null;
    }
    if (!token) {
      console.error("[VoiceStore] No auth token available, cannot save session");
      return;
    }

    const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/voice-session-end`;
    try {
      let res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ session_id: sessionId, transcript }),
      });

      // If 401, try refreshing the token once
      if (res.status === 401) {
        console.log("[VoiceStore] Token expired, refreshing...");
        const { data } = await supabase.auth.refreshSession();
        const freshToken = data.session?.access_token;
        if (freshToken) {
          res = await fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${freshToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ session_id: sessionId, transcript }),
          });
        }
      }

      if (!res.ok) {
        console.error("[VoiceStore] Failed to save session:", res.status);
      } else {
        console.log("[VoiceStore] Session saved successfully, messages:", transcript.length);
      }
    } catch (e) {
      console.error("[VoiceStore] Failed to save session:", e);
    }

    track("voice_session_ended", { session_number: get().sessionNumber, duration_seconds: get().elapsed, message_count: transcriptMessages.length, session_id: sessionId });
    set({
      status: "idle",
      sessionId: null,
      transcriptMessages: [],
      elapsed: 0,
      isMuted: false,
      error: null,
      _accessToken: null,
    });
  },

  addTranscript: (role, content) => {
    if (!content.trim()) return;
    set((state) => ({
      transcriptMessages: [
        ...state.transcriptMessages,
        { role, content, timestamp: Date.now() },
      ],
    }));
  },

  updateLastTranscript: (role, content) => {
    if (!content.trim()) return;
    set((state) => {
      const msgs = [...state.transcriptMessages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === role) {
          msgs[i] = { ...msgs[i], content: content.trim() };
          return { transcriptMessages: msgs };
        }
      }
      return { transcriptMessages: [...msgs, { role, content: content.trim(), timestamp: Date.now() }] };
    });
  },

  setStatus: (status) => set({ status }),

  setMuted: (isMuted) => {
    track("voice_mute_toggled", { muted: isMuted });
    set({ isMuted });
  },

  setElapsed: (elapsed) => set({ elapsed }),

  reset: () =>
    set({
      status: "idle",
      sessionId: null,
      sessionNumber: 1,
      companionName: "Lumis",
      transcriptMessages: [],
      elapsed: 0,
      isMuted: false,
      error: null,
      _accessToken: null,
    }),
}));
