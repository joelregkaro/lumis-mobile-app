import { useEffect, useState, useCallback, useMemo } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getEvolutionTier } from "@/components/companion/CompanionAvatar";
import EchoCard from "@/components/echo/EchoCard";
import AddHabitModal from "@/components/habits/AddHabitModal";
import CompanionHeroCard from "@/components/home/CompanionHeroCard";
import DailyRhythmSection from "@/components/home/DailyRhythmSection";
import ProgressSnapshot from "@/components/home/ProgressSnapshot";
import QuickActionsRow from "@/components/home/QuickActionsRow";
import { LoadingScreen, SectionHeader } from "@/components/ui";
import { useAuthStore } from "@/store/auth";
import { useMoodStore } from "@/store/mood";
import { useEchoStore } from "@/store/echo";
import { useMemoryStore } from "@/store/memory";
import { useGoalStore } from "@/store/goals";
import { useSubscriptionStore } from "@/store/subscription";
import { useStreakStore } from "@/store/streak";
import { useDailyCheckinStore } from "@/store/dailyCheckin";
import { useHabitStore } from "@/store/habits";
import { useHumanScoreStore, getTier } from "@/store/humanScore";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { useMilestoneStore } from "@/store/milestones";
import { colors } from "@/constants/theme";
import type { Habit } from "@/types/database";

const c = colors.dark;

const MILESTONE_MESSAGES: Record<number, string> = {
  7: "One week in. You're building something real.",
  14: "Two weeks. The neural pathways are strengthening.",
  21: "Three weeks. This is becoming part of who you are.",
  30: "A full month. Incredible commitment.",
  66: "Science says this is becoming automatic.",
  90: "90 days. This is a lifestyle now.",
  100: "Triple digits. This is who you are.",
  365: "ONE YEAR. Legendary.",
};

const SURPRISE_MESSAGES = [
  "Every time you show up, it counts.",
  "Small actions. Big change. That's you.",
  "Consistency is a superpower, and you have it.",
  "Future you will thank present you for this.",
];

