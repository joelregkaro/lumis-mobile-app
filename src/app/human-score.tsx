import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, Switch, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import Svg, { Circle as SvgCircle } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import RadarChart from "@/components/humanScore/RadarChart";
import AnimatedNumber from "@/components/humanScore/AnimatedNumber";
import { useHumanScoreStore, getTier, xpForLevel, TIERS, type HumanScore } from "@/store/humanScore";
import { hapticLight } from "@/lib/haptics";
import { track } from "@/lib/analytics";
import { screen } from "@/lib/analytics";

const AnimatedSvgCircle = Animated.createAnimatedComponent(SvgCircle);

const ATTR_META: Record<string, { icon: string; color: string; desc: string }> = {
  awareness: { icon: "eye-outline", color: "#A78BFA", desc: "How well you know your emotions and patterns" },
  resilience: { icon: "shield-outline", color: "#F87171", desc: "Your ability to bounce back from setbacks" },
  discipline: { icon: "checkmark-done-outline", color: "#2DD4BF", desc: "Following through on your commitments" },
  growth: { icon: "trending-up", color: "#FBBF24", desc: "Active effort toward self-improvement" },
  connection: { icon: "people-outline", color: "#60A5FA", desc: "Quality and depth of your relationships" },
  vitality: { icon: "flash-outline", color: "#34D399", desc: "Physical energy and wellbeing" },
};

const ATTR_KEYS = ["awareness", "resilience", "discipline", "growth", "connection", "vitality"] as const;

const IMPROVEMENT_TIPS: Record<string, Record<string, { low: number; tip: string; action: string }>> = {
  awareness: {
    moodFrequency: { low: 20, tip: "Log your mood daily", action: "/(tabs)/home" },
    patternScore: { low: 10, tip: "Review patterns in your Progress tab", action: "/(tabs)/growth" },
    sessionDepth: { low: 10, tip: "Rate your mood before and after sessions", action: "/(tabs)/chat" },
  },
  discipline: {
    habitCompletionRate: { low: 10, tip: "Complete your daily habits", action: "/(tabs)/home" },
    commitRate: { low: 15, tip: "Follow through on session action items", action: "/(tabs)/home" },
    checkinRate: { low: 10, tip: "Set a morning intention and do evening reflection", action: "/(tabs)/home" },
  },
  connection: {
    relCount: { low: 10, tip: "Talk about people in your life during sessions", action: "/(tabs)/chat" },
    sentimentScore: { low: 15, tip: "Explore positive relationships in therapy", action: "/(tabs)/chat" },
  },
  growth: {
    goalScore: { low: 10, tip: "Set an active goal to work toward", action: "/(tabs)/growth" },
    sessionFreq: { low: 15, tip: "Have 3+ sessions per week", action: "/(tabs)/chat" },
  },
  resilience: {
    streakResilience: { low: 10, tip: "Keep your daily check-in streak going", action: "/(tabs)/home" },
    recoveryScore: { low: 15, tip: "Log moods after difficult days to track recovery", action: "/(tabs)/home" },
  },
  vitality: {
    energyScore: { low: 15, tip: "Track your energy level with mood check-ins", action: "/(tabs)/home" },
    sleepScore: { low: 10, tip: "Rate your sleep quality when logging mood", action: "/(tabs)/home" },
  },
};

const TIER_ICONS = ["🌱", "🌿", "🌸", "🌳", "🌲", "⛰️", "🌌"];

function getScoreColor(score: number): string {
  if (score < 30) return "#F87171";
  if (score < 60) return "#FBBF24";
  if (score < 80) return "#2DD4BF";
  return "#A78BFA";
}

