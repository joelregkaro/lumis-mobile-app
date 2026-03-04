import { useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn, Layout } from "react-native-reanimated";
import MoodCheckIn from "@/components/mood/MoodCheckIn";
import { SectionHeader } from "@/components/ui";
import { colors } from "@/constants/theme";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { useMilestoneStore } from "@/store/milestones";
import type { Habit } from "@/types/database";

const c = colors.dark;

const DOMAIN_OPTIONS = [
  { key: "health", label: "Health", icon: "heart-outline" as const },
  { key: "career", label: "Work", icon: "briefcase-outline" as const },
  { key: "relationships", label: "Relationships", icon: "people-outline" as const },
  { key: "personal_growth", label: "Growth", icon: "trending-up" as const },
  { key: "rest_recovery", label: "Rest", icon: "bed-outline" as const },
  { key: "fun_creativity", label: "Fun", icon: "color-palette-outline" as const },
];

interface Props {
  moodLogged: boolean;
  onMoodComplete: () => void;
  moodTrend: { text: string; color: string; icon: "trending-up" | "trending-down" | "remove-outline" } | null;
  todaysCheckin: { morning_intention?: string | null; focus_domain?: string | null; day_rating?: number | null } | null;
  onSetIntention: (text: string, domain: string | null, energy: number) => Promise<void>;
  habits: Habit[];
  todayCompletions: { habit_id: string }[];
  isCompletedToday: (id: string) => boolean;
  onHabitComplete: (habit: Habit) => void;
  onHabitUncomplete: (id: string) => void;
  onHabitLongPress: (habit: Habit) => void;
  onAddHabit: () => void;
  onViewAllHabits: () => void;
}

