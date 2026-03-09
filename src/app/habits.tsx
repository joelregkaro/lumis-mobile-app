import { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useHabitStore } from "@/store/habits";
import AddHabitModal from "@/components/habits/AddHabitModal";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { screen } from "@/lib/analytics";
import type { Habit, HabitPhase, HabitDifficulty } from "@/types/database";

const PHASE_CONFIG: Record<HabitPhase, { label: string; color: string; description: string }> = {
  new: { label: "New", color: "#60A5FA", description: "Building the trigger" },
  building: { label: "Building", color: "#A78BFA", description: "Fragile — keep it tiny" },
  forming: { label: "Forming", color: "#FBBF24", description: "Grind phase — stay consistent" },
  established: { label: "Established", color: "#2DD4BF", description: "Becoming automatic" },
  lapsed: { label: "Lapsed", color: "#F87171", description: "Just data, not failure" },
};

const DIFFICULTY_STEPS: HabitDifficulty[] = ["tiny", "small", "medium", "full"];

function MiniHeatmap({ completions, days = 30 }: { completions: string[]; days?: number }) {
  const today = new Date();
  const cells: { date: string; completed: boolean }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    cells.push({ date: dateStr, completed: completions.includes(dateStr) });
  }

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 2, marginTop: 8 }}>
      {cells.map((cell) => (
        <View
          key={cell.date}
          style={{
            width: 8,
            height: 8,
            borderRadius: 2,
            backgroundColor: cell.completed ? "#2DD4BF" : "#1E1E27",
          }}
        />
      ))}
    </View>
  );
}

function DifficultyPath({ current }: { current: HabitDifficulty }) {
  const currentIdx = DIFFICULTY_STEPS.indexOf(current);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
      {DIFFICULTY_STEPS.map((step, i) => (
        <View key={step} style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: i <= currentIdx ? "#2DD4BF" : "#27272A",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: i === currentIdx ? 2 : 0,
              borderColor: "#2DD4BF",
            }}
          >
            {i < currentIdx && <Ionicons name="checkmark" size={10} color="#0C1120" />}
          </View>
          {i < DIFFICULTY_STEPS.length - 1 && (
            <View style={{ width: 12, height: 2, backgroundColor: i < currentIdx ? "#2DD4BF" : "#27272A" }} />
          )}
        </View>
      ))}
      <Text style={{ fontSize: 11, color: "#8B92A8", marginLeft: 6, textTransform: "capitalize" }}>
        {current}
      </Text>
    </View>
  );
}

function PhaseProgress({ habit, phase }: { habit: Habit; phase: HabitPhase }) {
  const daysSinceCreated = Math.floor(
    (Date.now() - new Date(habit.created_at).getTime()) / (1000 * 60 * 60 * 24),
  );
  const targetDays = 66;
  const progress = Math.min(1, daysSinceCreated / targetDays);
  const config = PHASE_CONFIG[phase];

  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: config.color }} />
          <Text style={{ fontSize: 12, color: config.color, fontWeight: "600" }}>{config.label}</Text>
          <Text style={{ fontSize: 11, color: "#5A6178" }}>— {config.description}</Text>
        </View>
        <Text style={{ fontSize: 11, color: "#5A6178" }}>
          {daysSinceCreated}/{targetDays}d
        </Text>
      </View>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: "#1E1E27" }}>
        <View
          style={{
            height: 4,
            borderRadius: 2,
            backgroundColor: config.color,
            width: `${Math.round(progress * 100)}%`,
          }}
        />
      </View>
    </View>
  );
}