const LAPSE_TAGS = ["Forgot", "Tired", "Busy", "Sick", "Traveling", "Didn't feel like it", "Other"];

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
  if (diff > 0.5) return { text: `Trending up (${recentAvg.toFixed(1)})`, color: c.brand.teal, icon: "trending-up" };
  if (diff < -0.5) return { text: `Dipped (${recentAvg.toFixed(1)})`, color: c.status.crisis, icon: "trending-down" };
  return { text: `Steady (${recentAvg.toFixed(1)})`, color: c.text.secondary, icon: "remove-outline" };
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
    return `How did it go with "${short}"?`;
  }
  if (latestInsight) {
    return "I noticed something about your week.\nWant to hear?";
  }
  if (goals.length > 0) {
    return `You're working on ${goals.length} goal${goals.length > 1 ? "s" : ""}. Want to check in?`;
  }
  if (moodTrend?.icon === "trending-up") {
    return `Things are looking up, ${name}. Let's keep the momentum.`;
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
  const { todaysCheckin, fetchToday: fetchDailyCheckin, setMorningIntention, fetchWeekHistory } = useDailyCheckinStore();
  const { todayCompletions, fetchHabits, fetchTodayCompletions, completeToday, uncompleteToday, isCompletedToday, todaysHabits, pauseHabit, archiveHabit, addReflection } = useHabitStore();
  const { latestScore, level, archetype, fetchLatestScore } = useHumanScoreStore();
  const [moodLogged, setMoodLogged] = useState(false);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [celebrationText, setCelebrationText] = useState<string | null>(null);
  const [showLapsePrompt, setShowLapsePrompt] = useState<{ habitId: string; title: string; prevStreak: number } | null>(null);
  const [showBlueprintNudge, setShowBlueprintNudge] = useState(false);

  // Check if user completed blueprint but hasn't dismissed the share nudge
  useEffect(() => {
    (async () => {
      try {
        const bpRaw = await AsyncStorage.getItem("lumis_blueprint_data");
        const dismissed = await AsyncStorage.getItem("lumis_blueprint_nudge_dismissed");
        if (bpRaw && !dismissed) setShowBlueprintNudge(true);
      } catch {}
    })();
  }, []);

  const dismissBlueprintNudge = useCallback(async () => {
    setShowBlueprintNudge(false);
    await AsyncStorage.setItem("lumis_blueprint_nudge_dismissed", "true");
  }, []);

  const loadData = useCallback(async () => {
    try {
      await Promise.all([
        fetchTodaysMood(), fetchPendingEchoes(), fetchLatestInsight(),
        fetchGoals(), fetchRecentMoods(14), fetchStreak(),
        fetchWeeklyInsightCards(), fetchDailyCheckin(), fetchWeekHistory(),
        fetchHabits(), fetchTodayCompletions(), fetchLatestScore(),
      ]);
    } catch (e) {
      console.warn("Failed to load some home data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (todaysMood) setMoodLogged(true); }, [todaysMood]);

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

  const showCelebration = (text: string) => {
    setCelebrationText(text);
    setTimeout(() => setCelebrationText(null), 2000);
  };

  const handleHabitComplete = async (habit: Habit) => {
    const result = await completeToday(habit.id);
    fetchStreak();
    await hapticSuccess();
    await fetchHabits();

    if (habit.celebration) showCelebration(habit.celebration);

    const updated = useHabitStore.getState().habits.find((h) => h.id === habit.id);
    if (updated) {
      const streak = updated.current_streak;
      if (MILESTONE_MESSAGES[streak]) {
        setTimeout(() => Alert.alert(`${streak}-Day Streak!`, MILESTONE_MESSAGES[streak], [{ text: "Let's go!" }]), 500);
      }
      if (!MILESTONE_MESSAGES[streak] && Math.random() < 0.1) {
        showCelebration(SURPRISE_MESSAGES[Math.floor(Math.random() * SURPRISE_MESSAGES.length)]);
      }
      const milestones: Record<string, boolean> = {};
      if (streak >= 7) milestones.habit_streak_7 = true;
      if (streak >= 14) milestones.habit_streak_14 = true;
      if (streak >= 21) milestones.habit_streak_21 = true;
      if (streak >= 30) milestones.habit_streak_30 = true;
      if (Object.keys(milestones).length > 0) {
        useMilestoneStore.getState().checkNewMilestones(milestones);
      }
    }
    if (result?.lapsed) {
      setShowLapsePrompt({ habitId: habit.id, title: habit.title, prevStreak: result.streak });
    }
  };

  const handleLapseTag = async (tag: string) => {
    if (!showLapsePrompt) return;
    await addReflection({ habitId: showLapsePrompt.habitId, reflectionType: "lapse", whatBlocked: tag });
    setShowLapsePrompt(null);
  };

  const handleHabitLongPress = (habit: Habit) => {
    hapticLight();
    Alert.alert(habit.title, "What would you like to do?", [
      { text: "Cancel", style: "cancel" },
      { text: "Pause Habit", onPress: async () => { await pauseHabit(habit.id); await fetchHabits(); } },
      {
        text: "Remove Habit", style: "destructive",
        onPress: () => Alert.alert("Remove this habit?", "This can't be undone.", [
          { text: "Cancel", style: "cancel" },
          { text: "Remove", style: "destructive", onPress: async () => { await archiveHabit(habit.id); await fetchHabits(); } },
        ]),
      },
    ]);
  };

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg.primary }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.brand.purple} />}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(400)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 16, marginBottom: 20 }}>
          <Text style={{ fontSize: 28, fontWeight: "700", color: c.text.primary, letterSpacing: -0.5 }}>
            {greeting}
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/me")}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.bg.surface, alignItems: "center", justifyContent: "center" }}
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={20} color={c.text.secondary} />
          </Pressable>
        </Animated.View>

        {/* HERO: Companion Card */}
        <CompanionHeroCard
          companionName={companionName}
          companionMessage={companionMessage}
          companionExpression={companionExpression}
          companionTier={companionTier}
          isPro={isPro}
          onChat={async () => { await hapticLight(); router.push("/(tabs)/chat"); }}
          onVoice={async () => { await hapticLight(); router.push(isPro ? "/voice-chat" : "/paywall"); }}
        />

        {/* Celebration overlay */}
        {celebrationText && (
          <Animated.View entering={FadeIn.duration(200)} style={{ alignItems: "center", marginBottom: 16 }}>
            <View style={{ backgroundColor: `${c.brand.gold}20`, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14, borderWidth: 1, borderColor: `${c.brand.gold}40` }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: c.brand.gold, textAlign: "center" }}>{celebrationText}</Text>
            </View>
          </Animated.View>
        )}

        {/* Lapse compassionate prompt */}
        {showLapsePrompt && (
          <Animated.View entering={FadeInDown.duration(300)} style={{ marginBottom: 16 }}>
            <View style={{ backgroundColor: c.bg.surface, borderRadius: 16, padding: 16, borderLeftWidth: 3, borderLeftColor: c.status.crisis }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: c.text.primary, marginBottom: 4 }}>
                You missed "{showLapsePrompt.title}" yesterday
              </Text>
              <Text style={{ fontSize: 13, color: c.text.secondary, marginBottom: 12, lineHeight: 18 }}>
                That's just data, not failure. What got in the way?
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {LAPSE_TAGS.map((tag) => (
                  <Pressable
                    key={tag}
                    onPress={() => handleLapseTag(tag)}
                    style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: `${c.status.crisis}15`, borderWidth: 1, borderColor: `${c.status.crisis}30` }}
                  >
                    <Text style={{ fontSize: 13, color: c.status.crisis, fontWeight: "500" }}>{tag}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={() => setShowLapsePrompt(null)} style={{ alignSelf: "flex-end", marginTop: 8 }}>
                <Text style={{ fontSize: 12, color: c.text.tertiary }}>Dismiss</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* Blueprint share nudge */}
        {showBlueprintNudge && (
          <Animated.View entering={FadeInDown.delay(300).duration(400)} style={{ marginBottom: 16 }}>
            <LinearGradient
              colors={[`${c.brand.purple}15`, `${c.brand.teal}10`]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ borderRadius: 16, padding: 16, borderWidth: 1, borderColor: `${c.brand.purple}30` }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: c.text.primary, marginBottom: 4 }}>
                    Your Blueprint is ready
                  </Text>
                  <Text style={{ fontSize: 13, color: c.text.secondary, lineHeight: 18 }}>
                    Share your Life Blueprint with friends and see how they compare.
                  </Text>
                </View>
                <Pressable onPress={dismissBlueprintNudge} style={{ padding: 4 }}>
                  <Ionicons name="close" size={18} color={c.text.tertiary} />
                </Pressable>
              </View>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <Pressable
                  onPress={() => { router.push("/life-blueprint"); }}
                  style={{ flex: 1, backgroundColor: c.brand.purple, borderRadius: 10, paddingVertical: 10, alignItems: "center" }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "white" }}>View & Share</Text>
                </Pressable>
                <Pressable onPress={dismissBlueprintNudge} style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: c.bg.surface }}>
                  <Text style={{ fontSize: 13, fontWeight: "500", color: c.text.tertiary }}>Later</Text>
                </Pressable>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Daily Rhythm (collapsible) */}
        <DailyRhythmSection
          moodLogged={moodLogged}
          onMoodComplete={() => { setMoodLogged(true); updateStreak(); }}
          moodTrend={moodTrend}
          todaysCheckin={todaysCheckin}
          onSetIntention={async (text, domain, energy) => {
            await setMorningIntention(text, domain, energy);
            await updateStreak();
          }}
          habits={todaysHabits()}
          todayCompletions={todayCompletions}
          isCompletedToday={isCompletedToday}
          onHabitComplete={handleHabitComplete}
          onHabitUncomplete={async (id) => { await uncompleteToday(id); await hapticLight(); }}
          onHabitLongPress={handleHabitLongPress}
          onAddHabit={() => setShowAddHabit(true)}
          onViewAllHabits={() => router.push("/habits")}
        />

        {/* Between Sessions (echoes) */}
        {pendingEchoes.length > 0 && (
          <Animated.View entering={FadeInDown.delay(150).duration(400)} style={{ marginBottom: 24 }}>
            <SectionHeader icon="repeat-outline" label="Between Sessions" />
            {pendingEchoes.map((echo, i) => (
              <EchoCard key={echo.id} echo={echo} index={i} onComplete={markCompleted} onSkip={markSkipped} />
            ))}
          </Animated.View>
        )}

        {/* Progress Snapshot */}
        <ProgressSnapshot
          streak={currentStreak}
          humanScore={latestScore?.composite_score ?? null}
          archetype={archetype}
          level={level}
          moodTrend={moodTrend}
          onHumanScore={() => router.push("/human-score")}
          onGrowth={() => router.push("/(tabs)/growth")}
        />

        {/* Weekly Insight Card Banner */}
        {weeklyInsightCards.length > 0 && (
          <Animated.View entering={FadeInDown.delay(250).duration(400)} style={{ marginBottom: 24 }}>
            <Pressable onPress={() => router.push("/(tabs)/growth")}>
              <LinearGradient
                colors={[c.gradient.start, c.gradient.end]}
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
        {latestInsight && (
          <Animated.View entering={FadeInDown.delay(300).duration(400)} style={{ marginBottom: 24 }}>
            <View style={{ backgroundColor: c.bg.surface, borderRadius: 16, padding: 16, borderLeftWidth: 3, borderLeftColor: c.brand.teal }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                <Ionicons name="bulb-outline" size={16} color={c.brand.gold} style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 12, fontWeight: "600", color: c.text.secondary, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  Weekly Insight
                </Text>
              </View>
              <Text style={{ fontSize: 15, color: c.text.primary, lineHeight: 22 }}>
                {latestInsight.description}
              </Text>
              <Pressable onPress={() => router.push("/(tabs)/growth")} style={{ alignSelf: "flex-end", marginTop: 8 }}>
                <Text style={{ fontSize: 14, color: c.brand.purpleLight, fontWeight: "500" }}>See all insights →</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* Active Goal Spotlight */}
        {activeGoals.length > 0 && (
          <Animated.View entering={FadeInDown.delay(350).duration(400)} style={{ marginBottom: 24 }}>
            <Pressable
              onPress={() => router.push("/(tabs)/growth")}
              style={{ backgroundColor: c.bg.surface, borderRadius: 16, padding: 16, borderLeftWidth: 3, borderLeftColor: c.brand.purple }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                <Ionicons name="flag-outline" size={16} color={c.brand.purpleLight} style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 12, fontWeight: "600", color: c.text.secondary, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  Current Focus
                </Text>
              </View>
              <Text style={{ fontSize: 15, color: c.text.primary, fontWeight: "500" }}>{activeGoals[0].title}</Text>
              {activeGoals[0].description && (
                <Text style={{ fontSize: 13, color: c.text.tertiary, marginTop: 4, lineHeight: 18 }} numberOfLines={2}>
                  {activeGoals[0].description}
                </Text>
              )}
              {activeGoals.length > 1 && (
                <Text style={{ fontSize: 13, color: c.brand.purpleLight, marginTop: 8, fontWeight: "500" }}>
                  +{activeGoals.length - 1} more →
                </Text>
              )}
            </Pressable>
          </Animated.View>
        )}

        {/* Evening Reflection CTA */}
        {new Date().getHours() >= 18 && !todaysCheckin?.day_rating && (
          <Animated.View entering={FadeInDown.delay(350).duration(400)} style={{ marginBottom: 24 }}>
            <Pressable
              onPress={async () => { await hapticLight(); router.push("/evening-reflection"); }}
              style={{
                backgroundColor: c.bg.surface,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: `${c.brand.purpleLight}30`,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: `${c.brand.purpleLight}15`, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                <Ionicons name="moon-outline" size={20} color={c.brand.purpleLight} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, color: c.text.primary, fontWeight: "600" }}>Wind down your day</Text>
                <Text style={{ fontSize: 13, color: c.text.tertiary, marginTop: 2 }}>1-minute reflection to close the loop</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={c.text.tertiary} />
            </Pressable>
          </Animated.View>
        )}

        {/* Quick Actions */}
        <QuickActionsRow
          onBreathe={() => router.push("/sos")}
          onWindDown={() => router.push("/wind-down")}
        />
      </ScrollView>

      <AddHabitModal
        visible={showAddHabit}
        onClose={() => {
          setShowAddHabit(false);
          fetchTodayCompletions();
          useMilestoneStore.getState().checkNewMilestones({ first_habit: true });
        }}
      />
    </SafeAreaView>
  );
}
