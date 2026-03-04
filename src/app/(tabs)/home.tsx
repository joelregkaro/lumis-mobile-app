import { useEffect, useState, useCallback, useMemo } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import CompanionAvatar, { getEvolutionTier } from "@/components/companion/CompanionAvatar";
import MoodCheckIn from "@/components/mood/MoodCheckIn";
import EchoCard from "@/components/echo/EchoCard";
import { useAuthStore } from "@/store/auth";
import { useMoodStore } from "@/store/mood";
import { useEchoStore } from "@/store/echo";
import { useMemoryStore } from "@/store/memory";
import { useGoalStore } from "@/store/goals";
import { useSubscriptionStore } from "@/store/subscription";
import { useStreakStore } from "@/store/streak";
import { useDailyCheckinStore } from "@/store/dailyCheckin";
import { useHabitStore } from "@/store/habits";
import VoiceNoteButton from "@/components/voice/VoiceNoteButton";
import { hapticLight, hapticSuccess } from "@/lib/haptics";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getMoodTrendText(moods: { mood_score: number }[]): { text: string; color: string; icon: "trending-up" | "trending-down" | "remove-outline" } | null {
  if (moods.length < 2) return null;
  const recent = moods.slice(0, Math.min(3, moods.length));
  const older = moods.slice(Math.min(3, moods.length));
  if (older.length === 0) return null;
  const recentAvg = recent.reduce((s, m) => s + m.mood_score, 0) / recent.length;
  const olderAvg = older.reduce((s, m) => s + m.mood_score, 0) / older.length;
  const diff = recentAvg - olderAvg;
  if (diff > 0.5) return { text: `Mood trending up (${recentAvg.toFixed(1)}/10)`, color: "#2DD4BF", icon: "trending-up" };
  if (diff < -0.5) return { text: `Mood dipped recently (${recentAvg.toFixed(1)}/10)`, color: "#F87171", icon: "trending-down" };
  return { text: `Mood steady (${recentAvg.toFixed(1)}/10)`, color: "#A1A1AA", icon: "remove-outline" };
}

function getCompanionMessage(opts: {
  latestInsight: { description: string } | null;
  pendingEchoes: { action_item: string }[];
  goals: { title: string }[];
  moodTrend: ReturnType<typeof getMoodTrendText>;
  displayName: string;
}): string {
  const { latestInsight, pendingEchoes, goals, moodTrend, displayName } = opts;
  const name = displayName || "there";

  if (moodTrend?.icon === "trending-down") {
    return `I've noticed things have been a bit harder lately, ${name}. Want to talk through it?`;
  }
  if (pendingEchoes.length > 0) {
    const item = pendingEchoes[0].action_item;
    const short = item.length > 50 ? item.slice(0, 47) + "..." : item;
    return `How did it go with "${short}"? I'd love to hear.`;
  }
  if (latestInsight) {
    return "I noticed something about your week.\nWant to hear?";
  }
  if (goals.length > 0) {
    return `You're working on ${goals.length} goal${goals.length > 1 ? "s" : ""}. Want to check in on progress?`;
  }
  if (moodTrend?.icon === "trending-up") {
    return `Things seem to be looking up, ${name}. Let's keep the momentum going.`;
  }
  return "I'm here whenever you're\nready to talk.";
}