export default function DailyRhythmSection({
  moodLogged,
  onMoodComplete,
  moodTrend,
  todaysCheckin,
  onSetIntention,
  habits,
  todayCompletions,
  isCompletedToday,
  onHabitComplete,
  onHabitUncomplete,
  onHabitLongPress,
  onAddHabit,
  onViewAllHabits,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [showIntentionInput, setShowIntentionInput] = useState(false);
  const [intentionText, setIntentionText] = useState("");
  const [intentionDomain, setIntentionDomain] = useState<string | null>(null);
  const [savingIntention, setSavingIntention] = useState(false);

  const intentionDone = !!todaysCheckin?.morning_intention;
  const completedCount = todayCompletions.length;
  const totalItems = habits.length + (moodLogged ? 0 : 1) + (intentionDone ? 0 : 1);
  const doneCount = completedCount + (moodLogged ? 1 : 0) + (intentionDone ? 1 : 0);
  const allDone = totalItems > 0 && doneCount >= habits.length + (1) + (1);

  const handleSaveIntention = async () => {
    if (!intentionText.trim()) return;
    setSavingIntention(true);
    await onSetIntention(intentionText.trim(), intentionDomain, 5);
    await hapticSuccess();
    setSavingIntention(false);
    setShowIntentionInput(false);
  };

  return (
    <Animated.View entering={FadeInDown.delay(100).duration(400)} style={{ marginBottom: 24 }}>
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={{ flexDirection: "row", alignItems: "center", marginBottom: expanded ? 12 : 0 }}
      >
        <Ionicons name="sunny-outline" size={16} color={c.brand.gold} style={{ marginRight: 6 }} />
        <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: c.text.secondary,
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          Daily Rhythm
        </Text>
        {!expanded && (
          <Text style={{ fontSize: 12, color: c.text.tertiary, marginLeft: 8 }}>
            {doneCount} done
          </Text>
        )}
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={c.text.tertiary}
          style={{ marginLeft: "auto" }}
        />
      </Pressable>

      {expanded && (
        <Animated.View layout={Layout.springify()}>
          {/* Morning Intention */}
          {!intentionDone ? (
            <View style={{ marginBottom: 12 }}>
              {!showIntentionInput ? (
                <Pressable
                  onPress={() => { setShowIntentionInput(true); hapticLight(); }}
                  style={{
                    backgroundColor: c.bg.surface,
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: `${c.brand.purple}30`,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: `${c.brand.gold}20`,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 10,
                      }}
                    >
                      <Ionicons name="sunny-outline" size={18} color={c.brand.gold} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: c.text.primary }}>
                        Set your intention
                      </Text>
                      <Text style={{ fontSize: 13, color: c.text.secondary, marginTop: 2 }}>
                        What's one thing you want to make happen?
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={c.text.tertiary} />
                  </View>
                </Pressable>
              ) : (
                <Animated.View entering={FadeIn.duration(200)}>
                  <View
                    style={{
                      backgroundColor: c.bg.surface,
                      borderRadius: 16,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: `${c.brand.purple}40`,
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: "600", color: c.text.primary, marginBottom: 12 }}>
                      Today I want to...
                    </Text>
                    <TextInput
                      value={intentionText}
                      onChangeText={setIntentionText}
                      placeholder="e.g., Go for a 10-minute walk after lunch"
                      placeholderTextColor={c.text.tertiary}
                      style={{
                        backgroundColor: c.bg.primary,
                        borderRadius: 12,
                        padding: 14,
                        fontSize: 15,
                        color: c.text.primary,
                        borderWidth: 1,
                        borderColor: c.bg.border,
                      }}
                      autoFocus
                    />
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                      {DOMAIN_OPTIONS.map((d) => (
                        <Pressable
                          key={d.key}
                          onPress={() => {
                            setIntentionDomain(intentionDomain === d.key ? null : d.key);
                            hapticLight();
                          }}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 20,
                            backgroundColor: intentionDomain === d.key ? `${c.brand.purple}20` : c.bg.primary,
                            borderWidth: 1,
                            borderColor: intentionDomain === d.key ? `${c.brand.purple}60` : c.bg.border,
                          }}
                        >
                          <Ionicons
                            name={d.icon}
                            size={14}
                            color={intentionDomain === d.key ? c.brand.purpleLight : c.text.tertiary}
                            style={{ marginRight: 4 }}
                          />
                          <Text
                            style={{
                              fontSize: 13,
                              color: intentionDomain === d.key ? c.brand.purpleLight : c.text.secondary,
                              fontWeight: "500",
                            }}
                          >
                            {d.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    <Pressable
                      onPress={handleSaveIntention}
                      disabled={!intentionText.trim() || savingIntention}
                      style={{
                        marginTop: 14,
                        backgroundColor: intentionText.trim() ? c.brand.purple : `${c.brand.purple}40`,
                        borderRadius: 12,
                        paddingVertical: 12,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontSize: 15, fontWeight: "600", color: "white" }}>
                        {savingIntention ? "Setting..." : "Set Intention"}
                      </Text>
                    </Pressable>
                  </View>
                </Animated.View>
              )}
            </View>
          ) : (
            <View
              style={{
                backgroundColor: c.bg.surface,
                borderRadius: 16,
                padding: 14,
                borderLeftWidth: 3,
                borderLeftColor: c.brand.gold,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="sunny" size={14} color={c.brand.gold} style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 14, color: c.text.primary, fontWeight: "500", flex: 1 }}>
                  "{todaysCheckin?.morning_intention}"
                </Text>
              </View>
            </View>
          )}

          {/* Habits */}
          <View style={{ backgroundColor: c.bg.surface, borderRadius: 16, overflow: "hidden", marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 }}>
              <Ionicons name="refresh-outline" size={14} color={c.brand.teal} style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 11, fontWeight: "600", color: c.text.secondary, letterSpacing: 0.5, textTransform: "uppercase" }}>
                Habits
              </Text>
              {habits.length > 0 && (
                <Text style={{ fontSize: 11, color: c.text.tertiary, marginLeft: 6 }}>
                  {completedCount}/{habits.length}
                </Text>
              )}
              <View style={{ marginLeft: "auto", flexDirection: "row", gap: 8, alignItems: "center" }}>
                {habits.length > 0 && (
                  <Pressable onPress={onViewAllHabits}>
                    <Text style={{ fontSize: 11, color: c.brand.purpleLight, fontWeight: "500" }}>All</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={onAddHabit}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: `${c.brand.teal}15`,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="add" size={16} color={c.brand.teal} />
                </Pressable>
              </View>
            </View>
            {habits.length === 0 ? (
              <Pressable onPress={onAddHabit} style={{ padding: 16, alignItems: "center" }}>
                <Text style={{ fontSize: 14, color: c.text.tertiary }}>
                  Tap + to add your first habit
                </Text>
              </Pressable>
            ) : (
              habits.map((habit, i) => {
                const completed = isCompletedToday(habit.id);
                return (
                  <Pressable
                    key={habit.id}
                    onPress={async () => {
                      if (completed) {
                        onHabitUncomplete(habit.id);
                        await hapticLight();
                      } else {
                        onHabitComplete(habit);
                      }
                    }}
                    onLongPress={() => onHabitLongPress(habit)}
                    delayLongPress={400}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderTopWidth: i > 0 ? 0.5 : 0,
                      borderTopColor: c.bg.border,
                    }}
                  >
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: completed ? c.brand.teal : `${c.bg.elevated}80`,
                        backgroundColor: completed ? `${c.brand.teal}20` : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                      }}
                    >
                      {completed && <Ionicons name="checkmark" size={13} color={c.brand.teal} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "500",
                          color: completed ? c.text.tertiary : c.text.primary,
                          textDecorationLine: completed ? "line-through" : "none",
                        }}
                      >
                        {habit.tiny_version && habit.difficulty === "tiny" ? habit.tiny_version : habit.title}
                      </Text>
                      {habit.current_streak > 0 && (
                        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                          <Ionicons name="flame" size={11} color={habit.current_streak >= 7 ? c.brand.gold : `${c.status.crisis}80`} />
                          <Text style={{ fontSize: 10, color: c.text.tertiary, marginLeft: 3 }}>{habit.current_streak}d</Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>

          {/* Mood Check-in */}
          {!moodLogged ? (
            <MoodCheckIn onComplete={onMoodComplete} />
          ) : (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: c.bg.surface,
                borderRadius: 16,
                padding: 14,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: `${c.brand.teal}20`,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Ionicons name="checkmark" size={16} color={c.brand.teal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, color: c.text.primary, fontWeight: "500" }}>Mood checked in</Text>
                {moodTrend && (
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3 }}>
                    <Ionicons name={moodTrend.icon} size={12} color={moodTrend.color} style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 12, color: moodTrend.color }}>{moodTrend.text}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
}
