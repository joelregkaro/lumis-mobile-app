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
import { useNavigation } from "@react-navigation/native";
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
import HeroDroplet from "@/components/companion/HeroDroplet";
import type { MirrorState } from "@/components/companion/HeroDroplet";
import CosmicBackground from "@/components/ui/CosmicBackground";
import { useVoiceChatStore } from "@/store/voiceChat";
import { useGeminiVoice } from "@/hooks/useGeminiVoice";
import type { ToolCallResult } from "@/hooks/useGeminiVoice";
import { hapticLight, hapticMedium } from "@/lib/haptics";
import { screen } from "@/lib/analytics";
import { useStreakStore } from "@/store/streak";
import { supabase } from "@/lib/supabase";
import {
  startVoiceSessionActivity,
  updateVoiceSessionActivity,
  endVoiceSessionActivity,
} from "@/lib/liveActivity";
import type { VoiceTranscriptMessage } from "@/store/voiceChat";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function VoiceChatScreen() {
  const navigation = useNavigation();
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

  const handleToolCall = useCallback(async (call: ToolCallResult): Promise<Record<string, any>> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };
    const userId = user.id;

    switch (call.name) {
      case "complete_habit": {
        const { habit_title, outcome = "done" } = call.args;
        const { data: habits } = await supabase
          .from("habits").select("id, title, current_streak")
          .eq("user_id", userId).eq("status", "active")
          .ilike("title", `%${habit_title}%`).limit(1);
        if (!habits?.length) return { success: false, error: `No active habit matching "${habit_title}"` };
        const habit = habits[0];
        const today = new Date().toISOString().split("T")[0];
        const { data: existing } = await supabase
          .from("habit_completions").select("id")
          .eq("habit_id", habit.id).eq("completed_date", today).limit(1);
        if (existing?.length) return { success: true, message: `"${habit.title}" already recorded for today`, streak: habit.current_streak };
        await supabase.from("habit_completions").insert({
          habit_id: habit.id, user_id: userId, completed_date: today,
          quality: outcome === "done" ? 5 : 3, reflection_type: "completion",
        });
        const newStreak = (habit.current_streak ?? 0) + 1;
        await supabase.from("habits").update({
          current_streak: newStreak,
          total_completions: habit.current_streak + 1,
          consecutive_misses: 0,
        }).eq("id", habit.id);
        return { success: true, habit_title: habit.title, new_streak: newStreak, message: `Marked "${habit.title}" as ${outcome}! ${newStreak}-day streak!` };
      }
      case "create_goal": {
        const { title, description, category, target_date } = call.args;
        const { data: goal, error: err } = await supabase.from("goals").insert({
          user_id: userId, title, description: description ?? null,
          category: category ?? "personal_growth",
          target_date: target_date ?? null, status: "active",
        }).select("id, title").single();
        if (err) return { success: false, error: err.message };
        return { success: true, goal_id: goal.id, message: `Goal "${title}" created!` };
      }
      case "create_habit": {
        const { title, description, frequency, preferred_time, anchor_behavior, tiny_version, identity_statement, celebration } = call.args;
        const { data: existing } = await supabase
          .from("habits").select("id").eq("user_id", userId)
          .ilike("title", `%${title}%`).in("status", ["active", "paused"]).limit(1);
        if (existing?.length) return { success: false, error: `Habit similar to "${title}" already exists` };
        const { data: habit, error: err } = await supabase.from("habits").insert({
          user_id: userId, title, description: description ?? null,
          frequency, preferred_time: preferred_time ?? null,
          anchor_behavior: anchor_behavior ?? null, tiny_version: tiny_version ?? null,
          identity_statement: identity_statement ?? null, celebration: celebration ?? null,
          status: "active", difficulty: "tiny",
        }).select("id, title").single();
        if (err) return { success: false, error: err.message };
        return { success: true, habit_id: habit.id, message: `Habit "${title}" created! I'll track your streak.` };
      }
      case "set_reminder": {
        const { title, body, scheduled_for } = call.args;
        const sid = useVoiceChatStore.getState().sessionId;
        await supabase.from("reminders").insert({
          user_id: userId, session_id: sid, title, body: body ?? null,
          scheduled_for, status: "pending",
        });
        const when = new Date(scheduled_for);
        const timeStr = when.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
        return { success: true, message: `Reminder set for ${timeStr}: "${title}"` };
      }
      case "log_mood": {
        const { mood_score, notes } = call.args;
        await supabase.from("mood_entries").insert({
          user_id: userId, mood_score, notes: notes ?? null,
        });
        return { success: true, message: `Mood logged: ${mood_score}/10${notes ? ` — "${notes}"` : ""}` };
      }
      case "capture_insight": {
        const { insight, category } = call.args;
        const sid = useVoiceChatStore.getState().sessionId;
        await supabase.from("session_echoes").insert({
          user_id: userId, session_id: sid,
          action_item: insight, context: `Breakthrough insight (${category ?? "general"})`,
          status: "noted", echo_type: "insight",
        });
        return { success: true, message: "Insight captured — I'll reference this in future sessions." };
      }
      case "run_scaling_question": {
        const { topic, score, follow_up } = call.args;
        const sid = useVoiceChatStore.getState().sessionId;
        await supabase.from("session_echoes").insert({
          user_id: userId, session_id: sid,
          action_item: `Scaling: "${topic}" → ${score}/10${follow_up ? `. To move up: ${follow_up}` : ""}`,
          context: "Scaling exercise during voice session",
          status: "noted", echo_type: "scaling",
        });
        return { success: true, score, topic, message: `Recorded: ${topic} at ${score}/10` };
      }
      case "get_context": {
        const { context_type, query } = call.args;
        switch (context_type) {
          case "habit_details": {
            const { data } = await supabase.from("habits")
              .select("title, description, frequency, current_streak, longest_streak, total_completions, anchor_behavior, tiny_version, difficulty, identity_statement, celebration, consecutive_misses, created_at")
              .eq("user_id", userId).ilike("title", `%${query}%`).limit(1).single();
            return data ? { success: true, habit: data } : { success: false, error: "Habit not found" };
          }
          case "goal_progress": {
            const { data } = await supabase.from("goals")
              .select("title, description, status, target_date, progress_notes, milestones, category")
              .eq("user_id", userId).ilike("title", `%${query}%`).limit(1).single();
            return data ? { success: true, goal: data } : { success: false, error: "Goal not found" };
          }
          case "relationship": {
            const { data } = await supabase.from("relationships")
              .select("name, relation_type, sentiment_trend, emotional_impact, topics, mentioned_count")
              .eq("user_id", userId).ilike("name", `%${query}%`).limit(1).single();
            return data ? { success: true, relationship: data } : { success: false, error: "Person not found" };
          }
          case "past_sessions": {
            const { data } = await supabase.from("sessions")
              .select("session_number, summary, key_themes, started_at")
              .eq("user_id", userId).not("summary", "is", null)
              .order("started_at", { ascending: false }).limit(5);
            const relevant = (data ?? []).filter(s =>
              s.summary?.toLowerCase().includes(query.toLowerCase()) ||
              s.key_themes?.some((t: string) => t.toLowerCase().includes(query.toLowerCase()))
            );
            return { success: true, sessions: relevant.length > 0 ? relevant : data?.slice(0, 3) ?? [] };
          }
          default:
            return { success: false, error: "Unknown context type" };
        }
      }
      default:
        return { success: false, error: `Unknown function: ${call.name}` };
    }
  }, []);

  const {
    connect,
    disconnect,
    killAudio,
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
      else if (newStatus === "error") {
        setStatus("error");
        endVoiceSessionActivity();
      }
    },
    onError: (errMsg) => {
      setStatus("error");
      endVoiceSessionActivity();
      Alert.alert("Voice Session Error", errMsg);
    },
    onToolCall: handleToolCall,
  });

  const mirrorState: MirrorState = (() => {
    if (storeStatus === "error") return "idle";
    if (isSpeaking) return "thinking";
    if (isConnected) return "listening";
    return "idle";
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

  useEffect(() => { screen("voice_chat"); }, []);

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
      endVoiceSessionActivity();
    };
  }, []);

  // Timer + Live Activity
  useEffect(() => {
    if (isConnected && !timerRef.current) {
      startVoiceSessionActivity({
        companionName,
        sessionNumber,
        elapsedSeconds: 0,
        status: "listening",
      });

      timerRef.current = setInterval(() => {
        const state = useVoiceChatStore.getState();
        const next = state.elapsed + 1;
        setElapsed(next);
        updateVoiceSessionActivity({
          companionName: state.companionName,
          sessionNumber: state.sessionNumber,
          elapsedSeconds: next,
          status: state.status === "speaking" ? "speaking" : "listening",
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isConnected, setElapsed, companionName, sessionNumber]);

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

  // Gentle session length nudge (no hard cap — compression handles unlimited length)
  useEffect(() => {
    if (elapsed === 1800) {
      Alert.alert(
        "30-Minute Check-in",
        "You've been going for 30 minutes — that's a great deep session! Take your time.",
      );
    }
  }, [elapsed]);

  const handleToggleMute = useCallback(async () => {
    await hapticLight();
    const newMuted = !storeMuted;
    setStoreMuted(newMuted);
    setVoiceMuted(newMuted);
  }, [storeMuted, setStoreMuted, setVoiceMuted]);

  const handleEndSession = useCallback(async () => {
    if (isEnding) return;
    setIsEnding(true);

    try { hapticMedium(); } catch {}

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    endVoiceSessionActivity();

    // Snapshot transcript data from store BEFORE any cleanup
    const { sessionId: sid, transcriptMessages: msgs } =
      useVoiceChatStore.getState();

    // Build transcript payload, merging consecutive same-role messages
    // (Gemini Live can fire multiple turnComplete events per logical turn,
    //  causing the transcription to split one response into multiple entries)
    let transcript: { role: string; content: string }[] | null = null;
    if (sid && msgs.length > 0) {
      const merged: { role: string; content: string }[] = [];
      for (const m of msgs) {
        const last = merged[merged.length - 1];
        if (last && last.role === m.role) {
          last.content += " " + m.content;
        } else {
          merged.push({ role: m.role, content: m.content });
        }
      }
      transcript = merged;
    }

    // Navigate away immediately for responsive UX
    killAudio();
    try {
      navigation.reset({
        index: 0,
        routes: [{ name: "Tabs" as never, params: { screen: "home" } }],
      });
    } catch {
      try {
        navigation.reset({
          index: 0,
          routes: [{ name: "Tabs" as never, params: { screen: "home" } }],
        });
      } catch {}
    }

    // Save transcript via direct PostgREST writes, then disconnect audio
    // IMPORTANT: disconnect() must happen AFTER save — iOS XHR breaks during WS teardown
    if (transcript && sid) {
      setTimeout(async () => {
        try {
          const messagesToInsert = transcript.map((msg) => ({
            session_id: sid,
            role: msg.role,
            content: msg.content,
          }));

          const { error: insertErr } = await supabase
            .from("messages")
            .insert(messagesToInsert);

          if (insertErr) {
            console.error("[VoiceChat] Message insert failed:", insertErr.message);
          } else {
            console.log("[VoiceChat] Messages saved:", messagesToInsert.length);
          }

          const rawLog = transcript
            .map((m) => `${m.role === "user" ? "User" : "Lumis"}: ${m.content}`)
            .join("\n\n");

          const { error: updateErr } = await supabase
            .from("sessions")
            .update({ ended_at: new Date().toISOString(), raw_log: rawLog })
            .eq("id", sid);

          if (updateErr) {
            console.error("[VoiceChat] Session update failed:", updateErr.message);
          } else {
            console.log("[VoiceChat] Session ended successfully");
          }

          // Trigger post-session processing (fire-and-forget)
          supabase.functions
            .invoke("process-session", { body: { session_id: sid } })
            .catch(() => {});
        } catch (e) {
          console.error("[VoiceChat] Background save error:", e);
        }

        // Disconnect audio/WS ONLY after save completes
        disconnect().catch(() => {});
        useStreakStore.getState().updateStreak();
        useVoiceChatStore.getState().reset();
      }, 100);
    } else {
      disconnect().catch(() => {});
      useStreakStore.getState().updateStreak();
      useVoiceChatStore.getState().reset();
    }
  }, [isEnding, disconnect, killAudio, navigation]);

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
            backgroundColor: isUser ? "rgba(139, 92, 246, 0.12)" : "rgba(18, 16, 40, 0.7)",
            borderWidth: 0.5,
            borderColor: isUser ? "rgba(139, 92, 246, 0.25)" : "rgba(139, 92, 246, 0.1)",
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: isUser ? "#A78BFA" : "#9B97C0",
              marginBottom: 4,
            }}
          >
            {isUser ? "You" : companionName}
          </Text>
          <Text style={{ fontSize: 14, color: "#F0EEFF", lineHeight: 20 }}>
            {item.content}
          </Text>
        </Animated.View>
      );
    },
    [companionName],
  );

  return (
    <View style={{ flex: 1 }}>
      <CosmicBackground intensity="full" />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
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
              backgroundColor: "rgba(18, 16, 40, 0.75)",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 0.5,
              borderColor: "rgba(139, 92, 246, 0.1)",
            }}
            accessibilityLabel="End voice session"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={20} color="#9B97C0" />
          </Pressable>

          <View style={{ alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="mic" size={14} color="#8B5CF6" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#F0EEFF" }}>
                Voice Session
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: "#9B97C0", marginTop: 1 }}>
              Session {sessionNumber}
            </Text>
          </View>

          <View style={{ width: 36 }} />
        </View>

        {/* Timer */}
        {isConnected && (
          <Animated.View entering={FadeIn.duration(300)} style={{ alignItems: "center", marginBottom: 8 }}>
            <Text style={{ fontSize: 13, color: "#5A5680", fontFamily: "monospace" }}>
              {formatTime(elapsed)}
            </Text>
          </Animated.View>
        )}

        {/* Mirror Presence + Status */}
        <View style={{ alignItems: "center", paddingVertical: 32 }}>
          <Animated.View style={pulseStyle}>
            <HeroDroplet state={mirrorState} size="large" />
          </Animated.View>

          <View style={{ marginTop: 20, minHeight: 24 }}>
            {storeStatus === "connecting" ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <ActivityIndicator size="small" color="#8B5CF6" />
                <Text style={{ fontSize: 14, color: "#9B97C0", marginLeft: 8 }}>
                  {statusText}
                </Text>
              </View>
            ) : (
              <Animated.Text
                entering={FadeIn.duration(300)}
                style={{
                  fontSize: 14,
                  color: storeStatus === "error" ? "#EF4444" : "#9B97C0",
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
                  <Text style={{ fontSize: 13, color: "#5A5680", textAlign: "center" }}>
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
          <Pressable
            onPress={handleToggleMute}
            disabled={!isConnected}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: storeMuted ? "#78350F" : "rgba(18, 16, 40, 0.75)",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 0.5,
              borderColor: storeMuted ? "#92400E" : "rgba(139, 92, 246, 0.1)",
              opacity: isConnected ? 1 : 0.4,
            }}
            accessibilityLabel={storeMuted ? "Unmute microphone" : "Mute microphone"}
            accessibilityRole="button"
          >
            <Ionicons
              name={storeMuted ? "mic-off" : "mic"}
              size={24}
              color={storeMuted ? "#FDE68A" : "#F0EEFF"}
            />
          </Pressable>

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

          <Pressable
            onPress={() => {
              hapticLight();
              navigation.navigate("sos" as never);
            }}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: "rgba(18, 16, 40, 0.75)",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 0.5,
              borderColor: "rgba(139, 92, 246, 0.1)",
            }}
            accessibilityLabel="Emergency support"
            accessibilityRole="button"
          >
            <Ionicons name="shield-outline" size={22} color="#F472B6" />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
