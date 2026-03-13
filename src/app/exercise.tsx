import { useEffect, useCallback, useState } from "react";
import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useToolkitStore, EXERCISE_CATALOG, type ExerciseType } from "@/store/toolkit";
import QuickMoodRow from "@/components/checkin/QuickMoodRow";
import BreathingExercise from "@/components/toolkit/exercises/BreathingExercise";
import GroundingExercise from "@/components/toolkit/exercises/GroundingExercise";
import ThoughtRecord from "@/components/toolkit/exercises/ThoughtRecord";
import ReframeExercise from "@/components/toolkit/exercises/ReframeExercise";
import SelfCompassion from "@/components/toolkit/exercises/SelfCompassion";
import GratitudeExercise from "@/components/toolkit/exercises/GratitudeExercise";
import { hapticSuccess, hapticLight } from "@/lib/haptics";
import { screen, track } from "@/lib/analytics";
import { colors } from "@/constants/theme";

const c = colors.dark;

type Phase = "mood_before" | "exercise" | "mood_after" | "complete";

function getCompletionContent(
  type: ExerciseType,
  moodDelta: number | null,
  context: Record<string, unknown>,
): { emoji: string; title: string; subtitle: string; insight: string | null } {
  const base = moodDelta != null && moodDelta > 0
    ? { emoji: "✨", title: "You shifted your mood", subtitle: `+${moodDelta} points. Small shifts add up over time.` }
    : moodDelta != null && moodDelta < 0
      ? { emoji: "💜", title: "You showed up", subtitle: "It's okay if you don't feel better right away. Showing up is what matters." }
      : { emoji: "🎯", title: "Exercise complete", subtitle: "You invested in yourself. That matters." };

  let insight: string | null = null;

  switch (type) {
    case "thought_record": {
      const original = context.automatic_thought as string | undefined;
      const balanced = context.balanced_thought as string | undefined;
      if (original && balanced) {
        insight = `You reframed "${original.slice(0, 60)}${original.length > 60 ? "..." : ""}" into something more balanced. That's the skill of cognitive flexibility.`;
      }
      break;
    }
    case "reframe": {
      const neg = context.negative_thought as string | undefined;
      const reframed = context.reframed_thought as string | undefined;
      if (neg && reframed) {
        insight = `You found a new way to see: "${reframed.slice(0, 80)}${reframed.length > 80 ? "..." : ""}"`;
      }
      break;
    }
    case "gratitude": {
      const items = context.gratitude_items as { thing: string }[] | undefined;
      if (items && items.length > 0) {
        insight = `You noticed ${items.length} thing${items.length > 1 ? "s" : ""} to be grateful for. Gratitude rewires your brain to notice more good.`;
      }
      break;
    }
    case "self_compassion": {
      const kindness = context.self_kindness as string | undefined;
      if (kindness) {
        insight = `Remember what you told yourself: "${kindness.slice(0, 80)}${kindness.length > 80 ? "..." : ""}"`;
      }
      break;
    }
    case "breathing":
      insight = "Your nervous system just got a reset. The calming effect builds with regular practice.";
      break;
    case "grounding":
      insight = "You anchored yourself to the present moment. This skill gets faster with practice.";
      break;
  }

  return { ...base, insight };
}

