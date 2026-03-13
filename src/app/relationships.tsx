import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  withDelay,
} from "react-native-reanimated";
import Svg, { Line, Circle as SvgCircle } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import CompanionAvatar from "@/components/companion/CompanionAvatar";
import ShareFooter from "@/components/share/ShareFooter";
import { supabase } from "@/lib/supabase";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { screen } from "@/lib/analytics";
import type { Relationship } from "@/types/database";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CONSTELLATION_PADDING = 20;
const CONSTELLATION_W = SCREEN_WIDTH - CONSTELLATION_PADDING * 2;
const CENTER_X = CONSTELLATION_W / 2;
const CENTER_Y = 160;
const MAP_HEIGHT = CENTER_Y * 2 + 40;
const MAX_RADIUS = Math.min(CENTER_X - 40, 140);

function sentimentColor(s: number | null): string {
  if (s === null) return "#A1A1AA";
  if (s > 0.3) return "#34D399";
  if (s < -0.3) return "#F87171";
  return "#FBBF24";
}

function sentimentLabel(s: number | null): string {
  if (s === null) return "Neutral";
  if (s > 0.5) return "Very Positive";
  if (s > 0.3) return "Positive";
  if (s > 0) return "Slightly Positive";
  if (s > -0.3) return "Mixed";
  if (s > -0.5) return "Strained";
  return "Difficult";
}

function sentimentEmoji(s: number | null): string {
  if (s === null) return "😐";
  if (s > 0.5) return "💚";
  if (s > 0.3) return "🌿";
  if (s > 0) return "🤝";
  if (s > -0.3) return "🌊";
  if (s > -0.5) return "⚡";
  return "🔥";
}

interface NodePosition {
  x: number;
  y: number;
  size: number;
}

function computeNodePositions(rels: Relationship[]): NodePosition[] {
  return rels.map((rel, i) => {
    const angle = (i / rels.length) * Math.PI * 2 - Math.PI / 2;
    const mentionFactor = Math.min(rel.mentioned_count / 5, 1);
    const radius = MAX_RADIUS * (0.5 + (1 - mentionFactor) * 0.5);
    return {
      x: CENTER_X + Math.cos(angle) * radius,
      y: CENTER_Y + Math.sin(angle) * radius,
      size: Math.min(28 + rel.mentioned_count * 6, 52),
    };
  });
}