export default function HomeScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const todaysMood = useMoodStore((s) => s.todaysMood);
  const fetchTodaysMood = useMoodStore((s) => s.fetchTodaysMood);
  const { pendingEchoes, fetchPendingEchoes, markCompleted, markSkipped } = useEchoStore();
  const { latestInsight, fetchLatestInsight, weeklyInsightCards, fetchWeeklyInsightCards } = useMemoryStore();
  const { goals, fetchGoals } = useGoalStore();
  const recentMoods = useMoodStore((s) => s.recentMoods);
  const fetchRecentMoods = useMoodStore((s) => s.fetchRecentMoods);
  const { todaysCheckin, fetchToday: fetchDailyCheckin, setMorningIntention, fetchWeekHistory, weekHistory } = useDailyCheckinStore();
  const { habits, todayCompletions, fetchHabits, fetchTodayCompletions, completeToday, uncompleteToday, isCompletedToday, todaysHabits } = useHabitStore();
  const [moodLogged, setMoodLogged] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [intentionText, setIntentionText] = useState("");
  const [intentionDomain, setIntentionDomain] = useState<string | null>(null);
  const [intentionEnergy, setIntentionEnergy] = useState(5);
  const [showIntentionInput, setShowIntentionInput] = useState(false);
  const [savingIntention, setSavingIntention] = useState(false);

  const loadData = useCallback(async () => {
    try {
      await Promise.all([fetchTodaysMood(), fetchPendingEchoes(), fetchLatestInsight(), fetchGoals(), fetchRecentMoods(14), fetchStreak(), fetchWeeklyInsightCards(), fetchDailyCheckin(), fetchWeekHistory(), fetchHabits(), fetchTodayCompletions()]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (todaysMood) setMoodLogged(true);
  }, [todaysMood]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const isPro = useSubscriptionStore((s) => s.isPro);
  const { currentStreak, fetchStreak, updateStreak } = useStreakStore();
  const companionName = profile?.companion_name ?? "Lumis";
  const displayName = profile?.display_name ?? "";
  const greeting = `${getGreeting()}${displayName ? `, ${displayName}` : ""}`;

  const moodTrend = useMemo(() => getMoodTrendText(recentMoods), [recentMoods]);
  const activeGoals = useMemo(() => goals.filter((g) => g.status === "active"), [goals]);
  const companionMessage = useMemo(
    () => getCompanionMessage({ latestInsight, pendingEchoes, goals: activeGoals, moodTrend, displayName }),
    [latestInsight, pendingEchoes, activeGoals, moodTrend, displayName],
  );
  const companionExpression = useMemo(() => {
    if (moodTrend?.icon === "trending-down") return "concerned" as const;
    if (latestInsight) return "curious" as const;
    if (moodTrend?.icon === "trending-up") return "proud" as const;
    return "warm" as const;
  }, [moodTrend, latestInsight]);
  const companionTier = useMemo(() => getEvolutionTier(currentStreak), [currentStreak]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-bg-primary" edges={["top"]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(400)} className="mb-lg flex-row items-center justify-between pt-md">
          <View>
            <Text style={{ fontSize: 28, fontWeight: "700", color: "#F4F4F5", letterSpacing: -0.5 }}>
              {greeting}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/me")}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#1E1E27", alignItems: "center", justifyContent: "center" }}
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={20} color="#A1A1AA" />
          </Pressable>
        </Animated.View>

        {/* Streak Counter */}
        {currentStreak > 0 && (
          <Animated.View entering={FadeInDown.duration(400)} style={{ marginBottom: 16 }}>
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#16161D",
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: currentStreak >= 7 ? "#FBBF2440" : "#27272A40",
            }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: currentStreak >= 7 ? "#FBBF2420" : "#F8717120",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}>
                <Ionicons name="flame" size={22} color={currentStreak >= 7 ? "#FBBF24" : "#F87171"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 20, fontWeight: "800", color: "#F4F4F5" }}>
                  {currentStreak} <Text style={{ fontSize: 14, fontWeight: "500", color: "#A1A1AA" }}>day streak</Text>
                </Text>
                <Text style={{ fontSize: 12, color: "#71717A", marginTop: 2 }}>
                  {currentStreak >= 30 ? "Incredible consistency!" : currentStreak >= 7 ? "Building a real habit" : "Keep it going!"}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* This Week Progress Strip */}
        {weekHistory.length > 0 && (
          <Animated.View entering={FadeInDown.duration(400)} style={{ marginBottom: 16 }}>
            <View style={{ backgroundColor: "#16161D", borderRadius: 16, padding: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                <Ionicons name="calendar-outline" size={14} color="#A1A1AA" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#A1A1AA", letterSpacing: 0.5, textTransform: "uppercase" }}>
                  This Week
                </Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                {(() => {
                  const today = new Date();
                  const dayOfWeek = today.getDay();
                  const monday = new Date(today);
                  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
                  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
                  return Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(monday);
                    d.setDate(monday.getDate() + i);
                    const dateStr = d.toISOString().split("T")[0];
                    const checkin = weekHistory.find((c) => c.checkin_date === dateStr);
                    const isToday = dateStr === today.toISOString().split("T")[0];
                    const hasMorning = !!checkin?.morning_intention;
                    const hasEvening = !!checkin?.day_rating;
                    const rating = checkin?.day_rating;
                    const ratingColor = !rating ? "#27272A" : rating >= 8 ? "#2DD4BF" : rating >= 5 ? "#A78BFA" : "#F87171";
                    return (
                      <View key={i} style={{ alignItems: "center", flex: 1 }}>
                        <Text style={{ fontSize: 11, color: isToday ? "#F4F4F5" : "#52525B", fontWeight: isToday ? "700" : "400", marginBottom: 6 }}>
                          {dayLabels[i]}
                        </Text>
                        <View style={{
                          width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center",
                          backgroundColor: hasEvening ? ratingColor + "30" : hasMorning ? "#FBBF2420" : "#1E1E27",
                          borderWidth: isToday ? 2 : hasMorning || hasEvening ? 1 : 0,
                          borderColor: isToday ? "#8B5CF6" : ratingColor + "50",
                        }}>
                          {hasEvening ? (
                            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: ratingColor }} />
                          ) : hasMorning ? (
                            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#FBBF24", opacity: 0.6 }} />
                          ) : null}
                        </View>
                      </View>
                    );
                  });
                })()}
              </View>
              <Text style={{ fontSize: 12, color: "#71717A", marginTop: 10, textAlign: "center" }}>
                {weekHistory.filter((c) => c.morning_intention).length} of 7 days this week
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Morning Intention */}
        {!todaysCheckin?.morning_intention && new Date().getHours() < 14 ? (
          <Animated.View entering={FadeInDown.duration(400)} className="mb-lg">
            {!showIntentionInput ? (
              <Pressable
                onPress={() => { setShowIntentionInput(true); hapticLight(); }}
                style={{ backgroundColor: "#16161D", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#8B5CF630" }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#FBBF2420", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                    <Ionicons name="sunny-outline" size={18} color="#FBBF24" />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#F4F4F5" }}>Set your intention</Text>
                </View>
                <Text style={{ fontSize: 14, color: "#A1A1AA", lineHeight: 20 }}>
                  What's one thing you want to make happen today?
                </Text>
              </Pressable>
            ) : (
              <View style={{ backgroundColor: "#16161D", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#8B5CF640" }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#F4F4F5", marginBottom: 12 }}>
                  Today I want to...
                </Text>
                <TextInput
                  value={intentionText}
                  onChangeText={setIntentionText}
                  placeholder="e.g., Go for a 10-minute walk after lunch"
                  placeholderTextColor="#52525B"
                  style={{ backgroundColor: "#1E1E27", borderRadius: 12, padding: 14, fontSize: 15, color: "#F4F4F5", borderWidth: 1, borderColor: "#27272A40" }}
                  autoFocus
                />
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  {([
                    { key: "health", label: "Health", icon: "heart-outline" as const },
                    { key: "career", label: "Work", icon: "briefcase-outline" as const },
                    { key: "relationships", label: "Relationships", icon: "people-outline" as const },
                    { key: "personal_growth", label: "Growth", icon: "trending-up" as const },
                    { key: "rest_recovery", label: "Rest", icon: "bed-outline" as const },
                    { key: "fun_creativity", label: "Fun", icon: "color-palette-outline" as const },
                  ]).map((d) => (
                    <Pressable
                      key={d.key}
                      onPress={() => { setIntentionDomain(intentionDomain === d.key ? null : d.key); hapticLight(); }}
                      style={{
                        flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
                        backgroundColor: intentionDomain === d.key ? "#8B5CF620" : "#1E1E27",
                        borderWidth: 1, borderColor: intentionDomain === d.key ? "#8B5CF660" : "#27272A40",
                      }}
                    >
                      <Ionicons name={d.icon} size={14} color={intentionDomain === d.key ? "#A78BFA" : "#71717A"} style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 13, color: intentionDomain === d.key ? "#A78BFA" : "#A1A1AA", fontWeight: "500" }}>{d.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable
                  onPress={async () => {
                    if (!intentionText.trim()) return;
                    setSavingIntention(true);
                    await setMorningIntention(intentionText.trim(), intentionDomain, intentionEnergy);
                    await updateStreak();
                    await hapticSuccess();
                    setSavingIntention(false);
                    setShowIntentionInput(false);
                  }}
                  disabled={!intentionText.trim() || savingIntention}
                  style={{
                    marginTop: 14, backgroundColor: intentionText.trim() ? "#8B5CF6" : "#8B5CF640",
                    borderRadius: 12, paddingVertical: 12, alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "white" }}>
                    {savingIntention ? "Setting..." : "Set Intention"}
                  </Text>
                </Pressable>
              </View>
            )}
          </Animated.View>
        ) : todaysCheckin?.morning_intention ? (
          <Animated.View entering={FadeInDown.duration(400)} className="mb-lg">
            <View style={{ backgroundColor: "#16161D", borderRadius: 16, padding: 16, borderLeftWidth: 3, borderLeftColor: "#FBBF24" }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="sunny" size={16} color="#FBBF24" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#A1A1AA", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Today's Intention
                </Text>
              </View>
              <Text style={{ fontSize: 15, color: "#F4F4F5", fontWeight: "500", marginTop: 8 }}>
                "{todaysCheckin.morning_intention}"
              </Text>
              {todaysCheckin.focus_domain && (
                <Text style={{ fontSize: 12, color: "#A78BFA", marginTop: 6, fontWeight: "500" }}>
                  Focus: {todaysCheckin.focus_domain.replace(/_/g, " ")}
                </Text>
              )}
            </View>
          </Animated.View>
        ) : null}

        {/* Today's Habits */}
        {todaysHabits().length > 0 && (
          <Animated.View entering={FadeInDown.duration(400)} className="mb-lg">
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <Ionicons name="refresh-outline" size={16} color="#2DD4BF" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#A1A1AA", letterSpacing: 0.5, textTransform: "uppercase" }}>
                Today's Habits
              </Text>
              <Text style={{ fontSize: 12, color: "#71717A", marginLeft: "auto" }}>
                {todayCompletions.length}/{todaysHabits().length}
              </Text>
            </View>
            <View style={{ backgroundColor: "#16161D", borderRadius: 16, overflow: "hidden" }}>
              {todaysHabits().map((habit, i) => {
                const completed = isCompletedToday(habit.id);
                return (
                  <Pressable
                    key={habit.id}
                    onPress={async () => {
                      if (completed) {
                        await uncompleteToday(habit.id);
                        await hapticLight();
                      } else {
                        await completeToday(habit.id);
                        fetchStreak();
                        await hapticSuccess();
                      }
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 14,
                      borderBottomWidth: i < todaysHabits().length - 1 ? 0.5 : 0,
                      borderBottomColor: "#27272A40",
                    }}
                  >
                    <View style={{
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      borderWidth: 2,
                      borderColor: completed ? "#2DD4BF" : "#3F3F4640",
                      backgroundColor: completed ? "#2DD4BF20" : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}>
                      {completed && <Ionicons name="checkmark" size={14} color="#2DD4BF" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: 15,
                        fontWeight: "500",
                        color: completed ? "#71717A" : "#F4F4F5",
                        textDecorationLine: completed ? "line-through" : "none",
                      }}>
                        {habit.title}
                      </Text>
                      {habit.current_streak > 0 && (
                        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3 }}>
                          <Ionicons name="flame" size={12} color={habit.current_streak >= 7 ? "#FBBF24" : "#F8717180"} />
                          <Text style={{ fontSize: 11, color: "#71717A", marginLeft: 3 }}>
                            {habit.current_streak}-day streak
                          </Text>
                        </View>
                      )}
                    </View>
                    {habit.preferred_time && (
                      <Text style={{ fontSize: 11, color: "#52525B" }}>
                        {habit.preferred_time === "morning" ? "☀️" : habit.preferred_time === "afternoon" ? "🌤" : "🌙"}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* Mood Check-in */}
        {!moodLogged ? (
          <Animated.View entering={FadeInDown.duration(400)} className="mb-lg">
            <MoodCheckIn onComplete={() => { setMoodLogged(true); updateStreak(); }} />
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.duration(400)} className="mb-lg">
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#16161D", borderRadius: 16, padding: 16 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#14B8A620", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                <Ionicons name="checkmark" size={18} color="#2DD4BF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, color: "#F4F4F5", fontWeight: "500" }}>Checked in today</Text>
                {moodTrend ? (
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                    <Ionicons name={moodTrend.icon} size={14} color={moodTrend.color} style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 13, color: moodTrend.color }}>{moodTrend.text}</Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 13, color: "#71717A", marginTop: 2 }}>You're doing great by showing up.</Text>
                )}
              </View>
            </View>
          </Animated.View>
        )}

        {/* Session Echoes */}
        {pendingEchoes.length > 0 && (
          <Animated.View entering={FadeInDown.delay(100).duration(400)} className="mb-lg">
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <Ionicons name="repeat-outline" size={16} color="#A1A1AA" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#A1A1AA", letterSpacing: 0.5, textTransform: "uppercase" }}>
                Between Sessions
              </Text>
            </View>
            {pendingEchoes.map((echo, i) => (
              <EchoCard key={echo.id} echo={echo} index={i} onComplete={markCompleted} onSkip={markSkipped} />
            ))}
          </Animated.View>
        )}

        {/* Companion Card */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} className="mb-lg">
          <Pressable
            onPress={async () => {
              await hapticLight();
              router.push("/(tabs)/chat");
            }}
            style={{
              backgroundColor: "#16161D",
              borderRadius: 20,
              padding: 24,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#27272A40",
            }}
            accessibilityLabel={`Start a conversation with ${companionName}`}
            accessibilityRole="button"
          >
            <CompanionAvatar
              expression={companionExpression}
              size="large"
              tier={companionTier}
              showTier
            />
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#A1A1AA", letterSpacing: 0.5, textTransform: "uppercase", marginTop: 16 }}>
              {companionName}
            </Text>
            <Text style={{ fontSize: 16, color: "#F4F4F5", textAlign: "center", marginTop: 8, lineHeight: 24 }}>
              {companionMessage}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 20,
                backgroundColor: "#8B5CF6",
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 24,
              }}
            >
              <Ionicons name="chatbubble-outline" size={16} color="white" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 15, fontWeight: "600", color: "white" }}>Start a Conversation</Text>
            </View>
          </Pressable>
          <Pressable
            onPress={async () => {
              await hapticLight();
              if (isPro) {
                router.push("/voice-chat");
              } else {
                router.push("/paywall");
              }
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 10,
              paddingHorizontal: 24,
              paddingVertical: 10,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: "#8B5CF640",
            }}
            accessibilityLabel={`Start a voice session with ${companionName}`}
            accessibilityRole="button"
          >
            <Ionicons name="mic-outline" size={16} color="#A78BFA" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 14, fontWeight: "500", color: "#A78BFA" }}>Voice Session</Text>
            {!isPro && (
              <View style={{ marginLeft: 8, backgroundColor: "#8B5CF620", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: "600", color: "#A78BFA" }}>PRO</Text>
              </View>
            )}
          </Pressable>
        </Animated.View>

        {/* Weekly Insight Card Banner */}
        {weeklyInsightCards.length > 0 && (
          <Animated.View entering={FadeInDown.delay(250).duration(400)} className="mb-lg">
            <Pressable onPress={() => router.push("/(tabs)/growth")}>
              <LinearGradient
                colors={["#6D28D9", "#14B8A6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 16, padding: 16 }}
              >
                {weeklyInsightCards[0].stat_value && (
                  <Text style={{ fontSize: 28, fontWeight: "800", color: "white" }}>
                    {weeklyInsightCards[0].stat_value}
                  </Text>
                )}
                <Text style={{ fontSize: 15, fontWeight: "700", color: "white", marginTop: 4 }}>
                  {weeklyInsightCards[0].title}
                </Text>
                <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>
                  {weeklyInsightCards[0].body}
                </Text>
                <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 8, fontWeight: "500" }}>
                  See all insights →
                </Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}

        {/* Weekly Insight */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} className="mb-lg">
          <View style={{ backgroundColor: "#16161D", borderRadius: 16, padding: 16, borderLeftWidth: 3, borderLeftColor: "#14B8A6" }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
              <Ionicons name="bulb-outline" size={16} color="#FBBF24" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#A1A1AA", letterSpacing: 0.5, textTransform: "uppercase" }}>
                Weekly Insight
              </Text>
            </View>
            {latestInsight ? (
              <>
                <Text style={{ fontSize: 15, color: "#F4F4F5", lineHeight: 22 }}>
                  {latestInsight.description}
                </Text>
                <Pressable onPress={() => router.push("/(tabs)/growth")} style={{ alignSelf: "flex-end", marginTop: 8 }}>
                  <Text style={{ fontSize: 14, color: "#A78BFA", fontWeight: "500" }}>See all insights →</Text>
                </Pressable>
              </>
            ) : (
              <Text style={{ fontSize: 14, color: "#71717A", lineHeight: 20 }}>
                Start having conversations to unlock your first insight.
              </Text>
            )}
          </View>
        </Animated.View>

        {/* Active Goal Spotlight */}
        {activeGoals.length > 0 && (
          <Animated.View entering={FadeInDown.delay(350).duration(400)} className="mb-lg">
            <Pressable
              onPress={() => router.push("/(tabs)/growth")}
              style={{ backgroundColor: "#16161D", borderRadius: 16, padding: 16, borderLeftWidth: 3, borderLeftColor: "#8B5CF6" }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                <Ionicons name="flag-outline" size={16} color="#A78BFA" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#A1A1AA", letterSpacing: 0.5, textTransform: "uppercase" }}>
                  Current Focus
                </Text>
              </View>
              <Text style={{ fontSize: 15, color: "#F4F4F5", fontWeight: "500" }}>{activeGoals[0].title}</Text>
              {activeGoals[0].description ? (
                <Text style={{ fontSize: 13, color: "#71717A", marginTop: 4, lineHeight: 18 }} numberOfLines={2}>
                  {activeGoals[0].description}
                </Text>
              ) : null}
              {activeGoals.length > 1 && (
                <Text style={{ fontSize: 13, color: "#A78BFA", marginTop: 8, fontWeight: "500" }}>
                  +{activeGoals.length - 1} more goal{activeGoals.length > 2 ? "s" : ""} →
                </Text>
              )}
            </Pressable>
          </Animated.View>
        )}

        {/* Evening Reflection CTA */}
        {new Date().getHours() >= 18 && !todaysCheckin?.day_rating && (
          <Animated.View entering={FadeInDown.delay(350).duration(400)} className="mb-lg">
            <Pressable
              onPress={async () => { await hapticLight(); router.push("/evening-reflection"); }}
              style={{ backgroundColor: "#16161D", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#A78BFA30", flexDirection: "row", alignItems: "center" }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#A78BFA15", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                <Ionicons name="moon-outline" size={20} color="#A78BFA" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, color: "#F4F4F5", fontWeight: "600" }}>Wind down your day</Text>
                <Text style={{ fontSize: 13, color: "#71717A", marginTop: 2 }}>1-minute reflection to close the loop</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#71717A" />
            </Pressable>
          </Animated.View>
        )}

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: "#A1A1AA", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 12 }}>
            Quick Actions
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => router.push("/sos")}
              style={{
                flex: 1,
                backgroundColor: "#16161D",
                borderRadius: 16,
                paddingVertical: 20,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#27272A40",
              }}
              accessibilityLabel="Breathing exercise"
            >
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#14B8A615", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                <Ionicons name="leaf-outline" size={22} color="#2DD4BF" />
              </View>
              <Text style={{ fontSize: 13, color: "#A1A1AA", fontWeight: "500" }}>Breathe</Text>
            </Pressable>

            <View style={{
              flex: 1,
              backgroundColor: "#16161D",
              borderRadius: 16,
              paddingVertical: 20,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#27272A40",
            }}>
              <VoiceNoteButton />
            </View>

            <Pressable
              onPress={() => router.push("/wind-down")}
              style={{
                flex: 1,
                backgroundColor: "#16161D",
                borderRadius: 16,
                paddingVertical: 20,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#27272A40",
              }}
              accessibilityLabel="Wind down routine"
            >
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#8B5CF615", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                <Ionicons name="moon-outline" size={22} color="#A78BFA" />
              </View>
              <Text style={{ fontSize: 13, color: "#A1A1AA", fontWeight: "500" }}>Wind Down</Text>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