export default function ExerciseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    type?: string;
    title?: string;
    steps?: string;
  }>();

  const {
    currentType,
    currentContext,
    moodBefore,
    moodAfter,
    isSubmitting,
    isComplete,
    startExercise,
    setMoodBefore,
    setMoodAfter,
    complete,
    reset,
    fetchSuggested,
    fetchHistory,
  } = useToolkitStore();

  const [phase, setPhase] = useState<Phase>("mood_before");

  const exerciseType = (params.type as ExerciseType) || currentType || "breathing";
  const def = EXERCISE_CATALOG.find((e) => e.type === exerciseType);

  useEffect(() => {
    screen("exercise");
    let steps: string[] = [];
    if (params.steps) {
      try { steps = JSON.parse(params.steps); } catch { /* ignore */ }
    }
    startExercise(exerciseType, steps);
    track("exercise_started", { type: exerciseType });
    return () => { reset(); };
  }, []);

  const handleMoodBeforeSelected = useCallback((score: number) => {
    setMoodBefore(score);
  }, [setMoodBefore]);

  const handleStartExercise = useCallback(async () => {
    await hapticLight();
    setPhase("exercise");
  }, []);

  const handleExerciseComplete = useCallback(async (extraContext?: Record<string, unknown>) => {
    await hapticSuccess();
    setPhase("mood_after");
    if (extraContext) {
      useToolkitStore.setState((s) => ({
        currentContext: { ...s.currentContext, ...extraContext },
      }));
    }
  }, []);

  const handleMoodAfterSelected = useCallback((score: number) => {
    setMoodAfter(score);
  }, [setMoodAfter]);

  const handleFinish = useCallback(async () => {
    await complete();
    setPhase("complete");
    fetchSuggested();
    fetchHistory();
  }, [complete, fetchSuggested, fetchHistory]);

  const handleSkipMoodAfter = useCallback(async () => {
    await complete();
    setPhase("complete");
    fetchSuggested();
    fetchHistory();
  }, [complete, fetchSuggested, fetchHistory]);

  const handleDismiss = useCallback(() => {
    router.back();
  }, [router]);

  const handleTalkToCompanion = useCallback(() => {
    const ctx = useToolkitStore.getState().currentContext;
    let topic = `I just did a ${exerciseType.replace(/_/g, " ")} exercise`;

    if (exerciseType === "thought_record" && ctx.balanced_thought) {
      topic += ` and reframed my thinking to: "${(ctx.balanced_thought as string).slice(0, 100)}"`;
    } else if (exerciseType === "reframe" && ctx.reframed_thought) {
      topic += ` and found a new perspective: "${(ctx.reframed_thought as string).slice(0, 100)}"`;
    } else if (exerciseType === "self_compassion" && ctx.self_kindness) {
      topic += ` and want to talk about what came up`;
    } else {
      topic += " and want to talk about how I'm feeling";
    }

    router.back();
    setTimeout(() => {
      router.push({
        pathname: "/(tabs)/chat",
        params: { topic: encodeURIComponent(topic) },
      });
    }, 100);
  }, [router, exerciseType]);

  const handleDoAnother = useCallback(async () => {
    await hapticLight();
    router.back();
    setTimeout(() => {
      router.push("/toolkit" as any);
    }, 100);
  }, [router]);

  if (phase === "complete") {
    const moodDelta = moodBefore != null && moodAfter != null ? moodAfter - moodBefore : null;
    const completion = getCompletionContent(exerciseType, moodDelta, currentContext);

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg.primary }} edges={["top"]}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          <Pressable onPress={handleDismiss} style={{ alignSelf: "flex-end", padding: 8, marginTop: 8 }} hitSlop={12}>
            <Ionicons name="close" size={24} color={c.text.tertiary} />
          </Pressable>

          <View style={{ alignItems: "center", gap: 20, paddingTop: 24 }}>
            <Animated.View entering={FadeIn.duration(600)}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: `${def?.color ?? c.brand.purple}15`, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 36 }}>{completion.emoji}</Text>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200).duration(400)} style={{ alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 22, fontWeight: "700", color: c.text.primary, textAlign: "center" }}>
                {completion.title}
              </Text>
              <Text style={{ fontSize: 15, color: c.text.secondary, textAlign: "center", maxWidth: 300, lineHeight: 22 }}>
                {completion.subtitle}
              </Text>
            </Animated.View>

            {/* Mood delta badge */}
            {moodDelta != null && moodDelta !== 0 && (
              <Animated.View entering={FadeInDown.delay(300).duration(400)}>
                <View style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: moodDelta > 0 ? `${c.status.success}15` : `${c.brand.purpleLight}15`,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                }}>
                  <Ionicons
                    name={moodDelta > 0 ? "trending-up" : "trending-down"}
                    size={16}
                    color={moodDelta > 0 ? c.status.success : c.brand.purpleLight}
                  />
                  <Text style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: moodDelta > 0 ? c.status.success : c.brand.purpleLight,
                  }}>
                    {moodDelta > 0 ? `+${moodDelta}` : String(moodDelta)} mood
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* Exercise-specific insight */}
            {completion.insight && (
              <Animated.View entering={FadeInDown.delay(400).duration(400)} style={{ width: "100%" }}>
                <View style={{
                  backgroundColor: c.bg.surface,
                  borderRadius: 14,
                  padding: 16,
                  borderLeftWidth: 3,
                  borderLeftColor: def?.color ?? c.brand.teal,
                }}>
                  <Text style={{ fontSize: 14, color: c.text.secondary, lineHeight: 20 }}>
                    {completion.insight}
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* CTAs */}
            <Animated.View entering={FadeInDown.delay(500).duration(400)} style={{ width: "100%", gap: 12, marginTop: 8 }}>
              <Pressable
                onPress={handleTalkToCompanion}
                style={{
                  backgroundColor: c.brand.purple,
                  borderRadius: 14,
                  paddingVertical: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Ionicons name="chatbubble-outline" size={18} color="#FFF" />
                <Text style={{ fontSize: 17, fontWeight: "700", color: "#FFF" }}>Talk about it</Text>
              </Pressable>
              <Pressable
                onPress={handleDoAnother}
                style={{
                  backgroundColor: c.bg.surface,
                  borderRadius: 14,
                  paddingVertical: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Ionicons name="fitness-outline" size={18} color={c.text.secondary} />
                <Text style={{ fontSize: 15, fontWeight: "600", color: c.text.secondary }}>Do another exercise</Text>
              </Pressable>
              <Pressable onPress={handleDismiss} style={{ paddingVertical: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 15, fontWeight: "500", color: c.text.tertiary }}>I'm good</Text>
              </Pressable>
            </Animated.View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg.primary }} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 }}>
          <Animated.View entering={FadeIn.duration(300)}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: c.text.primary }}>
              {def?.title ?? exerciseType.replace(/_/g, " ")}
            </Text>
            {def && (
              <Text style={{ fontSize: 13, color: c.text.secondary, marginTop: 2 }}>
                ~{def.durationMinutes} min
              </Text>
            )}
          </Animated.View>
          <Pressable onPress={handleDismiss} hitSlop={12}>
            <Ionicons name="close" size={24} color={c.text.tertiary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {phase === "mood_before" && (
            <View style={{ gap: 24 }}>
              <Animated.View entering={FadeInDown.duration(400)}>
                <Text style={{ fontSize: 15, color: c.text.secondary, lineHeight: 22 }}>
                  Before we start, how are you feeling right now?
                </Text>
              </Animated.View>
              <QuickMoodRow selected={moodBefore} onSelect={handleMoodBeforeSelected} label="Current mood" />
              <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                <Pressable
                  onPress={handleStartExercise}
                  disabled={moodBefore == null}
                  style={{
                    backgroundColor: moodBefore != null ? (def?.color ?? c.brand.purple) : c.bg.elevated,
                    borderRadius: 14,
                    paddingVertical: 16,
                    alignItems: "center",
                    opacity: moodBefore != null ? 1 : 0.5,
                  }}
                >
                  <Text style={{ fontSize: 17, fontWeight: "700", color: moodBefore != null ? "#FFF" : c.text.tertiary }}>
                    Start exercise
                  </Text>
                </Pressable>
              </Animated.View>
              <Pressable onPress={() => setPhase("exercise")} style={{ alignItems: "center", paddingVertical: 8 }}>
                <Text style={{ fontSize: 14, color: c.text.tertiary }}>Skip mood check</Text>
              </Pressable>
            </View>
          )}

          {phase === "exercise" && (
            <>
              {exerciseType === "breathing" && <BreathingExercise onComplete={() => handleExerciseComplete()} />}
              {exerciseType === "grounding" && <GroundingExercise onComplete={() => handleExerciseComplete()} />}
              {exerciseType === "thought_record" && <ThoughtRecord onComplete={(data) => handleExerciseComplete(data)} />}
              {exerciseType === "reframe" && <ReframeExercise onComplete={(data) => handleExerciseComplete(data)} />}
              {exerciseType === "self_compassion" && <SelfCompassion onComplete={(data) => handleExerciseComplete(data)} />}
              {exerciseType === "gratitude" && <GratitudeExercise onComplete={(data) => handleExerciseComplete(data)} />}
            </>
          )}

          {phase === "mood_after" && (
            <View style={{ gap: 24 }}>
              <Animated.View entering={FadeInDown.duration(400)}>
                <Text style={{ fontSize: 15, color: c.text.secondary, lineHeight: 22 }}>
                  How are you feeling now?
                </Text>
              </Animated.View>
              <QuickMoodRow selected={moodAfter} onSelect={handleMoodAfterSelected} label="Current mood" />
              <Animated.View entering={FadeInDown.delay(200).duration(400)} style={{ gap: 12 }}>
                <Pressable
                  onPress={handleFinish}
                  disabled={moodAfter == null || isSubmitting}
                  style={{
                    backgroundColor: moodAfter != null ? c.brand.purple : c.bg.elevated,
                    borderRadius: 14,
                    paddingVertical: 16,
                    alignItems: "center",
                    opacity: isSubmitting ? 0.6 : 1,
                  }}
                >
                  <Text style={{ fontSize: 17, fontWeight: "700", color: moodAfter != null ? "#FFF" : c.text.tertiary }}>
                    {isSubmitting ? "Saving..." : "Done"}
                  </Text>
                </Pressable>
                <Pressable onPress={handleSkipMoodAfter} style={{ alignItems: "center", paddingVertical: 8 }}>
                  <Text style={{ fontSize: 14, color: c.text.tertiary }}>Skip</Text>
                </Pressable>
              </Animated.View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