export default function HabitsScreen() {
  const router = useRouter();
  const {
    habits, fetchHabits, fetchTodayCompletions, fetchHabitHistory,
    completeToday, uncompleteToday, isCompletedToday, todaysHabits,
    pauseHabit, resumeHabit, archiveHabit, getHabitPhase, suggestDifficultyUpgrade, updateHabit,
  } = useHabitStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyMap, setHistoryMap] = useState<Record<string, string[]>>({});
  const [upgradeMap, setUpgradeMap] = useState<Record<string, boolean>>({});

  useEffect(() => { screen("habits"); }, []);

  const loadData = useCallback(async () => {
    await Promise.all([fetchHabits(), fetchTodayCompletions()]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const loadHistory = async () => {
      const map: Record<string, string[]> = {};
      const upgrades: Record<string, boolean> = {};
      for (const h of habits.filter((x) => x.status === "active")) {
        const completions = await fetchHabitHistory(h.id, 30);
        map[h.id] = completions.map((c) => c.completed_date);
        upgrades[h.id] = await suggestDifficultyUpgrade(h.id);
      }
      setHistoryMap(map);
      setUpgradeMap(upgrades);
    };
    if (habits.length > 0) loadHistory();
  }, [habits]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const activeHabits = useMemo(() => habits.filter((h) => h.status === "active"), [habits]);
  const pausedHabits = useMemo(() => habits.filter((h) => h.status === "paused"), [habits]);
  const aiSuggested = useMemo(() => activeHabits.filter((h) => h.ai_suggestion), [activeHabits]);
  const manualHabits = useMemo(() => activeHabits.filter((h) => !h.ai_suggestion), [activeHabits]);

  const habitHealth = useMemo(() => {
    if (activeHabits.length === 0) return null;
    const totalDays = Object.values(historyMap).reduce((sum, dates) => sum + dates.length, 0);
    const possibleDays = activeHabits.length * 30;
    return possibleDays > 0 ? Math.round((totalDays / possibleDays) * 100) : 0;
  }, [activeHabits, historyMap]);

  const handleHabitAction = (habit: Habit) => {
    hapticLight();
    const actions: Array<{ text: string; style?: "cancel" | "destructive"; onPress?: () => void }> = [
      { text: "Cancel", style: "cancel" },
      { text: "Edit", onPress: () => setEditingHabit(habit) },
    ];
    if (habit.status === "active") {
      actions.push({ text: "Pause", onPress: async () => { await pauseHabit(habit.id); await fetchHabits(); } });
    } else {
      actions.push({ text: "Resume", onPress: async () => { await resumeHabit(habit.id); await fetchHabits(); } });
    }
    actions.push({
      text: "Archive",
      style: "destructive",
      onPress: () => {
        Alert.alert("Archive this habit?", "You can't undo this.", [
          { text: "Cancel", style: "cancel" },
          { text: "Archive", style: "destructive", onPress: async () => { await archiveHabit(habit.id); } },
        ]);
      },
    });
    Alert.alert(habit.title, undefined, actions);
  };

  const handleLevelUp = async (habit: Habit) => {
    const next: Record<HabitDifficulty, HabitDifficulty | null> = {
      tiny: "small", small: "medium", medium: "full", full: null,
    };
    const nextDiff = next[habit.difficulty];
    if (!nextDiff) return;
    await updateHabit(habit.id, { difficulty: nextDiff });
    await hapticSuccess();
    await fetchHabits();
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0C1120" }} edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      </SafeAreaView>
    );
  }

  const renderHabitCard = (habit: Habit, index: number) => {
    const phase = getHabitPhase(habit);
    const expanded = expandedId === habit.id;
    const completionDates = historyMap[habit.id] ?? [];
    const canUpgrade = upgradeMap[habit.id] ?? false;

    return (
      <Animated.View key={habit.id} entering={FadeInDown.delay(index * 50).duration(300)}>
        <Pressable
          onPress={() => setExpandedId(expanded ? null : habit.id)}
          onLongPress={() => handleHabitAction(habit)}
          delayLongPress={400}
          style={{
            backgroundColor: "#16161D",
            borderRadius: 16,
            padding: 16,
            marginBottom: 10,
            borderLeftWidth: 3,
            borderLeftColor: PHASE_CONFIG[phase].color,
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#EAEDF3" }}>
                {habit.title}
              </Text>
              {habit.tiny_version && (
                <Text style={{ fontSize: 12, color: "#5A6178", marginTop: 2 }}>
                  Tiny: {habit.tiny_version}
                </Text>
              )}
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="flame"
                  size={16}
                  color={habit.current_streak >= 7 ? "#FBBF24" : habit.current_streak > 0 ? "#F87171" : "#27272A"}
                />
                <Text style={{
                  fontSize: 18,
                  fontWeight: "800",
                  color: habit.current_streak > 0 ? "#EAEDF3" : "#52525B",
                  marginLeft: 4,
                }}>
                  {habit.current_streak}
                </Text>
              </View>
              {habit.streak_freezes_remaining > 0 && (
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                  <Ionicons name="shield-outline" size={10} color="#60A5FA" />
                  <Text style={{ fontSize: 10, color: "#60A5FA", marginLeft: 2 }}>
                    {habit.streak_freezes_remaining} freeze{habit.streak_freezes_remaining !== 1 ? "s" : ""}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Mini heatmap */}
          <MiniHeatmap completions={completionDates} />

          {/* Phase progress */}
          <PhaseProgress habit={habit} phase={phase} />

          {/* Difficulty path */}
          <DifficultyPath current={habit.difficulty} />

          {/* Level up suggestion */}
          {canUpgrade && (
            <Pressable
              onPress={() => handleLevelUp(habit)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#FBBF2415",
                borderRadius: 10,
                padding: 10,
                marginTop: 10,
                borderWidth: 1,
                borderColor: "#FBBF2430",
              }}
            >
              <Ionicons name="arrow-up-circle" size={18} color="#FBBF24" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 13, color: "#FBBF24", fontWeight: "600", flex: 1 }}>
                Ready to level up! You've been 80%+ consistent.
              </Text>
            </Pressable>
          )}

          {/* Expanded details */}
          {expanded && (
            <Animated.View entering={FadeIn.duration(200)} style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: "#27272A" }}>
              {habit.anchor_behavior && (
                <View style={{ flexDirection: "row", marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, color: "#5A6178" }}>Anchor: </Text>
                  <Text style={{ fontSize: 13, color: "#A78BFA", fontWeight: "500" }}>
                    "After {habit.anchor_behavior}"
                  </Text>
                </View>
              )}
              {habit.identity_statement && (
                <View style={{ flexDirection: "row", marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, color: "#5A6178" }}>Identity: </Text>
                  <Text style={{ fontSize: 13, color: "#A78BFA", fontStyle: "italic" }}>
                    "I am someone who {habit.identity_statement}"
                  </Text>
                </View>
              )}
              {habit.celebration && (
                <View style={{ flexDirection: "row", marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, color: "#5A6178" }}>Celebration: </Text>
                  <Text style={{ fontSize: 13, color: "#FBBF24" }}>{habit.celebration}</Text>
                </View>
              )}
              <View style={{ flexDirection: "row", gap: 16, marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: "#5A6178" }}>
                  Best streak: <Text style={{ color: "#EAEDF3", fontWeight: "600" }}>{habit.longest_streak}d</Text>
                </Text>
                <Text style={{ fontSize: 12, color: "#5A6178" }}>
                  Total: <Text style={{ color: "#EAEDF3", fontWeight: "600" }}>{habit.total_completions}</Text>
                </Text>
                {habit.lapse_count > 0 && (
                  <Text style={{ fontSize: 12, color: "#5A6178" }}>
                    Lapses: <Text style={{ color: "#F87171", fontWeight: "600" }}>{habit.lapse_count}</Text>
                  </Text>
                )}
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={() => setEditingHabit(habit)}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: "#1E1E27",
                  }}
                >
                  <Ionicons name="pencil-outline" size={14} color="#8B92A8" style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 13, color: "#8B92A8", fontWeight: "500" }}>Edit</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleHabitAction(habit)}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: "#1E1E27",
                  }}
                >
                  <Ionicons name="ellipsis-horizontal" size={14} color="#8B92A8" style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 13, color: "#8B92A8", fontWeight: "500" }}>Manage</Text>
                </Pressable>
              </View>
            </Animated.View>
          )}
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0C1120" }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />}
      >
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 12, marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
              <Ionicons name="arrow-back" size={24} color="#EAEDF3" />
            </Pressable>
            <Text style={{ fontSize: 24, fontWeight: "700", color: "#EAEDF3" }}>Habits</Text>
          </View>
          <Pressable
            onPress={() => setShowAddHabit(true)}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: "#2DD4BF15", alignItems: "center", justifyContent: "center",
            }}
          >
            <Ionicons name="add" size={22} color="#2DD4BF" />
          </Pressable>
        </View>

        {/* Habit Health Score */}
        {habitHealth !== null && activeHabits.length > 0 && (
          <Animated.View entering={FadeInDown.duration(300)} style={{ marginBottom: 20 }}>
            <View style={{
              backgroundColor: "#16161D",
              borderRadius: 16,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
            }}>
              <View style={{
                width: 52, height: 52, borderRadius: 26,
                borderWidth: 3,
                borderColor: habitHealth >= 70 ? "#2DD4BF" : habitHealth >= 40 ? "#FBBF24" : "#F87171",
                alignItems: "center", justifyContent: "center", marginRight: 14,
              }}>
                <Text style={{ fontSize: 18, fontWeight: "800", color: "#EAEDF3" }}>
                  {habitHealth}%
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#EAEDF3" }}>Habit Health</Text>
                <Text style={{ fontSize: 13, color: "#8B92A8", marginTop: 2 }}>
                  {habitHealth >= 80
                    ? "Excellent consistency!"
                    : habitHealth >= 60
                      ? "Good momentum. Keep going."
                      : habitHealth >= 40
                        ? "Room to grow. Start smaller."
                        : "Focus on just one habit."}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* AI Suggested habits */}
        {aiSuggested.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <Ionicons name="sparkles" size={16} color="#A78BFA" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#A78BFA", textTransform: "uppercase", letterSpacing: 0.5 }}>
                AI Suggested
              </Text>
            </View>
            {aiSuggested.map((h, i) => renderHabitCard(h, i))}
          </View>
        )}

        {/* Active habits */}
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Ionicons name="refresh-outline" size={16} color="#2DD4BF" style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#8B92A8", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Active ({manualHabits.length})
            </Text>
          </View>
          {manualHabits.length === 0 && aiSuggested.length === 0 ? (
            <Pressable
              onPress={() => setShowAddHabit(true)}
              style={{ backgroundColor: "#16161D", borderRadius: 16, padding: 24, alignItems: "center" }}
            >
              <Ionicons name="add-circle-outline" size={32} color="#2DD4BF" style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#EAEDF3", marginBottom: 4 }}>
                Build your first habit
              </Text>
              <Text style={{ fontSize: 13, color: "#5A6178", textAlign: "center", lineHeight: 18 }}>
                Start tiny. Anchor it. Celebrate it.{"\n"}That's all it takes.
              </Text>
            </Pressable>
          ) : (
            manualHabits.map((h, i) => renderHabitCard(h, i))
          )}
        </View>

        {/* Paused habits */}
        {pausedHabits.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <Ionicons name="pause-circle-outline" size={16} color="#5A6178" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#5A6178", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Paused ({pausedHabits.length})
              </Text>
            </View>
            {pausedHabits.map((habit, i) => (
              <Pressable
                key={habit.id}
                onPress={() => {
                  Alert.alert("Resume habit?", `Start tracking "${habit.title}" again?`, [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Resume",
                      onPress: async () => { await resumeHabit(habit.id); await fetchHabits(); },
                    },
                  ]);
                }}
                onLongPress={() => handleHabitAction(habit)}
                style={{
                  backgroundColor: "#16161D",
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 8,
                  opacity: 0.6,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons name="pause-circle" size={20} color="#5A6178" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "500", color: "#8B92A8" }}>{habit.title}</Text>
                  <Text style={{ fontSize: 12, color: "#5A6178" }}>
                    Best streak: {habit.longest_streak}d · {habit.total_completions} total
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: "#2DD4BF", fontWeight: "500" }}>Resume</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <AddHabitModal
        visible={showAddHabit || !!editingHabit}
        onClose={() => { setShowAddHabit(false); setEditingHabit(null); }}
        editHabit={editingHabit}
      />
    </SafeAreaView>
  );
}
