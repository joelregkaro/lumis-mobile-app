import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl, Share } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useMoodStore } from "@/store/mood";
import { useMemoryStore } from "@/store/memory";
import { useGoalStore } from "@/store/goals";
import { useDailyCheckinStore } from "@/store/dailyCheckin";
import { useHabitStore } from "@/store/habits";
import GoalCard from "@/components/goals/GoalCard";
import GoalDetailSheet from "@/components/goals/GoalDetailSheet";
import CreateGoalModal from "@/components/goals/CreateGoalModal";
import MilestoneCelebration from "@/components/celebration/MilestoneCelebration";
import { LoadingScreen, SectionHeader, EmptyState } from "@/components/ui";
import { useMilestoneStore } from "@/store/milestones";
import { useStreakStore } from "@/store/streak";
import { useHumanScoreStore, getTier } from "@/store/humanScore";
import { supabase } from "@/lib/supabase";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { screen } from "@/lib/analytics";
import { colors } from "@/constants/theme";
import type { Goal, InsightCard } from "@/types/database";

const c = colors.dark;

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

const MOOD_COLORS: Record<string, string> = {
  struggling: "#F87171",
  low: "#C084FC",
  neutral: "#A78BFA",
  good: "#34D399",
  great: "#22C55E",
  empty: c.bg.surface,
};

function moodColor(score: number | null): string {
  if (score === null) return MOOD_COLORS.empty;
  if (score <= 2) return MOOD_COLORS.struggling;
  if (score <= 4) return MOOD_COLORS.low;
  if (score <= 6) return MOOD_COLORS.neutral;
  if (score <= 8) return MOOD_COLORS.good;
  return MOOD_COLORS.great;
}

function MoodHeatMap({ moods }: { moods: { date: string; score: number }[] }) {
  const today = new Date();
  const cells: { date: Date; score: number | null }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const entry = moods.find((m) => m.date.startsWith(key));
    cells.push({ date: d, score: entry?.score ?? null });
  }

  const firstDay = cells[0].date.getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const padded = [...Array(offset).fill(null), ...cells];
  const weeks: (typeof cells[0] | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  const checkedInDays = moods.length;
  const bestScore = moods.length > 0 ? Math.max(...moods.map((m) => m.score)) : 0;

  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 4 }}>
        {DAYS.map((d, i) => (
          <Text key={`day-${i}`} style={{ width: 32, textAlign: "center", fontSize: 11, color: c.text.tertiary }}>{d}</Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={`week-${wi}`} style={{ flexDirection: "row", justifyContent: "space-around" }}>
          {week.map((cell, di) => (
            <View
              key={`cell-${wi}-${di}`}
              style={{
                width: 32, height: 32, margin: 2, borderRadius: 8,
                backgroundColor: cell ? moodColor(cell.score) : "transparent",
                alignItems: "center", justifyContent: "center",
              }}
            >
              {cell?.score != null && (
                <Text style={{ fontSize: 10, fontWeight: "600", color: "white" }}>{cell.score}</Text>
              )}
            </View>
          ))}
          {week.length < 7 && Array(7 - week.length).fill(null).map((_, i) => (
            <View key={`pad-${wi}-${i}`} style={{ width: 32, height: 32, margin: 2 }} />
          ))}
        </View>
      ))}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[{ color: MOOD_COLORS.struggling, label: "Low" }, { color: MOOD_COLORS.neutral, label: "OK" }, { color: MOOD_COLORS.great, label: "Great" }].map(({ color, label }) => (
            <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
              <Text style={{ fontSize: 11, color: c.text.tertiary }}>{label}</Text>
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 11, color: c.text.tertiary }}>
          {checkedInDays} days · best: {bestScore}
        </Text>
      </View>
    </View>
  );
}