function FloatingNode({
  rel,
  pos,
  index,
  isSelected,
  onPress,
}: {
  rel: Relationship;
  pos: NodePosition;
  index: number;
  isSelected: boolean;
  onPress: () => void;
}) {
  const color = sentimentColor(rel.sentiment_trend);
  const floatOffset = useSharedValue(0);

  useEffect(() => {
    floatOffset.value = withDelay(
      index * 150,
      withRepeat(
        withTiming(5, { duration: 2500 + index * 200, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -floatOffset.value }],
  }));

  const hitSlop = { top: 16, bottom: 16, left: 16, right: 16 };

  return (
    <Animated.View
      entering={FadeIn.delay(200 + index * 80).duration(400)}
      style={[
        floatStyle,
        {
          position: "absolute",
          left: pos.x - pos.size / 2,
          top: pos.y - pos.size / 2,
          alignItems: "center",
          zIndex: isSelected ? 10 : 1,
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        hitSlop={hitSlop}
        accessibilityLabel={`${rel.name}, ${rel.relation_type ?? "person"}, mentioned ${rel.mentioned_count} times`}
        accessibilityRole="button"
      >
        <View
          style={{
            width: pos.size,
            height: pos.size,
            borderRadius: pos.size / 2,
            backgroundColor: isSelected ? `${color}50` : `${color}25`,
            borderWidth: isSelected ? 3 : 2,
            borderColor: color,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: color,
            shadowOpacity: isSelected ? 0.6 : 0.2,
            shadowRadius: isSelected ? 12 : 4,
            shadowOffset: { width: 0, height: 0 },
          }}
        >
          <Text
            style={{
              fontSize: Math.max(pos.size * 0.38, 12),
              fontWeight: "800",
              color,
            }}
          >
            {rel.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "700",
            color: isSelected ? "#F4F4F5" : "#D4D4D8",
            marginTop: 5,
            textAlign: "center",
            maxWidth: 90,
          }}
          numberOfLines={1}
        >
          {rel.name}
        </Text>
        {rel.relation_type && (
          <Text
            style={{ fontSize: 9, color: "#71717A", textAlign: "center" }}
            numberOfLines={1}
          >
            {rel.relation_type}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

function ConnectionLines({
  positions,
  relationships,
  selectedId,
}: {
  positions: NodePosition[];
  relationships: Relationship[];
  selectedId: string | null;
}) {
  return (
    <Svg width={CONSTELLATION_W} height={MAP_HEIGHT} style={{ position: "absolute", top: 0, left: 0 }}>
      {positions.map((pos, i) => {
        const rel = relationships[i];
        const color = sentimentColor(rel.sentiment_trend);
        const isSelected = rel.id === selectedId;
        const opacity = selectedId ? (isSelected ? 0.5 : 0.08) : 0.15;
        const width = isSelected ? 2 : 1;
        return (
          <Line
            key={rel.id}
            x1={CENTER_X}
            y1={CENTER_Y}
            x2={pos.x}
            y2={pos.y}
            stroke={color}
            strokeWidth={width}
            strokeDasharray={isSelected ? undefined : "4,4"}
            opacity={opacity}
          />
        );
      })}
      <SvgCircle
        cx={CENTER_X}
        cy={CENTER_Y}
        r={6}
        fill="#7C3AED"
        opacity={0.3}
      />
    </Svg>
  );
}

function daysAgo(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function recencyLabel(d: number | null): string {
  if (d === null) return "";
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d <= 7) return `${d}d ago`;
  if (d <= 30) return `${Math.ceil(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function impactIcon(impact: string | null): string {
  switch (impact) {
    case "energizing": return "sunny-outline";
    case "draining": return "battery-dead-outline";
    case "complicated": return "git-branch-outline";
    case "supportive": return "heart-outline";
    default: return "remove-outline";
  }
}

function impactColor(impact: string | null): string {
  switch (impact) {
    case "energizing": return "#FBBF24";
    case "draining": return "#F87171";
    case "complicated": return "#A78BFA";
    case "supportive": return "#34D399";
    default: return "#6B7280";
  }
}

function DetailCard({ rel }: { rel: Relationship }) {
  const color = sentimentColor(rel.sentiment_trend);
  const lastSeen = daysAgo(rel.last_mentioned_at);
  const impact = rel.emotional_impact;
  const topics = rel.topics ?? [];

  return (
    <Animated.View
      entering={FadeInUp.duration(300)}
      style={{
        backgroundColor: "#111827",
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: `${color}30`,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: `${color}15`,
            borderWidth: 2,
            borderColor: color,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "800", color }}>
            {rel.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#F4F4F5" }}>
            {rel.name}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3 }}>
            {rel.relation_type && (
              <Text style={{ fontSize: 13, color: "#71717A" }}>
                {rel.relation_type}
              </Text>
            )}
            {lastSeen !== null && (
              <Text style={{ fontSize: 12, color: "#52525B", marginLeft: rel.relation_type ? 8 : 0 }}>
                · {recencyLabel(lastSeen)}
              </Text>
            )}
          </View>
        </View>
        <Text style={{ fontSize: 24 }}>{sentimentEmoji(rel.sentiment_trend)}</Text>
      </View>

      {/* Stats row */}
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: "#1F2937",
            borderRadius: 14,
            padding: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: "800", color: "#F4F4F5" }}>
            {rel.mentioned_count}
          </Text>
          <Text style={{ fontSize: 10, color: "#6B7280", marginTop: 2, fontWeight: "600" }}>
            MENTIONS
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: "#1F2937",
            borderRadius: 14,
            padding: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "700", color }}>
            {sentimentLabel(rel.sentiment_trend)}
          </Text>
          <Text style={{ fontSize: 10, color: "#6B7280", marginTop: 2, fontWeight: "600" }}>
            SENTIMENT
          </Text>
        </View>
        {impact && (
          <View
            style={{
              flex: 1,
              backgroundColor: "#1F2937",
              borderRadius: 14,
              padding: 12,
              alignItems: "center",
            }}
          >
            <Ionicons name={impactIcon(impact) as any} size={20} color={impactColor(impact)} />
            <Text style={{ fontSize: 10, color: "#6B7280", marginTop: 4, fontWeight: "600", textTransform: "uppercase" }}>
              {impact}
            </Text>
          </View>
        )}
      </View>

      {/* Topics */}
      {topics.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {topics.map((t) => (
            <View
              key={t}
              style={{
                backgroundColor: `${color}15`,
                borderRadius: 20,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderWidth: 1,
                borderColor: `${color}25`,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "600", color: `${color}CC` }}>
                {t}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Context note */}
      {rel.notes && (
        <View
          style={{
            backgroundColor: "#1F2937",
            borderRadius: 14,
            padding: 14,
          }}
        >
          <Text style={{ fontSize: 10, color: "#52525B", marginBottom: 4, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Latest context
          </Text>
          <Text style={{ fontSize: 14, color: "#D1D5DB", lineHeight: 20 }}>
            {rel.notes}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

export default function RelationshipsScreen() {
  const navigation = useNavigation();
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadRelationships = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("relationships")
      .select("*")
      .eq("user_id", user.id)
      .order("mentioned_count", { ascending: false })
      .limit(15);

    if (error) {
      console.warn("Failed to load relationships:", error.message);
    }
    setRelationships((data as Relationship[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { screen("relationships"); }, []);

  useEffect(() => {
    loadRelationships();
  }, [loadRelationships]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRelationships();
    setRefreshing(false);
  }, [loadRelationships]);

  const positions = useMemo(
    () => computeNodePositions(relationships),
    [relationships],
  );

  const selected = useMemo(
    () => relationships.find((r) => r.id === selectedId) ?? null,
    [relationships, selectedId],
  );

  const topMentioned = useMemo(
    () => relationships[0] ?? null,
    [relationships],
  );

  const positivePeople = useMemo(
    () => relationships.filter((r) => (r.sentiment_trend ?? 0) > 0.3).length,
    [relationships],
  );

  const strainedPeople = useMemo(
    () => relationships.filter((r) => (r.sentiment_trend ?? 0) < -0.3).length,
    [relationships],
  );

  const totalMentions = useMemo(
    () => relationships.reduce((sum, r) => sum + r.mentioned_count, 0),
    [relationships],
  );

  const relationTypes = useMemo(() => {
    const types = new Set(relationships.map((r) => r.relation_type).filter(Boolean));
    return types.size;
  }, [relationships]);

  const energizingPeople = useMemo(
    () => relationships.filter((r) => r.emotional_impact === "energizing" || r.emotional_impact === "supportive").length,
    [relationships],
  );

  const allTopics = useMemo(() => {
    const topics = new Map<string, number>();
    relationships.forEach((r) => {
      (r.topics ?? []).forEach((t) => {
        topics.set(t, (topics.get(t) ?? 0) + 1);
      });
    });
    return [...topics.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [relationships]);

  const worldInsight = useMemo(() => {
    const total = relationships.length;
    if (total === 0) return "";
    const posRatio = positivePeople / total;
    if (posRatio >= 0.7) return "Your world is filled with warmth";
    if (posRatio >= 0.5) return "A balanced constellation of connections";
    if (strainedPeople >= 2) return "Some relationships need attention";
    return "Your connections are evolving";
  }, [relationships, positivePeople, strainedPeople]);

  const viewShotRef = useRef<ViewShot>(null);

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#0C1120",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color="#7C3AED" />
      </SafeAreaView>
    );
  }

  if (relationships.length === 0) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#0C1120",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: "#1F293720",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <Ionicons name="people-outline" size={40} color="#7C3AED" />
        </View>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "800",
            color: "#F4F4F5",
            textAlign: "center",
          }}
        >
          Your World is Building
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: "#71717A",
            textAlign: "center",
            marginTop: 10,
            lineHeight: 22,
          }}
        >
          As you talk about the people in your life, they'll appear here as your
          relationship constellation.
        </Text>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            marginTop: 28,
            backgroundColor: "#7C3AED20",
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 12,
          }}
        >
          <Text style={{ fontSize: 16, color: "#A78BFA", fontWeight: "700" }}>
            Go back
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0C1120" }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 12,
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={24} color="#71717A" />
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#F4F4F5" }}>
            My World
          </Text>
          <Text style={{ fontSize: 11, color: "#52525B", marginTop: 1 }}>
            {relationships.length} people · {totalMentions} mentions
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: CONSTELLATION_PADDING, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7C3AED"
          />
        }
      >
        {/* Constellation Map */}
        <Animated.View
          entering={FadeIn.duration(500)}
          style={{
            height: MAP_HEIGHT,
            position: "relative",
            marginBottom: 12,
            backgroundColor: "#0F172A",
            borderRadius: 20,
            overflow: "hidden",
          }}
        >
          <ConnectionLines
            positions={positions}
            relationships={relationships}
            selectedId={selectedId}
          />

          {/* Center — You */}
          <View
            style={{
              position: "absolute",
              left: CENTER_X - 28,
              top: CENTER_Y - 28,
              alignItems: "center",
              zIndex: 5,
            }}
          >
            <CompanionAvatar expression="warm" size="small" />
            <Text style={{ fontSize: 10, fontWeight: "700", color: "#7C3AED", marginTop: 3 }}>
              You
            </Text>
          </View>

          {/* Relationship nodes */}
          {relationships.map((rel, i) => (
            <FloatingNode
              key={rel.id}
              rel={rel}
              pos={positions[i]}
              index={i}
              isSelected={rel.id === selectedId}
              onPress={() => {
                hapticLight();
                setSelectedId(selectedId === rel.id ? null : rel.id);
              }}
            />
          ))}
        </Animated.View>

        {/* Tap hint */}
        {!selected && (
          <Animated.View entering={FadeIn.delay(800).duration(400)}>
            <Text
              style={{
                fontSize: 12,
                color: "#52525B",
                textAlign: "center",
                marginBottom: 16,
              }}
            >
              Tap a person to see details
            </Text>
          </Animated.View>
        )}

        {/* Selected detail card */}
        {selected && <DetailCard rel={selected} />}

        {/* People list */}
        <View style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: "#6B7280",
              letterSpacing: 0.8,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Everyone in Your World
          </Text>
          {relationships.map((rel, i) => {
            const color = sentimentColor(rel.sentiment_trend);
            return (
              <Animated.View
                key={rel.id}
                entering={FadeInDown.delay(i * 50).duration(300)}
              >
                <Pressable
                  onPress={() => {
                    hapticLight();
                    setSelectedId(selectedId === rel.id ? null : rel.id);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor:
                      selectedId === rel.id ? "#1E293B" : "#111827",
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor:
                      selectedId === rel.id ? `${color}40` : "transparent",
                  }}
                  accessibilityLabel={`${rel.name}, ${sentimentLabel(rel.sentiment_trend)}`}
                  accessibilityRole="button"
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: `${color}20`,
                      borderWidth: 1.5,
                      borderColor: color,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: "800", color }}>
                      {rel.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: "#F4F4F5",
                      }}
                    >
                      {rel.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 1 }}>
                      {rel.relation_type ?? "Person"} · {rel.mentioned_count}{" "}
                      mention{rel.mentioned_count !== 1 ? "s" : ""}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 16 }}>
                      {sentimentEmoji(rel.sentiment_trend)}
                    </Text>
                    <Text style={{ fontSize: 10, color, fontWeight: "600", marginTop: 2 }}>
                      {sentimentLabel(rel.sentiment_trend)}
                    </Text>
                    {rel.last_mentioned_at && (
                      <Text style={{ fontSize: 9, color: "#52525B", marginTop: 1 }}>
                        {recencyLabel(daysAgo(rel.last_mentioned_at))}
                      </Text>
                    )}
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        {/* Insights section */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={{
            backgroundColor: "#111827",
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: "#52525B",
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            Your World at a Glance
          </Text>

          {/* Primary stats row */}
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
            <View
              style={{
                flex: 1,
                backgroundColor: "#1A1F35",
                borderRadius: 14,
                padding: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 26, fontWeight: "800", color: "#F4F4F5" }}>
                {relationships.length}
              </Text>
              <Text style={{ fontSize: 10, color: "#6B7280", marginTop: 2, fontWeight: "600" }}>
                PEOPLE
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: "#1A1F35",
                borderRadius: 14,
                padding: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 26, fontWeight: "800", color: "#34D399" }}>
                {positivePeople}
              </Text>
              <Text style={{ fontSize: 10, color: "#6B7280", marginTop: 2, fontWeight: "600" }}>
                POSITIVE
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: "#1A1F35",
                borderRadius: 14,
                padding: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 26, fontWeight: "800", color: "#A78BFA" }}>
                {totalMentions}
              </Text>
              <Text style={{ fontSize: 10, color: "#6B7280", marginTop: 2, fontWeight: "600" }}>
                MENTIONS
              </Text>
            </View>
          </View>

          {/* Secondary insights */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View
              style={{
                flex: 1,
                backgroundColor: "#1A1F35",
                borderRadius: 14,
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Ionicons name="git-network-outline" size={16} color="#60A5FA" style={{ marginRight: 8 }} />
              <View>
                <Text style={{ fontSize: 16, fontWeight: "800", color: "#60A5FA" }}>
                  {relationTypes}
                </Text>
                <Text style={{ fontSize: 9, color: "#6B7280", fontWeight: "600" }}>
                  CIRCLES
                </Text>
              </View>
            </View>
            {energizingPeople > 0 && (
              <View
                style={{
                  flex: 1,
                  backgroundColor: "#1A1F35",
                  borderRadius: 14,
                  padding: 12,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons name="sunny-outline" size={16} color="#FBBF24" style={{ marginRight: 8 }} />
                <View>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: "#FBBF24" }}>
                    {energizingPeople}
                  </Text>
                  <Text style={{ fontSize: 9, color: "#6B7280", fontWeight: "600" }}>
                    ENERGIZING
                  </Text>
                </View>
              </View>
            )}
            {strainedPeople > 0 && (
              <View
                style={{
                  flex: 1,
                  backgroundColor: "#1A1F35",
                  borderRadius: 14,
                  padding: 12,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons name="flash-outline" size={16} color="#F87171" style={{ marginRight: 8 }} />
                <View>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: "#F87171" }}>
                    {strainedPeople}
                  </Text>
                  <Text style={{ fontSize: 9, color: "#6B7280", fontWeight: "600" }}>
                    STRAINED
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Top topics */}
          {allTopics.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={{ fontSize: 10, color: "#52525B", fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>
                What you talk about most
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {allTopics.map(([topic, count]) => (
                  <View
                    key={topic}
                    style={{
                      backgroundColor: "#7C3AED15",
                      borderRadius: 20,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderWidth: 1,
                      borderColor: "#7C3AED25",
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "600", color: "#A78BFA" }}>
                      {topic}
                    </Text>
                    <Text style={{ fontSize: 10, color: "#7C3AED80", marginLeft: 4, fontWeight: "700" }}>
                      {count}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Animated.View>

        {/* Share card */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <ViewShot ref={viewShotRef} options={{ format: "png", quality: 1.0 }}>
            <View style={{ borderRadius: 24, overflow: "hidden" }}>
              <LinearGradient
                colors={["#1A1040", "#0F172A", "#0A1628"]}
                style={{
                  padding: 28,
                  minHeight: 420,
                  justifyContent: "space-between",
                }}
              >
                {/* Top — Title + Insight */}
                <View>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#5A6178", letterSpacing: 2, textTransform: "uppercase" }}>
                    MY WORLD
                  </Text>
                  <Text style={{ fontSize: 20, fontWeight: "800", color: "#E4E4E7", marginTop: 6, lineHeight: 26 }}>
                    {worldInsight}
                  </Text>
                </View>

                {/* Center — Mini constellation */}
                <View style={{ alignItems: "center", paddingVertical: 20 }}>
                  <View style={{ width: 200, height: 140, position: "relative" }}>
                    {/* Center node */}
                    <View
                      style={{
                        position: "absolute",
                        left: 88,
                        top: 58,
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: "#7C3AED40",
                        borderWidth: 2,
                        borderColor: "#7C3AED",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 9, fontWeight: "900", color: "#A78BFA" }}>ME</Text>
                    </View>
                    {/* Orbit nodes — show up to 6 closest people */}
                    {relationships.slice(0, 6).map((r, i) => {
                      const angle = (i / Math.min(relationships.length, 6)) * Math.PI * 2 - Math.PI / 2;
                      const radius = 52;
                      const cx = 100 + Math.cos(angle) * radius;
                      const cy = 70 + Math.sin(angle) * radius;
                      const c = sentimentColor(r.sentiment_trend);
                      const sz = Math.min(18 + r.mentioned_count * 2, 28);
                      return (
                        <View
                          key={r.id}
                          style={{
                            position: "absolute",
                            left: cx - sz / 2,
                            top: cy - sz / 2,
                            width: sz,
                            height: sz,
                            borderRadius: sz / 2,
                            backgroundColor: `${c}25`,
                            borderWidth: 1.5,
                            borderColor: c,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text style={{ fontSize: Math.max(sz * 0.4, 8), fontWeight: "800", color: c }}>
                            {r.name.charAt(0)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Bottom — Key stats */}
                <View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
                    <View style={{ alignItems: "center", flex: 1 }}>
                      <Text style={{ fontSize: 28, fontWeight: "900", color: "#F4F4F5" }}>
                        {relationships.length}
                      </Text>
                      <Text style={{ fontSize: 10, color: "#5A6178", fontWeight: "600", marginTop: 2 }}>
                        PEOPLE
                      </Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: "#242A42" }} />
                    <View style={{ alignItems: "center", flex: 1 }}>
                      <Text style={{ fontSize: 28, fontWeight: "900", color: "#34D399" }}>
                        {positivePeople}
                      </Text>
                      <Text style={{ fontSize: 10, color: "#5A6178", fontWeight: "600", marginTop: 2 }}>
                        POSITIVE
                      </Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: "#242A42" }} />
                    <View style={{ alignItems: "center", flex: 1 }}>
                      <Text style={{ fontSize: 28, fontWeight: "900", color: "#A78BFA" }}>
                        {relationTypes}
                      </Text>
                      <Text style={{ fontSize: 10, color: "#5A6178", fontWeight: "600", marginTop: 2 }}>
                        CIRCLES
                      </Text>
                    </View>
                  </View>

                  {/* Top people names */}
                  {topMentioned && (
                    <View style={{
                      paddingTop: 12,
                      borderTopWidth: 0.5,
                      borderTopColor: "#242A42",
                    }}>
                      <Text style={{ fontSize: 11, color: "#5A6178", textAlign: "center" }}>
                        Closest: {relationships.slice(0, 3).map((r) => r.name).join(", ")}
                        {relationships.length > 3 ? ` +${relationships.length - 3}` : ""}
                      </Text>
                    </View>
                  )}

                  <ShareFooter variant="dark" />
                </View>
              </LinearGradient>
            </View>
          </ViewShot>

          {/* Share button */}
          <Pressable
            onPress={async () => {
              try {
                const uri = await viewShotRef.current?.capture?.();
                if (!uri) return;
                await hapticSuccess();
                await Sharing.shareAsync(uri, {
                  mimeType: "image/png",
                  dialogTitle: "Share your Lumis card",
                });
              } catch (e) {
                console.warn("Share failed:", e);
              }
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 12,
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            <LinearGradient
              colors={["#6366F1", "#2DD4BF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 14,
                paddingHorizontal: 24,
                borderRadius: 14,
                width: "100%",
              }}
            >
              <Ionicons name="share-social" size={18} color="white" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 15, fontWeight: "700", color: "white" }}>Share My World</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
