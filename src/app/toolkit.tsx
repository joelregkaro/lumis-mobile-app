import { useEffect, useCallback } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useToolkitStore, EXERCISE_CATALOG, type ExerciseType } from "@/store/toolkit";
import ExerciseCard from "@/components/toolkit/ExerciseCard";
import { hapticLight } from "@/lib/haptics";
import { screen, track } from "@/lib/analytics";
import { colors } from "@/constants/theme";

const c = colors.dark;

const CATEGORIES = [
  { key: "calm", label: "Calm", icon: "leaf-outline" as const, color: c.brand.teal, desc: "Settle your nervous system" },
  { key: "clarity", label: "Clarity", icon: "bulb-outline" as const, color: c.brand.gold, desc: "Challenge unhelpful thoughts" },
  { key: "growth", label: "Growth", icon: "trending-up-outline" as const, color: c.brand.purple, desc: "Build inner strength" },
] as const;

function formatRelativeDate(dateStr: string): string {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ToolkitScreen() {
  const router = useRouter();
  const {
    suggested,
    recentCompletions,
    isLoadingSuggested,
    isLoadingHistory,
    fetchSuggested,
    fetchHistory,
  } = useToolkitStore();

  useEffect(() => {
    screen("toolkit");
    fetchSuggested();
    fetchHistory();
  }, []);

  const openExercise = useCallback(
    async (type: ExerciseType) => {
      await hapticLight();
      track("toolkit_exercise_tapped", { type });
      router.push({ pathname: "/exercise", params: { type } });
    },
    [router],
  );

  const todayStr = new Date().toISOString().split("T")[0];
  const completedToday = recentCompletions.filter(
    (comp) => comp.completedDate === todayStr,
  ).length;

  const totalCompleted = recentCompletions.length;
  const avgMoodDelta = (() => {
    const deltas = recentCompletions
      .filter((c) => c.moodBefore != null && c.moodAfter != null)
      .map((c) => c.moodAfter! - c.moodBefore!);
    return deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : null;
  })();

  const isFirstTime = totalCompleted === 0 && !isLoadingHistory;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg.primary }} edges={["top"]}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 }}>
        <View>
          <Animated.View entering={FadeIn.duration(300)}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: c.text.primary }}>Toolkit</Text>
          </Animated.View>
          {completedToday > 0 && (
            <Text style={{ fontSize: 13, color: c.brand.teal, marginTop: 2 }}>
              {completedToday} done today
            </Text>
          )}
        </View>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={c.text.tertiary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* First-time welcome */}
        {isFirstTime && (
          <Animated.View entering={FadeInDown.duration(400)} style={{
            backgroundColor: c.bg.surface,
            borderRadius: 16,
            padding: 20,
            gap: 12,
            borderWidth: 1,
            borderColor: `${c.brand.teal}20`,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: `${c.brand.teal}15`, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="sparkles-outline" size={20} color={c.brand.teal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: c.text.primary }}>Your therapeutic toolkit</Text>
              </View>
            </View>
            <Text style={{ fontSize: 14, color: c.text.secondary, lineHeight: 20 }}>
              Guided exercises grounded in CBT and mindfulness. Each takes 2-5 minutes. Start with whatever resonates — there's no wrong choice.
            </Text>
            <View style={{ flexDirection: "row", gap: 16, marginTop: 4 }}>
              {[
                { icon: "leaf-outline", label: "Calm", color: c.brand.teal },
                { icon: "bulb-outline", label: "Clarity", color: c.brand.gold },
                { icon: "trending-up-outline", label: "Growth", color: c.brand.purple },
              ].map((cat) => (
                <View key={cat.label} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name={cat.icon as any} size={14} color={cat.color} />
                  <Text style={{ fontSize: 12, color: cat.color, fontWeight: "500" }}>{cat.label}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Stats row for returning users */}
        {totalCompleted > 0 && (
          <Animated.View entering={FadeInDown.duration(400)} style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: c.bg.surface, borderRadius: 12, padding: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 20, fontWeight: "700", color: c.text.primary }}>{totalCompleted}</Text>
              <Text style={{ fontSize: 11, color: c.text.tertiary, marginTop: 2 }}>completed</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: c.bg.surface, borderRadius: 12, padding: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 20, fontWeight: "700", color: c.text.primary }}>{completedToday}</Text>
              <Text style={{ fontSize: 11, color: c.text.tertiary, marginTop: 2 }}>today</Text>
            </View>
            {avgMoodDelta != null && (
              <View style={{ flex: 1, backgroundColor: c.bg.surface, borderRadius: 12, padding: 12, alignItems: "center" }}>
                <Text style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: avgMoodDelta > 0 ? c.status.success : avgMoodDelta < 0 ? c.status.crisis : c.text.primary,
                }}>
                  {avgMoodDelta > 0 ? "+" : ""}{avgMoodDelta.toFixed(1)}
                </Text>
                <Text style={{ fontSize: 11, color: c.text.tertiary, marginTop: 2 }}>avg mood shift</Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Suggested for you */}
        {isLoadingSuggested && suggested.length === 0 && (
          <View style={{ paddingVertical: 20, alignItems: "center" }}>
            <ActivityIndicator color={c.brand.teal} />
            <Text style={{ fontSize: 13, color: c.text.tertiary, marginTop: 8 }}>Finding exercises for you...</Text>
          </View>
        )}

        {suggested.length > 0 && (
          <Animated.View entering={FadeInDown.duration(400)} style={{ gap: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: c.text.tertiary, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Suggested for you
            </Text>
            {suggested.map((s, i) => {
              const def = EXERCISE_CATALOG.find((e) => e.type === s.type) ?? s;
              return (
                <Animated.View key={`${s.type}-${i}`} entering={FadeInDown.delay(i * 60).duration(300)}>
                  <ExerciseCard
                    exercise={def}
                    reason={s.reason}
                    onPress={() => openExercise(s.type)}
                  />
                </Animated.View>
              );
            })}
          </Animated.View>
        )}

        {/* Categories */}
        {CATEGORIES.map((cat, catIdx) => {
          const exercises = EXERCISE_CATALOG.filter((e) => e.category === cat.key);
          if (exercises.length === 0) return null;
          return (
            <Animated.View
              key={cat.key}
              entering={FadeInDown.delay((suggested.length > 0 ? 200 : 0) + catIdx * 80).duration(400)}
              style={{ gap: 12 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name={cat.icon} size={16} color={cat.color} />
                <Text style={{ fontSize: 13, fontWeight: "600", color: cat.color, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {cat.label}
                </Text>
                <Text style={{ fontSize: 11, color: c.text.tertiary }}>· {cat.desc}</Text>
              </View>
              {exercises.map((ex) => (
                <ExerciseCard
                  key={ex.type}
                  exercise={ex}
                  onPress={() => openExercise(ex.type)}
                />
              ))}
            </Animated.View>
          );
        })}

        {/* Recent history */}
        {recentCompletions.length > 0 && (
          <Animated.View entering={FadeInDown.delay(400).duration(400)} style={{ gap: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: c.text.tertiary, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Recent
            </Text>
            {recentCompletions.slice(0, 8).map((comp) => {
              const def = EXERCISE_CATALOG.find((e) => e.type === comp.exerciseType);
              const moodDelta =
                comp.moodBefore != null && comp.moodAfter != null
                  ? comp.moodAfter - comp.moodBefore
                  : null;
              return (
                <Pressable
                  key={comp.id}
                  onPress={() => openExercise(comp.exerciseType)}
                  style={{
                    backgroundColor: c.bg.surface,
                    borderRadius: 12,
                    padding: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: `${def?.color ?? c.text.secondary}15`,
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <Ionicons
                      name={(def?.icon ?? "fitness-outline") as any}
                      size={14}
                      color={def?.color ?? c.text.secondary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "500", color: c.text.primary }}>
                      {def?.title ?? comp.exerciseType.replace(/_/g, " ")}
                    </Text>
                    <Text style={{ fontSize: 12, color: c.text.tertiary }}>
                      {formatRelativeDate(comp.completedDate)}
                      {comp.durationSeconds ? ` · ${Math.round(comp.durationSeconds / 60)}m` : ""}
                    </Text>
                  </View>
                  {moodDelta != null && (
                    <View style={{
                      backgroundColor: moodDelta > 0 ? `${c.status.success}15` : moodDelta < 0 ? `${c.status.crisis}15` : `${c.text.tertiary}15`,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 10,
                    }}>
                      <Text style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: moodDelta > 0 ? c.status.success : moodDelta < 0 ? c.status.crisis : c.text.tertiary,
                      }}>
                        {moodDelta > 0 ? `+${moodDelta}` : moodDelta === 0 ? "—" : String(moodDelta)}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
