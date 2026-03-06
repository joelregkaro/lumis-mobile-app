import { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
} from "react-native-reanimated";
import CompanionAvatar from "@/components/companion/CompanionAvatar";
import type { CompanionExpression } from "@/components/companion/CompanionAvatar";
import { useVoiceChatStore } from "@/store/voiceChat";
import { useGeminiVoice } from "@/hooks/useGeminiVoice";
import { hapticLight, hapticMedium } from "@/lib/haptics";
import { useStreakStore } from "@/store/streak";
import { supabase } from "@/lib/supabase";
import type { VoiceTranscriptMessage } from "@/store/voiceChat";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function VoiceChatScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList<VoiceTranscriptMessage>>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isEnding, setIsEnding] = useState(false);

  const {
    status: storeStatus,
    sessionId,
    sessionNumber,
    companionName,
    transcriptMessages,
    elapsed,
    isMuted: storeMuted,
    error,
    startSession,
    addTranscript,
    updateLastTranscript,
    setStatus,
    setMuted: setStoreMuted,
    setElapsed,
  } = useVoiceChatStore();

  const {
    connect,
    disconnect,
    isConnected,
    isSpeaking,
    status: voiceStatus,
    setMuted: setVoiceMuted,
  } = useGeminiVoice({
    onTranscript: (entry) => {
      addTranscript(entry.role, entry.text);
    },
    onTranscriptUpdate: (role, fullText) => {
      updateLastTranscript(role, fullText);
    },
    onStatusChange: (newStatus) => {
      if (newStatus === "connected") setStatus("listening");
      else if (newStatus === "error") setStatus("error");
    },
    onError: (errMsg) => {
      setStatus("error");
      Alert.alert("Voice Session Error", errMsg);
    },
  });

  // Derive companion expression from state
  const expression: CompanionExpression = (() => {
    if (storeStatus === "error") return "concerned";
    if (isSpeaking) return "curious";
    if (isConnected) return "warm";
    return "neutral";
  })();

  // Status text
  const statusText = (() => {
    if (isEnding) return "Saving session...";
    if (storeStatus === "connecting") return "Connecting...";
    if (storeStatus === "error") return error ?? "Connection error";
    if (isSpeaking) return `${companionName} is speaking...`;
    if (isConnected) return "Listening...";
    return "";
  })();

  // Start session on mount
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        console.log("[VoiceChat] Starting session...");
        const { token, systemPrompt } = await startSession();
        console.log("[VoiceChat] Got token:", token?.substring(0, 20) + "...");
        if (!cancelled) {
          await connect(token, systemPrompt);
        }
      } catch (err: any) {
        console.error("[VoiceChat] Session start error:", err?.message ?? err);
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Timer
  useEffect(() => {
    if (isConnected && !timerRef.current) {
      timerRef.current = setInterval(() => {
        setElapsed(useVoiceChatStore.getState().elapsed + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isConnected, setElapsed]);

  // Update store speaking status
  useEffect(() => {
    if (isSpeaking) setStatus("speaking");
    else if (isConnected) setStatus("listening");
  }, [isSpeaking, isConnected, setStatus]);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [transcriptMessages.length]);

  // 15-minute session limit warning
  useEffect(() => {
    if (elapsed === 600) {
      Alert.alert(
        "5 Minutes Remaining",
        "Voice sessions have a 15-minute limit. You can start a new session after this one ends.",
      );
    }
    if (elapsed >= 870) {
      handleEndSession();
    }
  }, [elapsed]);

  const handleToggleMute = useCallback(async () => {
    await hapticLight();
    const newMuted = !storeMuted;
    setStoreMuted(newMuted);
    setVoiceMuted(newMuted);
  }, [storeMuted, setStoreMuted, setVoiceMuted]);

  const handleEndSession = useCallback(async () => {
    console.log("[VoiceChat] handleEndSession called, isEnding:", isEnding);
    if (isEnding) return;
    setIsEnding(true);

    try { hapticMedium(); } catch {}

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Snapshot transcript data from store BEFORE any cleanup
    const { sessionId: sid, transcriptMessages: msgs, _accessToken: token } =
      useVoiceChatStore.getState();

    // Navigate away immediately
    console.log("[VoiceChat] Navigating away");
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/");
      }
    } catch {
      router.replace("/");
    }

    // Save transcript in background using snapshotted data (not dependent on store/component)
    (async () => {
      try {
        if (sid && msgs.length > 0) {
          const transcript = msgs.map((m) => ({ role: m.role, content: m.content }));
          let authToken = token;
          if (!authToken) {
            const { data } = await supabase.auth.refreshSession();
            authToken = data.session?.access_token ?? null;
          }
          if (authToken) {
            const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/voice-session-end`;
            let res = await fetch(url, {
              method: "POST",
              headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
              body: JSON.stringify({ session_id: sid, transcript }),
            });
            if (res.status === 401) {
              const { data } = await supabase.auth.refreshSession();
              const fresh = data.session?.access_token;
              if (fresh) {
                res = await fetch(url, {
                  method: "POST",
                  headers: { Authorization: `Bearer ${fresh}`, "Content-Type": "application/json" },
                  body: JSON.stringify({ session_id: sid, transcript }),
                });
              }
            }
            console.log("[VoiceChat] Background save:", res.ok ? "success" : res.status);
          }
        }
      } catch (e) {
        console.error("[VoiceChat] Background save error:", e);
      }
    })();

    // Disconnect audio/WS and update streak in background
    disconnect().catch(() => {});
    useStreakStore.getState().updateStreak();
    useVoiceChatStore.getState().reset();
  }, [isEnding, disconnect, router]);

  const confirmEndSession = useCallback(() => {
    hapticLight();
    Alert.alert(
      "End Voice Session?",
      "Your conversation will be saved and processed.",
      [
        { text: "Continue", style: "cancel" },
        { text: "End Session", style: "destructive", onPress: handleEndSession },
      ],
    );
  }, [handleEndSession]);

  // Pulse animation for the listening indicator
  const pulseScale = useSharedValue(1);
  useEffect(() => {
    if (isConnected && !isSpeaking && !storeMuted) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.0, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
    }
  }, [isConnected, isSpeaking, storeMuted]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const renderTranscriptItem = useCallback(
    ({ item }: { item: VoiceTranscriptMessage }) => {
      const isUser = item.role === "user";
      return (
        <Animated.View
          entering={FadeInDown.duration(200)}
          style={{
            alignSelf: isUser ? "flex-end" : "flex-start",
            maxWidth: "85%",
            marginBottom: 12,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 16,
            backgroundColor: isUser ? "#8B5CF620" : "#16161D",
            borderWidth: 1,
            borderColor: isUser ? "#8B5CF640" : "#27272A",
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: isUser ? "#A78BFA" : "#71717A",
              marginBottom: 4,
            }}
          >
            {isUser ? "You" : companionName}
          </Text>
          <Text style={{ fontSize: 14, color: "#E4E4E7", lineHeight: 20 }}>
            {item.content}
          </Text>
        </Animated.View>
      );
    },
    [companionName],
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#0D0D12" }}
      edges={["top", "bottom"]}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 12,
        }}
      >
        <Pressable
          onPress={confirmEndSession}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "#16161D",
            alignItems: "center",
            justifyContent: "center",
          }}
          accessibilityLabel="End voice session"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={20} color="#A1A1AA" />
        </Pressable>

        <View style={{ alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons
              name="mic"
              size={14}
              color="#8B5CF6"
              style={{ marginRight: 4 }}
            />
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#F4F4F5" }}>
              Voice Session
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: "#71717A", marginTop: 1 }}>
            Session {sessionNumber}
          </Text>
        </View>

        <View style={{ width: 36 }} />
      </View>

      {/* Timer */}
      {isConnected && (
        <Animated.View entering={FadeIn.duration(300)} style={{ alignItems: "center", marginBottom: 8 }}>
          <Text style={{ fontSize: 13, color: "#52525B", fontFamily: "monospace" }}>
            {formatTime(elapsed)}
          </Text>
        </Animated.View>
      )}

      {/* Companion Avatar + Status */}
      <View style={{ alignItems: "center", paddingVertical: 32 }}>
        <Animated.View style={pulseStyle}>
          <CompanionAvatar
            expression={expression}
            size="large"
            name={companionName}
          />
        </Animated.View>

        <View style={{ marginTop: 20, minHeight: 24 }}>
          {storeStatus === "connecting" ? (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ActivityIndicator size="small" color="#8B5CF6" />
              <Text style={{ fontSize: 14, color: "#71717A", marginLeft: 8 }}>
                {statusText}
              </Text>
            </View>
          ) : (
            <Animated.Text
              entering={FadeIn.duration(300)}
              style={{
                fontSize: 14,
                color: storeStatus === "error" ? "#EF4444" : "#71717A",
                textAlign: "center",
              }}
            >
              {statusText}
            </Animated.Text>
          )}
        </View>

        {storeMuted && isConnected && (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={{
              marginTop: 8,
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 12,
              backgroundColor: "#78350F40",
            }}
          >
            <Text style={{ fontSize: 12, color: "#FDE68A" }}>
              Microphone muted
            </Text>
          </Animated.View>
        )}
      </View>

      {/* Transcript */}
      <View style={{ flex: 1, marginHorizontal: 16 }}>
        <FlatList
          ref={flatListRef}
          data={transcriptMessages}
          renderItem={renderTranscriptItem}
          keyExtractor={(_, index) => index.toString()}
          contentContainerStyle={{ paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            isConnected ? (
              <View style={{ alignItems: "center", paddingTop: 24 }}>
                <Text style={{ fontSize: 13, color: "#52525B", textAlign: "center" }}>
                  Start speaking — {companionName} is listening
                </Text>
              </View>
            ) : null
          }
        />
      </View>

      {/* Bottom Controls */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          paddingVertical: 20,
          paddingHorizontal: 40,
          gap: 40,
        }}
      >
        {/* Mute Button */}
        <Pressable
          onPress={handleToggleMute}
          disabled={!isConnected}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: storeMuted ? "#78350F" : "#16161D",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: storeMuted ? "#92400E" : "#27272A",
            opacity: isConnected ? 1 : 0.4,
          }}
          accessibilityLabel={storeMuted ? "Unmute microphone" : "Mute microphone"}
          accessibilityRole="button"
        >
          <Ionicons
            name={storeMuted ? "mic-off" : "mic"}
            size={24}
            color={storeMuted ? "#FDE68A" : "#F4F4F5"}
          />
        </Pressable>

        {/* End Session Button */}
        <Pressable
          onPress={confirmEndSession}
          disabled={isEnding}
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: "#DC2626",
            alignItems: "center",
            justifyContent: "center",
          }}
          accessibilityLabel="End voice session"
          accessibilityRole="button"
        >
          {isEnding ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="call" size={28} color="white" style={{ transform: [{ rotate: "135deg" }] }} />
          )}
        </Pressable>

        {/* SOS Button */}
        <Pressable
          onPress={() => {
            hapticLight();
            router.push("/sos");
          }}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: "#16161D",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "#27272A",
          }}
          accessibilityLabel="Emergency support"
          accessibilityRole="button"
        >
          <Ionicons name="shield-outline" size={22} color="#F472B6" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
