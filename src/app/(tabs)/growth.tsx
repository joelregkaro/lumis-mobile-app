import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useMoodStore } from "@/store/mood";
import { useMemoryStore } from "@/store/memory";
import { useGoalStore } from "@/store/goals";
import { useDailyCheckinStore } from "@/store/dailyCheckin";
import { useHabitStore } from "@/store/habits";
import GoalCard from "@/components/goals/GoalCard";
import CreateGoalModal from "@/components/goals/CreateGoalModal";
import MilestoneCelebration from "@/components/celebration/MilestoneCelebration";
import { useMilestoneStore } from "@/store/milestones";
import { useStreakStore } from "@/store/streak";
import { supabase } from "@/lib/supabase";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import type { InsightCard } from "@/types/database";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

const MOOD_COLORS: Record<string, string> = {
  struggling: "#F87171",
  low: "#C084FC",
  neutral: "#A78BFA",
  good: "#34D399",
  great: "#22C55E",
  empty: "#1E1E27",
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
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 4 }}>
        {DAYS.map((d, i) => (
          <Text key={`day-${i}`} style={{ width: 32, textAlign: "center", fontSize: 11, color: "#71717A" }}>{d}</Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={`week-${wi}`} style={{ flexDirection: "row", justifyContent: "space-around" }}>
          {week.map((cell, di) => (
            <View
              key={`cell-${wi}-${di}`}
              style={{
                width: 32,
                height: 32,
                margin: 2,
                borderRadius: 8,
                backgroundColor: cell ? moodColor(cell.score) : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {cell?.score != null && (
                <Text style={{ fontSize: 10, fontWeight: "600", color: "white" }}>{cell.score}</Text>
              )}
            </View>
          ))}
          {week.length < 7 &&
            Array(7 - week.length).fill(null).map((_, i) => (
              <View key={`pad-${wi}-${i}`} style={{ width: 32, height: 32, margin: 2 }} />
            ))}
        </View>
      ))}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 12, gap: 8 }}>
        {[{ color: MOOD_COLORS.struggling, label: "Low" }, { color: MOOD_COLORS.neutral, label: "OK" }, { color: MOOD_COLORS.great, label: "Great" }].map(({ color, label }) => (
          <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
            <Text style={{ fontSize: 11, color: "#71717A" }}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function TrendLine({ moods }: { moods: { date: string; score: number }[] }) {
  if (moods.length < 2) {
    return (
      <View style={{ height: 96, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#1E1E27" }}>
        <Ionicons name="bar-chart-outline" size={24} color="#52525B" />
        <Text style={{ fontSize: 13, color: "#71717A", marginTop: 8 }}>Need more data for trends</Text>
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
      <View style={{ height: 96, flexDirection: "row", alignItems: "flex-end", borderRadius: 12, backgroundColor: "#1E1E27", paddingHorizontal: 4, paddingVertical: 4 }}>
        {scores.slice(-30).map((s, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: `${(s / max) * 100}%` as any,
              backgroundColor: moodColor(s),
              borderRadius: 4,
              marginHorizontal: 1,
              minHeight: 4,
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
        <Text style={{ fontSize: 14, color: "#A1A1AA" }}>
          Avg: <Text style={{ fontWeight: "600", color: "#F4F4F5" }}>{avg.toFixed(1)}</Text>/10
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons
            name={trend >= 0 ? "trending-up" : "trending-down"}
            size={16}
            color={trend >= 0 ? "#34D399" : "#F87171"}
            style={{ marginRight: 4 }}
          />
          <Text style={{ fontSize: 14, fontWeight: "500", color: trend >= 0 ? "#34D399" : "#F87171" }}>
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
  const router = useRouter();
  const { recentMoods, fetchRecentMoods } = useMoodStore();
  const { patterns, fetchPatterns, wrappedCards, fetchWrapped } = useMemoryStore();
  const { goals, completedGoals, fetchGoals, fetchCompletedGoals, updateStatus } = useGoalStore();
  const { pendingCelebration, loadCelebrated, checkNewMilestones, markCelebrated } = useMilestoneStore();
  const { currentStreak, longestStreak, fetchStreak } = useStreakStore();
  const { weekHistory, fetchWeekHistory } = useDailyCheckinStore();
  const { habits, fetchHabits } = useHabitStore();
  const [milestoneStatus, setMilestoneStatus] = useState<Record<string, boolean>>({});
  const [weeklyInsights, setWeeklyInsights] = useState<InsightCard[]>([]);
  const [hasEmotionalType, setHasEmotionalType] = useState(false);
  const [timeRange, setTimeRange] = useState<30 | 90>(30);
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    await loadCelebrated();
    await Promise.all([fetchRecentMoods(timeRange), fetchPatterns(), fetchGoals(), fetchCompletedGoals(), checkMilestonesData(), fetchWrapped(), fetchStreak(), fetchWeeklyInsights(), checkEmotionalType(), fetchWeekHistory(), fetchHabits()]);
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

    const [sessionsRes, patternsRes, goalsRes, moodsRes] = await Promise.all([
      supabase.from("sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("patterns").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("goals").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "completed"),
      supabase.from("mood_entries").select("logged_at").eq("user_id", user.id).order("logged_at", { ascending: false }).limit(7),
    ]);

    const moodDates = (moodsRes.data ?? []).map((m) => new Date(m.logged_at).toISOString().slice(0, 10));
    const uniqueDates = [...new Set(moodDates)];

    const status = {
      first_session: (sessionsRes.count ?? 0) >= 1,
      first_pattern: (patternsRes.count ?? 0) >= 1,
      streak_7: currentStreak >= 7,
      streak_30: currentStreak >= 30,
      streak_100: currentStreak >= 100,
      streak_365: currentStreak >= 365,
      first_goal: (goalsRes.count ?? 0) >= 1,
      sessions_10: (sessionsRes.count ?? 0) >= 10,
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
      .from("insight_cards")
      .select("*")
      .eq("user_id", user.id)
      .eq("card_type", "weekly_insight")
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(5);
    setWeeklyInsights((data as InsightCard[]) ?? []);
  };

  const checkEmotionalType = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { count } = await supabase
      .from("insight_cards")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("card_type", "emotional_type");
    setHasEmotionalType((count ?? 0) > 0);
  };

  const moodData = recentMoods.map((m) => ({ date: m.logged_at, score: m.mood_score }));

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-bg-primary" edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#0D0D12" }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />}
      >
        <Text style={{ fontSize: 28, fontWeight: "700", color: "#F4F4F5", letterSpacing: -0.5, paddingTop: 16, marginBottom: 24 }}>
          Your Progress
        </Text>

        {/* Daily Momentum */}
        {weekHistory.length > 0 && (
          <Animated.View entering={FadeInDown.duration(400)} style={{ backgroundColor: "#16161D", borderRadius: 16, padding: 16, marginBottom: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <Ionicons name="rocket-outline" size={16} color="#2DD4BF" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#A1A1AA", letterSpacing: 0.5, textTransform: "uppercase" }}>
                Daily Momentum
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 24, fontWeight: "800", color: "#2DD4BF" }}>
                  {weekHistory.filter((c) => c.intention_completed).length}/{weekHistory.filter((c) => c.morning_intention).length}
                </Text>
                <Text style={{ fontSize: 11, color: "#71717A", marginTop: 2 }}>Intentions done</Text>
              </View>
              <View style={{ width: 1, backgroundColor: "#27272A" }} />
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 24, fontWeight: "800", color: "#A78BFA" }}>
                  {weekHistory.filter((c) => c.day_rating).length}
                </Text>
                <Text style={{ fontSize: 11, color: "#71717A", marginTop: 2 }}>Days reflected</Text>
              </View>
              <View style={{ width: 1, backgroundColor: "#27272A" }} />
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 24, fontWeight: "800", color: "#FBBF24" }}>
                  {weekHistory.length > 0
                    ? (weekHistory.filter((c) => c.day_rating).reduce((s, c) => s + (c.day_rating ?? 0), 0) / Math.max(weekHistory.filter((c) => c.day_rating).length, 1)).toFixed(1)
                    : "-"}
                </Text>
                <Text style={{ fontSize: 11, color: "#71717A", marginTop: 2 }}>Avg. day rating</Text>
              </View>
            </View>
            {/* Domain distribution */}
            {(() => {
              const domainCounts: Record<string, number> = {};
              weekHistory.forEach((c) => {
                if (c.focus_domain) domainCounts[c.focus_domain] = (domainCounts[c.focus_domain] || 0) + 1;
              });
              const entries = Object.entries(domainCounts).sort((a, b) => b[1] - a[1]);
              if (entries.length === 0) return null;
              return (
                <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#27272A40" }}>
                  <Text style={{ fontSize: 12, color: "#71717A", marginBottom: 8 }}>Focus areas this week</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {entries.map(([domain, count]) => (
                      <View key={domain} style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#1E1E27", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                        <Text style={{ fontSize: 12, color: "#A1A1AA" }}>{domain.replace(/_/g, " ")}</Text>
                        <Text style={{ fontSize: 12, color: "#A78BFA", fontWeight: "700", marginLeft: 4 }}>×{count}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })()}
          </Animated.View>
        )}

        {/* Habit Tracker */}
        {habits.filter((h) => h.status === "active").length > 0 && (
          <Animated.View entering={FadeInDown.duration(400)} style={{ backgroundColor: "#16161D", borderRadius: 16, padding: 16, marginBottom: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
              <Ionicons name="refresh-outline" size={16} color="#2DD4BF" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#A1A1AA", letterSpacing: 0.5, textTransform: "uppercase" }}>
                Habits
              </Text>
            </View>
            {habits.filter((h) => h.status === "active").map((habit) => (
              <View key={habit.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: "#27272A40" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "500", color: "#F4F4F5" }}>{habit.title}</Text>
                  <Text style={{ fontSize: 12, color: "#71717A", marginTop: 2 }}>
                    {habit.frequency}{habit.preferred_time ? ` · ${habit.preferred_time}` : ""}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons
                      name="flame"
                      size={14}
                      color={habit.current_streak >= 7 ? "#FBBF24" : habit.current_streak > 0 ? "#F8717180" : "#27272A"}
                    />
                    <Text style={{
                      fontSize: 16,
                      fontWeight: "800",
                      color: habit.current_streak >= 7 ? "#FBBF24" : habit.current_streak > 0 ? "#F4F4F5" : "#52525B",
                      marginLeft: 4,
                    }}>
                      {habit.current_streak}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 10, color: "#52525B", marginTop: 1 }}>
                    best: {habit.longest_streak} · total: {habit.total_completions}
                  </Text>
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Discover Your Type Banner */}
        <Animated.View entering={FadeInDown.duration(400)} style={{ marginBottom: 20 }}>
          <Pressable
            onPress={() => { hapticLight(); router.push("/emotional-type"); }}
            accessibilityLabel={hasEmotionalType ? "View your emotional type" : "Discover your emotional type"}
          >
            <LinearGradient
              colors={["#7C3AED", "#FBBF24"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center" }}
            >
              <Text style={{ fontSize: 28, marginRight: 12 }}>🔮</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "white" }}>
                  {hasEmotionalType ? "View Your Emotional Type" : "Discover Your Type"}
                </Text>
                <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
                  {hasEmotionalType ? "See your emotional archetype" : "Find out your emotional archetype"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Monthly Wrapped Banner */}
        {wrappedCards.length > 0 && (
          <Animated.View entering={FadeInDown.duration(400)} style={{ marginBottom: 20 }}>
            <Pressable
              onPress={() => { hapticLight(); router.push("/wrapped"); }}
              accessibilityLabel="View your Monthly Wrapped"
              accessibilityRole="button"
            >
              <LinearGradient
                colors={["#7C3AED", "#2DD4BF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center" }}
              >
                <Ionicons name="sparkles" size={24} color="white" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "white" }}>
                    Your Monthly Wrapped is ready
                  </Text>
                  <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
                    See your progress highlights
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}

        {/* Weekly Insights */}
        {weeklyInsights.length > 0 && (
          <Animated.View entering={FadeInDown.duration(400)} style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <Ionicons name="bulb-outline" size={16} color="#FBBF24" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#A1A1AA", letterSpacing: 0.5, textTransform: "uppercase" }}>
                This Week's Insights
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {weeklyInsights.map((card, i) => (
                <LinearGradient
                  key={card.id}
                  colors={[["#6D28D9", "#14B8A6"], ["#8B5CF6", "#34D399"], ["#6366F1", "#2DD4BF"]][i % 3] as [string, string]}
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

        {/* Wellbeing Trend */}
        <Animated.View entering={FadeInDown.duration(400)} style={{ backgroundColor: "#16161D", borderRadius: 16, padding: 16, marginBottom: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#A1A1AA", letterSpacing: 0.5, textTransform: "uppercase" }}>
              Wellbeing Trend
            </Text>
            <View style={{ flexDirection: "row", backgroundColor: "#1E1E27", borderRadius: 8, padding: 2 }}>
              {([30, 90] as const).map((range) => (
                <Pressable
                  key={range}
                  onPress={() => setTimeRange(range)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 6,
                    backgroundColor: timeRange === range ? "#8B5CF620" : "transparent",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "500", color: timeRange === range ? "#A78BFA" : "#71717A" }}>
                    {range}d
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <TrendLine moods={moodData} />
          <Text style={{ fontSize: 12, color: "#52525B", marginTop: 10 }}>
            {recentMoods.length} of {timeRange} days checked in
          </Text>
        </Animated.View>

        {/* Mood Calendar */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={{ backgroundColor: "#16161D", borderRadius: 16, padding: 16, marginBottom: 20 }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: "#A1A1AA", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 12 }}>
            Mood Calendar
          </Text>
          <MoodHeatMap moods={moodData} />
        </Animated.View>

        {/* Goals */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="flag-outline" size={16} color="#A1A1AA" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#A1A1AA", letterSpacing: 0.5, textTransform: "uppercase" }}>
                Active Goals
              </Text>
            </View>
            <Pressable
              onPress={() => { setShowCreateGoal(true); hapticLight(); }}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#8B5CF620", alignItems: "center", justifyContent: "center" }}
              accessibilityLabel="Create goal"
            >
              <Ionicons name="add" size={18} color="#A78BFA" />
            </Pressable>
          </View>
          {goals.length > 0 ? (
            goals.map((goal, i) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                index={i}
                onComplete={(id) => { updateStatus(id, "completed"); hapticSuccess(); }}
                onPause={(id) => updateStatus(id, "paused")}
              />
            ))
          ) : (
            <View style={{ backgroundColor: "#16161D", borderRadius: 16, padding: 20, alignItems: "center" }}>
              <Ionicons name="flag-outline" size={28} color="#52525B" />
              <Text style={{ fontSize: 14, color: "#71717A", textAlign: "center", marginTop: 8 }}>
                Goals are extracted from your conversations. Start chatting to set goals.
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <Animated.View entering={FadeInDown.delay(250).duration(400)} style={{ marginBottom: 20 }}>
            <Pressable
              onPress={() => setShowCompleted(!showCompleted)}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: showCompleted ? 12 : 0 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="checkmark-done-outline" size={16} color="#2DD4BF" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#A1A1AA", letterSpacing: 0.5, textTransform: "uppercase" }}>
                  Completed ({completedGoals.length})
                </Text>
              </View>
              <Ionicons name={showCompleted ? "chevron-up" : "chevron-down"} size={16} color="#71717A" />
            </Pressable>
            {showCompleted && completedGoals.map((goal, i) => (
              <View key={goal.id} style={{ backgroundColor: "#16161D", borderRadius: 12, padding: 14, marginBottom: 8, opacity: 0.8 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#14B8A620", alignItems: "center", justifyContent: "center", marginRight: 8 }}>
                    <Ionicons name="checkmark" size={12} color="#2DD4BF" />
                  </View>
                  <Text style={{ flex: 1, fontSize: 14, color: "#A1A1AA", textDecorationLine: "line-through" }}>
                    {goal.title}
                  </Text>
                </View>
                {goal.completed_at && (
                  <Text style={{ fontSize: 11, color: "#52525B", marginTop: 4, marginLeft: 28 }}>
                    Completed {new Date(goal.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </Text>
                )}
              </View>
            ))}
          </Animated.View>
        )}

        {/* Patterns */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Ionicons name="git-network-outline" size={16} color="#A1A1AA" style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#A1A1AA", letterSpacing: 0.5, textTransform: "uppercase" }}>
              Patterns
            </Text>
          </View>
          {patterns.length > 0 ? (
            patterns.map((p) => (
              <View key={p.id} style={{ backgroundColor: "#16161D", borderRadius: 16, padding: 16, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: "#14B8A6" }}>
                <Text style={{ fontSize: 15, color: "#F4F4F5", lineHeight: 22 }}>{p.description}</Text>
                <Text style={{ fontSize: 12, color: "#52525B", marginTop: 6 }}>
                  {p.pattern_type.replace(/_/g, " ")} · {new Date(p.detected_at).toLocaleDateString()}
                </Text>
              </View>
            ))
          ) : (
            <View style={{ backgroundColor: "#16161D", borderRadius: 16, padding: 20, alignItems: "center" }}>
              <Ionicons name="git-network-outline" size={28} color="#52525B" />
              <Text style={{ fontSize: 14, color: "#71717A", textAlign: "center", marginTop: 8 }}>
                Patterns are detected weekly from your sessions. Keep checking in!
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Milestones */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)} style={{ backgroundColor: "#16161D", borderRadius: 16, padding: 16, marginBottom: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Ionicons name="sparkles-outline" size={16} color="#FBBF24" style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#A1A1AA", letterSpacing: 0.5, textTransform: "uppercase" }}>
              Milestones
            </Text>
          </View>
          {MILESTONES.map((milestone) => {
            const done = milestoneStatus[milestone.key] ?? false;
            return (
              <View key={milestone.key} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: milestone.key !== "sessions_10" ? 0.5 : 0, borderBottomColor: "#27272A" }}>
                <View style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: done ? "#8B5CF620" : "#1E1E27",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}>
                  <Ionicons name={milestone.icon as any} size={16} color={done ? "#A78BFA" : "#52525B"} />
                </View>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: done ? "500" : "400", color: done ? "#F4F4F5" : "#71717A" }}>
                  {milestone.label}
                </Text>
                {done && <Ionicons name="checkmark-circle" size={18} color="#34D399" />}
              </View>
            );
          })}
        </Animated.View>
      </ScrollView>

      <CreateGoalModal visible={showCreateGoal} onClose={() => setShowCreateGoal(false)} />

      {pendingCelebration && (
        <MilestoneCelebration
          milestoneKey={pendingCelebration}
          onDismiss={() => markCelebrated(pendingCelebration)}
        />
      )}
    </SafeAreaView>
  );
}
