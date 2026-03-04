import { useEffect, useState, useMemo, useRef } from "react";
import { View, Text, Pressable, ActivityIndicator, Dimensions, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withDelay } from "react-native-reanimated";
import CompanionAvatar from "@/components/companion/CompanionAvatar";
import ShareableCard from "@/components/share/ShareableCard";
import { supabase } from "@/lib/supabase";
import { hapticLight } from "@/lib/haptics";
import type { Relationship } from "@/types/database";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CENTER_X = (SCREEN_WIDTH - 40) / 2;
const CENTER_Y = 180;
const MAX_RADIUS = Math.min(CENTER_X - 30, 150);

function sentimentColor(s: number | null): string {
  if (s === null) return "#A1A1AA";
  if (s > 0.3) return "#34D399";
  if (s < -0.3) return "#F87171";
  return "#FBBF24";
}

function RelationshipNode({ rel, index, total }: { rel: Relationship; index: number; total: number }) {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const maxMentions = Math.max(total, 5);
  const distanceFactor = 1 - Math.min(rel.mentioned_count / maxMentions, 0.8);
  const radius = MAX_RADIUS * (0.4 + distanceFactor * 0.6);
  const x = CENTER_X + Math.cos(angle) * radius;
  const y = CENTER_Y + Math.sin(angle) * radius;
  const nodeSize = Math.min(20 + rel.mentioned_count * 4, 48);
  const color = sentimentColor(rel.sentiment_trend);

  const floatOffset = useSharedValue(0);
  useEffect(() => {
    floatOffset.value = withDelay(
      index * 200,
      withRepeat(
        withTiming(6, { duration: 2000 + index * 300, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -floatOffset.value }],
  }));

  return (
    <Animated.View
      entering={FadeIn.delay(300 + index * 100).duration(500)}
      style={[floatStyle, {
        position: "absolute",
        left: x - nodeSize / 2,
        top: y - nodeSize / 2,
        alignItems: "center",
      }]}
    >
      {/* Connection line */}
      <View
        style={{
          position: "absolute",
          width: 1,
          height: radius,
          backgroundColor: `${color}20`,
          top: nodeSize / 2,
          left: nodeSize / 2 - 0.5,
          transform: [
            { rotate: `${(angle + Math.PI / 2) * (180 / Math.PI)}deg` },
            { translateY: -radius / 2 },
          ],
          transformOrigin: "top",
        }}
      />

      {/* Node */}
      <View style={{
        width: nodeSize,
        height: nodeSize,
        borderRadius: nodeSize / 2,
        backgroundColor: `${color}30`,
        borderWidth: 2,
        borderColor: color,
        alignItems: "center",
        justifyContent: "center",
      }}>
        <Text style={{ fontSize: Math.max(nodeSize * 0.35, 10), fontWeight: "700", color }}>
          {rel.name.charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Label */}
      <Text style={{
        fontSize: 10,
        fontWeight: "600",
        color: "#F4F4F5",
        marginTop: 4,
        textAlign: "center",
        maxWidth: 80,
      }} numberOfLines={1}>
        {rel.name}
      </Text>
      {rel.relation_type && (
        <Text style={{ fontSize: 9, color: "#71717A", textAlign: "center" }} numberOfLines={1}>
          {rel.relation_type}
        </Text>
      )}
    </Animated.View>
  );
}

export default function RelationshipsScreen() {
  const router = useRouter();
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Relationship | null>(null);

  useEffect(() => {
    loadRelationships();
  }, []);

  const loadRelationships = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("relationships")
      .select("*")
      .eq("user_id", user.id)
      .order("mentioned_count", { ascending: false })
      .limit(15);

    setRelationships((data as Relationship[]) ?? []);
    setLoading(false);
  };

  const topMentioned = useMemo(() => relationships[0]?.name ?? null, [relationships]);
  const strongestConnection = useMemo(() => {
    const sorted = [...relationships].sort((a, b) => Math.abs(b.sentiment_trend ?? 0) - Math.abs(a.sentiment_trend ?? 0));
    return sorted[0]?.name ?? null;
  }, [relationships]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0C1120", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </SafeAreaView>
    );
  }

  if (relationships.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0C1120", alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
        <Ionicons name="people-outline" size={48} color="#52525B" />
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#F4F4F5", marginTop: 20, textAlign: "center" }}>
          Your World is Building
        </Text>
        <Text style={{ fontSize: 15, color: "#71717A", textAlign: "center", marginTop: 8 }}>
          As you talk about people in your life, they'll appear here as a relationship map.
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 16, color: "#A78BFA", fontWeight: "600" }}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0C1120" }}>
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#71717A" />
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#F4F4F5" }}>My World</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        {/* Constellation */}
        <View style={{ height: CENTER_Y * 2 + 60, position: "relative", marginBottom: 20 }}>
          {/* Center companion */}
          <View style={{ position: "absolute", left: CENTER_X - 30, top: CENTER_Y - 30 }}>
            <CompanionAvatar expression="warm" size="medium" />
          </View>

          {/* Relationship nodes */}
          {relationships.map((rel, i) => (
            <Pressable key={rel.id} onPress={() => { hapticLight(); setSelected(selected?.id === rel.id ? null : rel); }}>
              <RelationshipNode rel={rel} index={i} total={relationships.length} />
            </Pressable>
          ))}
        </View>

        {/* Selected detail */}
        {selected && (
          <Animated.View entering={FadeInDown.duration(300)} style={{ backgroundColor: "#16161D", borderRadius: 16, padding: 16, marginBottom: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <View style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: `${sentimentColor(selected.sentiment_trend)}20`,
                alignItems: "center", justifyContent: "center", marginRight: 12,
              }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: sentimentColor(selected.sentiment_trend) }}>
                  {selected.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#F4F4F5" }}>{selected.name}</Text>
                {selected.relation_type && <Text style={{ fontSize: 12, color: "#71717A" }}>{selected.relation_type}</Text>}
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 16, marginBottom: 8 }}>
              <View>
                <Text style={{ fontSize: 20, fontWeight: "700", color: "#F4F4F5" }}>{selected.mentioned_count}</Text>
                <Text style={{ fontSize: 11, color: "#71717A" }}>mentions</Text>
              </View>
              <View>
                <Text style={{ fontSize: 20, fontWeight: "700", color: sentimentColor(selected.sentiment_trend) }}>
                  {selected.sentiment_trend !== null ? (selected.sentiment_trend > 0 ? "+" : "") + selected.sentiment_trend.toFixed(1) : "—"}
                </Text>
                <Text style={{ fontSize: 11, color: "#71717A" }}>sentiment</Text>
              </View>
            </View>
            {selected.notes && (
              <Text style={{ fontSize: 13, color: "#A1A1AA", lineHeight: 18 }}>{selected.notes}</Text>
            )}
          </Animated.View>
        )}

        {/* Stats summary */}
        <View style={{ backgroundColor: "#16161D", borderRadius: 16, padding: 16, marginBottom: 20 }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: "#A1A1AA", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 12 }}>
            Your World at a Glance
          </Text>
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, color: "#F4F4F5" }}>
              <Text style={{ fontWeight: "700" }}>{relationships.length}</Text> people in your world
            </Text>
            {topMentioned && (
              <Text style={{ fontSize: 14, color: "#F4F4F5" }}>
                Most discussed: <Text style={{ fontWeight: "700", color: "#A78BFA" }}>{topMentioned}</Text>
              </Text>
            )}
            {strongestConnection && (
              <Text style={{ fontSize: 14, color: "#F4F4F5" }}>
                Strongest connection: <Text style={{ fontWeight: "700", color: "#2DD4BF" }}>{strongestConnection}</Text>
              </Text>
            )}
          </View>
        </View>

        {/* Share card */}
        <ShareableCard gradientIndex={4} minHeight={300}>
          <Text style={{ fontSize: 28, fontWeight: "800", color: "white", textAlign: "center" }}>
            My World
          </Text>
          <Text style={{ fontSize: 48, fontWeight: "800", color: "white", marginTop: 12 }}>
            {relationships.length}
          </Text>
          <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 2 }}>
            people
          </Text>
          <View style={{ marginTop: 20, alignItems: "center" }}>
            {topMentioned && (
              <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }}>
                Most discussed: {topMentioned}
              </Text>
            )}
            {strongestConnection && strongestConnection !== topMentioned && (
              <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>
                Strongest connection: {strongestConnection}
              </Text>
            )}
          </View>
        </ShareableCard>
      </ScrollView>
    </SafeAreaView>
  );
}