function getImprovementTips(
  score: HumanScore,
): { attr: string; tip: string; action: string }[] {
  const sorted = ATTR_KEYS.slice().sort((a, b) => score[a] - score[b]);
  const weakest = sorted.slice(0, 3);
  const tips: { attr: string; tip: string; action: string }[] = [];

  for (const attr of weakest) {
    const breakdown = score.score_breakdown?.[attr];
    const tipMap = IMPROVEMENT_TIPS[attr];
    if (!breakdown || !tipMap) continue;

    const entries = Object.entries(breakdown).sort(([, a], [, b]) => (a as number) - (b as number));
    for (const [key] of entries) {
      if (tipMap[key]) {
        tips.push({ attr, tip: tipMap[key].tip, action: tipMap[key].action });
        break;
      }
    }
  }
  return tips;
}

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const strokeWidth = 8;
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const color = getScoreColor(score);

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(300, withTiming(score / 100, { duration: 1000, easing: Easing.out(Easing.cubic) }));
  }, [score]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circ * (1 - progress.value),
  }));

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <SvgCircle cx={size / 2} cy={size / 2} r={r} stroke="#242A42" strokeWidth={strokeWidth} fill="none" />
        <AnimatedSvgCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circ}`}
          animatedProps={animatedProps}
          strokeLinecap="round"
        />
      </Svg>
      <AnimatedNumber value={score} duration={1000} delay={300} style={{ fontSize: 32, fontWeight: "900", color }} />
    </View>
  );
}

function AnimatedProgressBar({ value, color, delay: d = 0 }: { value: number; color: string; delay?: number }) {
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = 0;
    width.value = withDelay(d, withTiming(Math.min(value, 100), { duration: 800, easing: Easing.out(Easing.cubic) }));
  }, [value]);

  const style = useAnimatedStyle(() => ({
    width: `${width.value}%`,
    height: 6,
    borderRadius: 3,
    backgroundColor: color,
  }));

  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: "#242A42", flex: 1 }}>
      <Animated.View style={style} />
    </View>
  );
}

function TierRoadmap({ currentLevel }: { currentLevel: number }) {
  const currentTier = getTier(currentLevel);
  const currentIdx = TIERS.findIndex(t => t.name === currentTier.name);

  return (
    <View style={{ paddingHorizontal: 24, marginTop: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        {TIERS.map((tier, i) => {
          const isCurrent = i === currentIdx;
          const isPast = i < currentIdx;
          return (
            <View key={tier.name} style={{ alignItems: "center", flex: 1 }}>
              <View
                style={{
                  width: isCurrent ? 36 : 24,
                  height: isCurrent ? 36 : 24,
                  borderRadius: 18,
                  backgroundColor: isCurrent ? "#7C3AED20" : isPast ? "#2DD4BF15" : "#242A42",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: isCurrent ? 2 : 0,
                  borderColor: isCurrent ? "#7C3AED" : "transparent",
                }}
              >
                <Text style={{ fontSize: isCurrent ? 16 : 12 }}>{TIER_ICONS[i]}</Text>
              </View>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginTop: 6 }}>
        {TIERS.map((tier, i) => {
          const isCurrent = i === currentIdx;
          return (
            <View key={tier.name} style={{ alignItems: "center", flex: 1 }}>
              <Text
                style={{
                  fontSize: 8,
                  fontWeight: isCurrent ? "700" : "500",
                  color: isCurrent ? "#EAEDF3" : "#5A6178",
                  textAlign: "center",
                }}
                numberOfLines={1}
              >
                {tier.name}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={{ fontSize: 13, fontWeight: "600", color: "#EAEDF3", textAlign: "center", marginTop: 10 }}>
        {currentTier.name}
      </Text>
      <Text style={{ fontSize: 12, color: "#8B92A8", textAlign: "center", marginTop: 2 }}>
        {currentTier.subtitle}
      </Text>
      {currentIdx < TIERS.length - 1 && (
        <Text style={{ fontSize: 11, color: "#5A617880", textAlign: "center", marginTop: 6 }}>
          {xpForLevel(TIERS[currentIdx + 1].min).toLocaleString()} XP to reach {TIERS[currentIdx + 1].name}
        </Text>
      )}
    </View>
  );
}

function XpBreakdown({ score }: { score: HumanScore }) {
  const breakdown = score.score_breakdown;
  if (!breakdown) return null;

  const items: { label: string; xp: number; icon: string }[] = [];

  const sessionFreq = breakdown.growth?.sessionFreq;
  if (sessionFreq != null && sessionFreq > 0)
    items.push({ label: "Sessions", xp: Math.round(sessionFreq * 3), icon: "chatbubble-outline" });

  const moodFreq = breakdown.awareness?.moodFrequency;
  if (moodFreq != null && moodFreq > 0)
    items.push({ label: "Mood logs", xp: Math.round(moodFreq * 2.5), icon: "happy-outline" });

  const habitRate = breakdown.discipline?.habitCompletionRate;
  if (habitRate != null && habitRate > 0)
    items.push({ label: "Habit completions", xp: Math.round(habitRate * 2), icon: "checkmark-circle-outline" });

  const streakRes = breakdown.resilience?.streakResilience;
  if (streakRes != null && streakRes > 0)
    items.push({ label: "Streak bonus", xp: Math.round(streakRes * 5), icon: "flame-outline" });

  const checkinRate = breakdown.discipline?.checkinRate;
  if (checkinRate != null && checkinRate > 0)
    items.push({ label: "Daily check-ins", xp: Math.round(checkinRate * 2), icon: "sunny-outline" });

  if (items.length === 0) return null;

  return (
    <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
      <Text style={{ fontSize: 12, fontWeight: "600", color: "#8B92A8", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10, paddingHorizontal: 8 }}>
        This Week's XP
      </Text>
      <View style={{ backgroundColor: "#1A1F35", borderRadius: 14, padding: 16 }}>
        {items.map((item, i) => (
          <View
            key={item.label}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 8,
              borderBottomWidth: i < items.length - 1 ? 0.5 : 0,
              borderBottomColor: "#242A42",
            }}
          >
            <Ionicons name={item.icon as any} size={16} color="#8B92A8" style={{ marginRight: 10 }} />
            <Text style={{ flex: 1, fontSize: 14, color: "#EAEDF3" }}>{item.label}</Text>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#2DD4BF" }}>+{item.xp} XP</Text>
          </View>
        ))}
        <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 8, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: "#242A42" }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#8B92A8" }}>Total: </Text>
          <Text style={{ fontSize: 13, fontWeight: "800", color: "#EAEDF3" }}>
            +{score.xp_earned_this_period} XP
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function HumanScoreScreen() {
  const navigation = useNavigation();
  const {
    latestScore, previousScore, totalXp, level, archetype, leagueOptedIn,
    leagueStanding, leaguePeers, isLoading,
    fetchLatestScore, fetchLeagueStanding, fetchLeaguePeers,
    toggleLeague, triggerCompute,
  } = useHumanScoreStore();

  const [refreshing, setRefreshing] = useState(false);
  const [computing, setComputing] = useState(false);
  const [expandedAttr, setExpandedAttr] = useState<string | null>(null);

  useEffect(() => { screen("human_score"); }, []);

  const loadAll = useCallback(async () => {
    await fetchLatestScore();
    await fetchLeagueStanding();
    await fetchLeaguePeers();
  }, []);

  useEffect(() => {
    track("human_score_viewed", { level, total_xp: totalXp });
    loadAll().then(() => {
      const { latestScore } = useHumanScoreStore.getState();
      if (!latestScore) {
        setComputing(true);
        triggerCompute()
          .then(() => fetchLeagueStanding())
          .finally(() => setComputing(false));
      }
    });
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const handleCompute = async () => {
    setComputing(true);
    await hapticLight();
    await triggerCompute();
    await fetchLeagueStanding();
    setComputing(false);
  };

  const tier = getTier(level);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const xpProgress = totalXp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  const progressPct = xpNeeded > 0 ? Math.min(xpProgress / xpNeeded, 1) : 1;

  const score = latestScore;
  const prev = previousScore;

  const radarScores = ATTR_KEYS.map(k => ({
    label: k.charAt(0).toUpperCase() + k.slice(1),
    value: score?.[k] ?? 0,
    color: ATTR_META[k].color,
  }));

  const prevRadar = prev ? ATTR_KEYS.map(k => prev[k]) : undefined;

  const tips = score ? getImprovementTips(score) : [];

  const attrValues = score ? ATTR_KEYS.map(k => ({ key: k, val: score[k] })) : [];
  const strongest = attrValues.length > 0 ? attrValues.reduce((a, b) => (a.val >= b.val ? a : b)).key : null;
  const weakest = attrValues.length > 0 ? attrValues.reduce((a, b) => (a.val <= b.val ? a : b)).key : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0C1120" }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12 }}>
        <Pressable onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="close" size={24} color="#8B92A8" />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", color: "#EAEDF3" }}>
          Human Score
        </Text>
        <Pressable onPress={() => navigation.navigate("human-score-share" as never)} style={{ padding: 8 }}>
          <Ionicons name="share-outline" size={22} color="#8B92A8" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />}
      >
        {isLoading && !score ? (
          <View style={{ padding: 60, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#7C3AED" />
          </View>
        ) : !score ? (
          <Animated.View entering={FadeIn.duration(400)} style={{ padding: 24, alignItems: "center" }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#7C3AED15", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <Ionicons name="analytics-outline" size={36} color="#7C3AED" />
            </View>
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#EAEDF3", marginBottom: 8 }}>
              Discover Your Human Score
            </Text>
            <Text style={{ fontSize: 15, color: "#8B92A8", textAlign: "center", lineHeight: 22, marginBottom: 28 }}>
              Your score is computed from real behavior — moods, sessions, habits, and commitments. No quizzes, just truth.
            </Text>
            <Pressable
              onPress={handleCompute}
              disabled={computing}
              style={{ borderRadius: 14, overflow: "hidden", width: "100%" }}
            >
              <LinearGradient colors={["#7C3AED", "#2DD4BF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 16, alignItems: "center", borderRadius: 14 }}>
                {computing ? (
                  <ActivityIndicator color="#EAEDF3" />
                ) : (
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#EAEDF3" }}>Compute My Score</Text>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>
        ) : (
          <>
            {/* Hero Score Ring */}
            <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: "center", paddingTop: 20, paddingBottom: 8 }}>
              <ScoreRing score={score.composite_score} size={140} />
              <Text style={{ fontSize: 14, fontWeight: "700", color: getScoreColor(score.composite_score), marginTop: 14, letterSpacing: 1.5, textTransform: "uppercase" }}>
                {score.archetype}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                <Text style={{ fontSize: 13, color: "#8B92A8" }}>Level {level}</Text>
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "#5A6178", marginHorizontal: 8 }} />
                <Text style={{ fontSize: 13, color: "#8B92A8" }}>{tier.name}</Text>
              </View>
              {prev && (
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                  <Ionicons
                    name={score.composite_score > prev.composite_score ? "arrow-up" : score.composite_score < prev.composite_score ? "arrow-down" : "remove"}
                    size={14}
                    color={score.composite_score >= prev.composite_score ? "#2DD4BF" : "#F87171"}
                  />
                  <Text style={{ fontSize: 12, color: score.composite_score >= prev.composite_score ? "#2DD4BF" : "#F87171", marginLeft: 4 }}>
                    {Math.abs(score.composite_score - prev.composite_score)} pts vs last week
                  </Text>
                </View>
              )}
            </Animated.View>

            {/* XP Bar */}
            <Animated.View entering={FadeInDown.delay(100).duration(400)} style={{ paddingHorizontal: 24, marginTop: 16, marginBottom: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#8B92A8" }}>
                  {totalXp.toLocaleString()} XP
                </Text>
                <Text style={{ fontSize: 12, color: "#5A6178" }}>
                  {nextLevelXp.toLocaleString()} XP for Level {level + 1}
                </Text>
              </View>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: "#242A42" }}>
                <LinearGradient
                  colors={["#7C3AED", "#2DD4BF"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ height: 8, borderRadius: 4, width: `${progressPct * 100}%` as any }}
                />
              </View>
              <Text style={{ fontSize: 11, color: "#5A6178", marginTop: 4 }}>
                +{score.xp_earned_this_period} XP this week
              </Text>
            </Animated.View>

            {/* Tier Roadmap */}
            <Animated.View entering={FadeInDown.delay(150).duration(400)}>
              <TierRoadmap currentLevel={level} />
            </Animated.View>

            {/* Radar Chart */}
            <Animated.View entering={FadeInDown.delay(250).duration(400)} style={{ alignItems: "center", marginTop: 20 }}>
              <RadarChart scores={radarScores} previousScores={prevRadar} />
              {prev && (
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                  <View style={{ width: 12, height: 2, backgroundColor: "#5A6178", marginRight: 6 }} />
                  <Text style={{ fontSize: 11, color: "#5A6178" }}>Last week</Text>
                  <View style={{ width: 12, height: 2, backgroundColor: "#7C3AED", marginLeft: 16, marginRight: 6 }} />
                  <Text style={{ fontSize: 11, color: "#5A6178" }}>This week</Text>
                </View>
              )}
            </Animated.View>

            {/* Attribute Cards */}
            <Animated.View entering={FadeInDown.delay(350).duration(400)} style={{ paddingHorizontal: 16, marginTop: 20 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#8B92A8", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 12, paddingHorizontal: 8 }}>
                Your Attributes
              </Text>
              {ATTR_KEYS.map((key, idx) => {
                const meta = ATTR_META[key];
                const val = score[key];
                const prevVal = prev?.[key];
                const delta = prevVal != null ? val - prevVal : null;
                const expanded = expandedAttr === key;
                const breakdown = score.score_breakdown?.[key];
                const isStrongest = key === strongest;
                const isWeakest = key === weakest;
                const tipForAttr = tips.find(t => t.attr === key);

                return (
                  <Pressable
                    key={key}
                    onPress={() => { hapticLight(); setExpandedAttr(expanded ? null : key); }}
                    style={{
                      backgroundColor: "#1A1F35",
                      borderRadius: 14,
                      padding: 16,
                      marginBottom: 10,
                      borderWidth: expanded ? 1 : 0,
                      borderColor: meta.color + "40",
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: meta.color + "15", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                        <Ionicons name={meta.icon as any} size={18} color={meta.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <Text style={{ fontSize: 14, fontWeight: "600", color: "#EAEDF3", textTransform: "capitalize" }}>
                            {key}
                          </Text>
                          {isStrongest && (
                            <View style={{ marginLeft: 8, backgroundColor: "#2DD4BF20", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ fontSize: 9, fontWeight: "700", color: "#2DD4BF" }}>STRONGEST</Text>
                            </View>
                          )}
                          {isWeakest && (
                            <View style={{ marginLeft: 8, backgroundColor: "#FBBF2420", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ fontSize: 9, fontWeight: "700", color: "#FBBF24" }}>FOCUS AREA</Text>
                            </View>
                          )}
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 8 }}>
                          <AnimatedProgressBar value={val} color={meta.color} delay={400 + idx * 60} />
                          <Text style={{ fontSize: 12, fontWeight: "700", color: meta.color, width: 28, textAlign: "right" }}>
                            {val}
                          </Text>
                        </View>
                      </View>
                      <View style={{ alignItems: "flex-end", marginLeft: 8 }}>
                        {delta != null && delta !== 0 && (
                          <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <Ionicons
                              name={delta > 0 ? "arrow-up" : "arrow-down"}
                              size={12}
                              color={delta > 0 ? "#2DD4BF" : "#F87171"}
                            />
                            <Text style={{ fontSize: 11, color: delta > 0 ? "#2DD4BF" : "#F87171", marginLeft: 2 }}>
                              {Math.abs(delta)}
                            </Text>
                          </View>
                        )}
                        <Ionicons
                          name={expanded ? "chevron-up" : "chevron-down"}
                          size={14}
                          color="#5A6178"
                          style={{ marginTop: 4 }}
                        />
                      </View>
                    </View>

                    {expanded && (
                      <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: "#242A42" }}>
                        <Text style={{ fontSize: 12, color: "#5A6178", marginBottom: 8 }}>{meta.desc}</Text>

                        {breakdown && (
                          <View style={{ marginBottom: tipForAttr ? 10 : 0 }}>
                            {Object.entries(breakdown).map(([bk, bv]) => (
                              <View key={bk} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                                <Text style={{ fontSize: 12, color: "#8B92A8", textTransform: "capitalize" }}>
                                  {bk.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}
                                </Text>
                                <Text style={{ fontSize: 12, fontWeight: "600", color: "#EAEDF3" }}>
                                  {Math.round(bv as number)}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}

                        {tipForAttr && (
                          <Pressable
                            onPress={() => {
                              const a = tipForAttr.action as string;
                              if (a.startsWith("/(tabs)/")) {
                                navigation.navigate("Tabs" as never, { screen: a.replace("/(tabs)/", "") as "home" | "chat" | "journal" | "growth" | "me" });
                              } else {
                                navigation.navigate(a.replace(/^\//, "") as never);
                              }
                            }}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              backgroundColor: meta.color + "10",
                              borderRadius: 10,
                              padding: 12,
                              marginTop: 4,
                            }}
                          >
                            <Ionicons name="bulb-outline" size={16} color={meta.color} style={{ marginRight: 8 }} />
                            <Text style={{ flex: 1, fontSize: 13, color: "#EAEDF3" }}>{tipForAttr.tip}</Text>
                            <Ionicons name="arrow-forward" size={14} color={meta.color} />
                          </Pressable>
                        )}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </Animated.View>

            {/* XP Breakdown */}
            <Animated.View entering={FadeInDown.delay(450).duration(400)}>
              <XpBreakdown score={score} />
            </Animated.View>

            {/* League Section */}
            <Animated.View entering={FadeInDown.delay(500).duration(400)} style={{ paddingHorizontal: 16, marginTop: 20 }}>
              <View style={{ backgroundColor: "#1A1F35", borderRadius: 14, padding: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="trophy-outline" size={18} color="#FBBF24" style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#EAEDF3" }}>Leagues</Text>
                  </View>
                  <Switch
                    value={leagueOptedIn}
                    onValueChange={(v) => toggleLeague(v)}
                    trackColor={{ false: "#242A42", true: "#7C3AED40" }}
                    thumbColor={leagueOptedIn ? "#7C3AED" : "#5A6178"}
                  />
                </View>
                {leagueOptedIn ? (
                  <>
                    {leagueStanding ? (
                      <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 12 }}>
                        <View style={{ alignItems: "center" }}>
                          <Text style={{ fontSize: 22, fontWeight: "900", color: "#F5C542" }}>
                            {leagueStanding.league}
                          </Text>
                          <Text style={{ fontSize: 11, color: "#5A6178" }}>League</Text>
                        </View>
                        <View style={{ alignItems: "center" }}>
                          <Text style={{ fontSize: 22, fontWeight: "900", color: "#EAEDF3" }}>
                            #{leagueStanding.rank ?? "—"}
                          </Text>
                          <Text style={{ fontSize: 11, color: "#5A6178" }}>Rank</Text>
                        </View>
                        <View style={{ alignItems: "center" }}>
                          <Text style={{ fontSize: 22, fontWeight: "900", color: "#2DD4BF" }}>
                            {leagueStanding.xp_earned}
                          </Text>
                          <Text style={{ fontSize: 11, color: "#5A6178" }}>Weekly XP</Text>
                        </View>
                      </View>
                    ) : (
                      <Text style={{ fontSize: 13, color: "#5A6178", textAlign: "center", marginBottom: 12 }}>
                        Your first league placement starts next week
                      </Text>
                    )}
                    {leaguePeers.length > 0 && (
                      <View>
                        <Text style={{ fontSize: 11, fontWeight: "600", color: "#8B92A8", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                          This Week's Standings
                        </Text>
                        {leaguePeers.slice(0, 10).map((peer, i) => (
                          <View key={peer.user_id} style={{
                            flexDirection: "row", alignItems: "center", paddingVertical: 8,
                            borderBottomWidth: i < Math.min(leaguePeers.length, 10) - 1 ? 0.5 : 0,
                            borderBottomColor: "#242A42",
                          }}>
                            <Text style={{ width: 28, fontSize: 14, fontWeight: "700", color: i < 3 ? "#F5C542" : "#5A6178" }}>
                              {peer.rank ?? i + 1}
                            </Text>
                            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: i < 3 ? "#F5C54215" : "#242A42", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                              <Ionicons name="person" size={14} color={i < 3 ? "#F5C542" : "#5A6178"} />
                            </View>
                            <Text style={{ flex: 1, fontSize: 14, color: "#EAEDF3" }}>
                              Player {peer.rank ?? i + 1}
                            </Text>
                            <Text style={{ fontSize: 14, fontWeight: "700", color: "#2DD4BF" }}>
                              {peer.xp_earned} XP
                            </Text>
                            {peer.promoted && <Ionicons name="arrow-up" size={12} color="#2DD4BF" style={{ marginLeft: 6 }} />}
                            {peer.demoted && <Ionicons name="arrow-down" size={12} color="#F87171" style={{ marginLeft: 6 }} />}
                          </View>
                        ))}
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={{ fontSize: 13, color: "#5A6178", textAlign: "center" }}>
                    Join a league to compete anonymously with others at your level.{"\n"}Effort-based — not score-based.
                  </Text>
                )}
              </View>
            </Animated.View>

            {/* Recompute Button */}
            <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
              <Pressable
                onPress={handleCompute}
                disabled={computing}
                style={{
                  backgroundColor: "#242A42",
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                {computing ? (
                  <ActivityIndicator color="#8B92A8" />
                ) : (
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#8B92A8" }}>
                    Recompute Score
                  </Text>
                )}
              </Pressable>
              <Text style={{ fontSize: 11, color: "#5A617880", textAlign: "center", marginTop: 8 }}>
                Scores update weekly based on your real behavior
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