function TrendLine({ moods }: { moods: { date: string; score: number }[] }) {
  if (moods.length < 2) {
    return (
      <View style={{ height: 96, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: c.bg.primary }}>
        <Ionicons name="bar-chart-outline" size={24} color={c.text.tertiary} />
        <Text style={{ fontSize: 13, color: c.text.tertiary, marginTop: 8 }}>Need more data for trends</Text>
      </View>
    );
  }

  const scores = moods.map((m) => m.score);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const recent = scores.slice(-7);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const trend = recentAvg - avg;
  const max = Math.max(...scores, 10);

  return (
    <View>
      <View style={{ height: 96, flexDirection: "row", alignItems: "flex-end", borderRadius: 12, backgroundColor: c.bg.primary, paddingHorizontal: 4, paddingVertical: 4 }}>
        {scores.slice(-30).map((s, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: Math.max((s / max) * 88, 4),
              backgroundColor: moodColor(s),
              borderRadius: 4,
              marginHorizontal: 1,
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
        <Text style={{ fontSize: 14, color: c.text.secondary }}>
          Avg: <Text style={{ fontWeight: "600", color: c.text.primary }}>{avg.toFixed(1)}</Text>/10
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons
            name={trend >= 0 ? "trending-up" : "trending-down"}
            size={16}
            color={trend >= 0 ? c.brand.teal : c.status.crisis}
            style={{ marginRight: 4 }}
          />
          <Text style={{ fontSize: 14, fontWeight: "500", color: trend >= 0 ? c.brand.teal : c.status.crisis }}>
            {Math.abs(trend).toFixed(1)} this week
          </Text>
        </View>
      </View>
    </View>
  );
}

const MILESTONES = [
  { label: "First session completed", key: "first_session", icon: "chatbubble" as const },
  { label: "First pattern identified", key: "first_pattern", icon: "grid" as const },
  { label: "7-day check-in streak", key: "streak_7", icon: "flame" as const },
  { label: "30-day streak", key: "streak_30", icon: "flame" as const },
  { label: "100-day streak", key: "streak_100", icon: "flash" as const },
  { label: "First goal completed", key: "first_goal", icon: "flag" as const },
  { label: "10 sessions", key: "sessions_10", icon: "trophy" as const },
];

export default function GrowthScreen() {
  const navigation = useNavigation();
  const { recentMoods, fetchRecentMoods } = useMoodStore();
  const { patterns, fetchPatterns, wrappedCards, fetchWrapped } = useMemoryStore();
  const { goals, completedGoals, milestones, fetchGoals, fetchCompletedGoals, updateStatus } = useGoalStore();
  const { pendingCelebration, loadCelebrated, checkNewMilestones, markCelebrated } = useMilestoneStore();
  const { currentStreak, longestStreak, fetchStreak } = useStreakStore();
  const { weekHistory, fetchWeekHistory } = useDailyCheckinStore();
  const { habits, fetchHabits } = useHabitStore();
  const { latestScore, scoreHistory, level, archetype, fetchLatestScore, fetchScoreHistory } = useHumanScoreStore();
  const [milestoneStatus, setMilestoneStatus] = useState<Record<string, boolean>>({});
  const [weeklyInsights, setWeeklyInsights] = useState<InsightCard[]>([]);
  const [hasEmotionalType, setHasEmotionalType] = useState(false);
  const [timeRange, setTimeRange] = useState<30 | 90>(30);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { screen("growth"); }, []);

  const loadData = useCallback(async () => {
    await loadCelebrated();
    await Promise.all([
      fetchRecentMoods(timeRange), fetchPatterns(), fetchGoals(), fetchCompletedGoals(),
      checkMilestonesData(), fetchWrapped(), fetchStreak(), fetchWeeklyInsights(),
      checkEmotionalType(), fetchWeekHistory(), fetchHabits(), fetchLatestScore(), fetchScoreHistory(12),
    ]);
    setLoading(false);
  }, [timeRange]);

  useEffect(() => { loadData(); }, [timeRange]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const checkMilestonesData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [sessionsRes, patternsRes, goalsRes] = await Promise.all([
      supabase.from("sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("patterns").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("goals").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "completed"),
    ]);
    const maxHabitStreak = habits.reduce((max, h) => Math.max(max, h.current_streak), 0);
    const status: Record<string, boolean> = {
      first_session: (sessionsRes.count ?? 0) >= 1,
      first_pattern: (patternsRes.count ?? 0) >= 1,
      streak_7: currentStreak >= 7, streak_30: currentStreak >= 30,
      streak_100: currentStreak >= 100, streak_365: currentStreak >= 365,
      first_goal: (goalsRes.count ?? 0) >= 1, sessions_10: (sessionsRes.count ?? 0) >= 10,
      first_habit: habits.length > 0, habit_streak_7: maxHabitStreak >= 7,
      habit_streak_14: maxHabitStreak >= 14, habit_streak_21: maxHabitStreak >= 21,
      habit_streak_30: maxHabitStreak >= 30,
    };
    setMilestoneStatus(status);
    checkNewMilestones(status);
  };

  const fetchWeeklyInsights = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data } = await supabase
      .from("insight_cards").select("*").eq("user_id", user.id)
      .eq("card_type", "weekly_insight")
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false }).limit(5);
    setWeeklyInsights((data as InsightCard[]) ?? []);
  };

  const checkEmotionalType = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { count } = await supabase.from("insight_cards")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id).eq("card_type", "emotional_type");
    setHasEmotionalType((count ?? 0) > 0);
  };

  const handleShareGrowth = async () => {
    const completedCount = completedGoals.length;
    const streakText = currentStreak > 0 ? `${currentStreak}-day streak` : "";
    const scoreText = latestScore ? `Human Score: ${latestScore.composite_score}` : "";
    const parts = [streakText, scoreText, completedCount > 0 ? `${completedCount} goals completed` : ""].filter(Boolean);
    await Share.share({
      message: `My growth journey on Lumis:\n${parts.join(" · ")}\n\nLumis — an AI that actually knows you.`,
    });
  };

  const moodData = recentMoods.map((m) => ({ date: m.logged_at, score: m.mood_score }));

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg.primary }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.brand.purple} />}
      >
        <Text style={{ fontSize: 28, fontWeight: "700", color: c.text.primary, letterSpacing: -0.5, paddingTop: 16, marginBottom: 24 }}>
          Your Growth
        </Text>

        {/* HERO: Human Score */}
        <Animated.View entering={FadeInDown.duration(400)} style={{ marginBottom: 20 }}>
          <Pressable onPress={() => navigation.navigate("human-score" as never)}>
            <LinearGradient
              colors={[`${c.brand.purple}25`, `${c.brand.teal}10`, c.bg.surface]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 20, padding: 20, borderWidth: 1, borderColor: `${c.brand.purple}30` }}
            >
              {latestScore ? (
                <View>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={{
                      width: 64, height: 64, borderRadius: 32,
                      borderWidth: 3, borderColor: c.brand.purple,
                      backgroundColor: `${c.brand.purple}15`,
                      alignItems: "center", justifyContent: "center", marginRight: 16,
                    }}>
                      <Text style={{ fontSize: 24, fontWeight: "900", color: c.text.primary }}>
                        {latestScore.composite_score}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 18, fontWeight: "700", color: c.text.primary }}>Human Score</Text>
                      <Text style={{ fontSize: 14, color: c.brand.purpleLight, fontWeight: "600", marginTop: 2 }}>
                        {archetype}
                      </Text>
                      <Text style={{ fontSize: 12, color: c.text.tertiary, marginTop: 2 }}>
                        Level {level} · {getTier(level).name}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={c.brand.purple} />
                  </View>
                  {scoreHistory.length > 1 && (
                    <View style={{ flexDirection: "row", alignItems: "flex-end", height: 36, gap: 3, marginTop: 16 }}>
                      {scoreHistory.slice(-12).map((s, i) => {
                        const maxScore = Math.max(...scoreHistory.map(h => h.composite_score), 1);
                        const h = (s.composite_score / maxScore) * 32;
                        const isLatest = i === scoreHistory.slice(-12).length - 1;
                        return (
                          <View key={s.period_start} style={{
                            flex: 1, height: Math.max(h, 4), borderRadius: 3,
                            backgroundColor: isLatest ? c.brand.purple : `${c.brand.purple}40`,
                          }} />
                        );
                      })}
                    </View>
                  )}
                </View>
              ) : (
                <View style={{ alignItems: "center", paddingVertical: 16 }}>
                  <Ionicons name="analytics-outline" size={32} color={c.brand.purple} />
                  <Text style={{ fontSize: 16, fontWeight: "600", color: c.text.primary, marginTop: 8 }}>
                    Discover your Human Score
                  </Text>
                  <Text style={{ fontSize: 13, color: c.text.secondary, marginTop: 4 }}>
                    Based on real behavior, not surveys
                  </Text>
                </View>
              )}
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Self-Discovery Section */}
        <Animated.View entering={FadeInDown.duration(400)} style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
          <Pressable
            onPress={() => { hapticLight(); navigation.navigate("emotional-type" as never); }}
            style={{ flex: 1, backgroundColor: c.bg.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.bg.border }}
          >
            <Text style={{ fontSize: 24, marginBottom: 8 }}>🔮</Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: c.text.primary }}>
              {hasEmotionalType ? "Your Type" : "Emotional Type"}
            </Text>
            <Text style={{ fontSize: 12, color: c.text.tertiary, marginTop: 2 }}>Discover your archetype</Text>
          </Pressable>
          <Pressable
            onPress={() => { hapticLight(); navigation.navigate("life-wheel" as never); }}
            style={{ flex: 1, backgroundColor: c.bg.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.bg.border }}
          >
            <Text style={{ fontSize: 24, marginBottom: 8 }}>🎯</Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: c.text.primary }}>Life Wheel</Text>
            <Text style={{ fontSize: 12, color: c.text.tertiary, marginTop: 2 }}>See your balance</Text>
          </Pressable>
        </Animated.View>

        {/* Weekly Insights */}
        {weeklyInsights.length > 0 && (
          <Animated.View entering={FadeInDown.duration(400)} style={{ marginBottom: 20 }}>
            <SectionHeader icon="bulb-outline" iconColor={c.brand.gold} label="This Week's Insights" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {weeklyInsights.map((card, i) => (
                <LinearGradient
                  key={card.id}
                  colors={[[c.gradient.start, c.gradient.end], ["#8B5CF6", "#34D399"], ["#6366F1", c.brand.teal]][i % 3] as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ borderRadius: 16, padding: 20, width: 260, minHeight: 140, justifyContent: "center" }}
                >
                  {card.stat_value && (
                    <Text style={{ fontSize: 32, fontWeight: "800", color: "white", marginBottom: 4 }}>{card.stat_value}</Text>
                  )}
                  {card.stat_label && (
                    <Text style={{ fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{card.stat_label}</Text>
                  )}
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "white" }}>{card.title}</Text>
                  <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4, lineHeight: 18 }}>{card.body}</Text>
                </LinearGradient>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Monthly Wrapped — Prominent CTA */}
        {wrappedCards.length > 0 && (
          <Animated.View entering={FadeInDown.duration(400)} style={{ marginBottom: 20 }}>
            <Pressable onPress={() => { hapticLight(); navigation.navigate("wrapped" as never); }}>
              <LinearGradient
                colors={["#7C3AED", "#2DD4BF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 20, padding: 20, overflow: "hidden" }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                    <Ionicons name="sparkles" size={20} color="white" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={{ fontSize: 18, fontWeight: "800", color: "white" }}>
                        Your {new Date().toLocaleDateString("en-US", { month: "long" })} Wrapped
                      </Text>
                      <View style={{ marginLeft: 8, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: "white" }}>NEW</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
                      {wrappedCards.length} cards · Tap to view your story
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.8)" />
                </View>
                <View style={{ flexDirection: "row", gap: 4 }}>
                  {wrappedCards.slice(0, 6).map((_, i) => (
                    <View key={i} style={{ flex: 1, height: 3, borderRadius: 1.5, backgroundColor: "rgba(255,255,255,0.35)" }} />
                  ))}
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}

        {/* Wellbeing Trend */}
        <Animated.View entering={FadeInDown.duration(400)} style={{ backgroundColor: c.bg.surface, borderRadius: 16, padding: 16, marginBottom: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: c.text.secondary, letterSpacing: 0.5, textTransform: "uppercase" }}>
              Wellbeing Trend
            </Text>
            <View style={{ flexDirection: "row", backgroundColor: c.bg.primary, borderRadius: 8, padding: 2 }}>
              {([30, 90] as const).map((range) => (
                <Pressable
                  key={range}
                  onPress={() => setTimeRange(range)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6,
                    backgroundColor: timeRange === range ? `${c.brand.purple}20` : "transparent",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "500", color: timeRange === range ? c.brand.purpleLight : c.text.tertiary }}>
                    {range}d
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <TrendLine moods={moodData} />
        </Animated.View>

        {/* Mood Calendar */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={{ backgroundColor: c.bg.surface, borderRadius: 16, padding: 16, marginBottom: 20 }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: c.text.secondary, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 12 }}>
            Mood Calendar
          </Text>
          <MoodHeatMap moods={moodData} />
        </Animated.View>

        {/* Goals with progress indication */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)} style={{ marginBottom: 20 }}>
          <SectionHeader
            icon="flag-outline"
            label="Goals"
            rightElement={
              <Pressable
                onPress={() => { setShowCreateGoal(true); hapticLight(); }}
                style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: `${c.brand.purple}20`, alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="add" size={16} color={c.brand.purpleLight} />
              </Pressable>
            }
          />
          {(() => {
            const allMs = Object.values(milestones).flat();
            const doneMs = allMs.filter((m) => m.is_completed).length;
            if (allMs.length === 0) return null;
            return (
              <Text style={{ fontSize: 12, color: c.text.tertiary, marginBottom: 8, marginTop: -4 }}>
                {doneMs}/{allMs.length} milestones completed
              </Text>
            );
          })()}
          {goals.length > 0 ? (
            goals.map((goal, i) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                index={i}
                onPress={(g) => setSelectedGoal(g)}
              />
            ))
          ) : (
            <EmptyState
              icon="flag-outline"
              title="No goals yet"
              subtitle="Goals emerge from your conversations. Start chatting to set goals."
            />
          )}
        </Animated.View>

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={{ marginBottom: 20 }}>
            <Pressable
              onPress={() => setShowCompleted(!showCompleted)}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: showCompleted ? 12 : 0 }}
            >
              <SectionHeader icon="checkmark-done-outline" iconColor={c.brand.teal} label={`Completed (${completedGoals.length})`} />
              <Ionicons name={showCompleted ? "chevron-up" : "chevron-down"} size={16} color={c.text.tertiary} />
            </Pressable>
            {showCompleted && completedGoals.map((goal) => (
              <View key={goal.id} style={{ backgroundColor: c.bg.surface, borderRadius: 12, padding: 14, marginBottom: 8, opacity: 0.8 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: `${c.brand.teal}20`, alignItems: "center", justifyContent: "center", marginRight: 8 }}>
                    <Ionicons name="checkmark" size={12} color={c.brand.teal} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 14, color: c.text.secondary, textDecorationLine: "line-through" }}>
                    {goal.title}
                  </Text>
                </View>
                {goal.completed_at && (
                  <Text style={{ fontSize: 11, color: c.text.tertiary, marginTop: 4, marginLeft: 28 }}>
                    Completed {new Date(goal.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </Text>
                )}
              </View>
            ))}
          </Animated.View>
        )}

        {/* Patterns with "You tend to..." language */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)} style={{ marginBottom: 20 }}>
          <SectionHeader icon="git-network-outline" label="Patterns" />
          {patterns.length > 0 ? (
            patterns.map((p) => (
              <View key={p.id} style={{ backgroundColor: c.bg.surface, borderRadius: 16, padding: 16, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: c.brand.teal }}>
                <Text style={{ fontSize: 15, color: c.text.primary, lineHeight: 22 }}>
                  {p.description.startsWith("You") ? p.description : `You tend to ${p.description.toLowerCase()}`}
                </Text>
                <Text style={{ fontSize: 12, color: c.text.tertiary, marginTop: 6 }}>
                  {p.pattern_type.replace(/_/g, " ")} · {new Date(p.detected_at).toLocaleDateString()}
                </Text>
              </View>
            ))
          ) : (
            <EmptyState
              icon="git-network-outline"
              title="No patterns yet"
              subtitle="Patterns are detected weekly from your sessions. Keep checking in!"
            />
          )}
        </Animated.View>

        {/* Milestones */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={{ backgroundColor: c.bg.surface, borderRadius: 16, padding: 16, marginBottom: 20 }}>
          <SectionHeader icon="sparkles-outline" iconColor={c.brand.gold} label="Milestones" />
          {MILESTONES.map((milestone, i) => {
            const done = milestoneStatus[milestone.key] ?? false;
            return (
              <View key={milestone.key} style={{
                flexDirection: "row", alignItems: "center", paddingVertical: 10,
                borderBottomWidth: i < MILESTONES.length - 1 ? 0.5 : 0, borderBottomColor: c.bg.border,
              }}>
                <View style={{
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: done ? `${c.brand.purple}20` : c.bg.primary,
                  alignItems: "center", justifyContent: "center", marginRight: 12,
                }}>
                  <Ionicons name={milestone.icon as any} size={16} color={done ? c.brand.purpleLight : c.text.tertiary} />
                </View>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: done ? "500" : "400", color: done ? c.text.primary : c.text.tertiary }}>
                  {milestone.label}
                </Text>
                {done && <Ionicons name="checkmark-circle" size={18} color={c.brand.teal} />}
              </View>
            );
          })}
        </Animated.View>

        {/* Share Your Growth CTA */}
        <Animated.View entering={FadeInDown.delay(350).duration(400)} style={{ marginBottom: 8 }}>
          <Pressable
            onPress={handleShareGrowth}
            style={{
              backgroundColor: c.bg.surface,
              borderRadius: 16,
              padding: 18,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: `${c.brand.purple}30`,
            }}
          >
            <Ionicons name="share-social-outline" size={20} color={c.brand.purpleLight} style={{ marginRight: 10 }} />
            <Text style={{ fontSize: 15, fontWeight: "600", color: c.brand.purpleLight }}>Share Your Growth</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>

      <CreateGoalModal visible={showCreateGoal} onClose={() => setShowCreateGoal(false)} />

      {pendingCelebration && (
        <MilestoneCelebration
          milestoneKey={pendingCelebration}
          onDismiss={() => markCelebrated(pendingCelebration)}
        />
      )}

      <GoalDetailSheet
        goal={selectedGoal}
        visible={!!selectedGoal}
        onClose={() => { setSelectedGoal(null); fetchGoals(); fetchCompletedGoals(); }}
      />
    </SafeAreaView>
  );
}
