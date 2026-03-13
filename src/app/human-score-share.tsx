import { useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle as SvgCircle } from "react-native-svg";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { useHumanScoreStore, getTier } from "@/store/humanScore";
import { hapticSuccess } from "@/lib/haptics";
import ShareFooter from "@/components/share/ShareFooter";

const ATTR_META: Record<string, { label: string; color: string; icon: string }> = {
  awareness: { label: "Awareness", color: "#A78BFA", icon: "eye-outline" },
  resilience: { label: "Resilience", color: "#F87171", icon: "shield-outline" },
  discipline: { label: "Discipline", color: "#2DD4BF", icon: "checkmark-done-outline" },
  growth: { label: "Growth", color: "#FBBF24", icon: "trending-up" },
  connection: { label: "Connection", color: "#60A5FA", icon: "people-outline" },
  vitality: { label: "Vitality", color: "#34D399", icon: "flash-outline" },
};

const ATTR_KEYS = ["awareness", "resilience", "discipline", "growth", "connection", "vitality"] as const;

function getScoreColor(score: number): string {
  if (score < 30) return "#F87171";
  if (score < 60) return "#FBBF24";
  if (score < 80) return "#2DD4BF";
  return "#A78BFA";
}

function StaticScoreRing({ score, size = 90 }: { score: number; size?: number }) {
  const strokeWidth = 6;
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = getScoreColor(score);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <SvgCircle cx={size / 2} cy={size / 2} r={r} stroke="#242A42" strokeWidth={strokeWidth} fill="none" />
        <SvgCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </Svg>
      <Text style={{ fontSize: 24, fontWeight: "900", color }}>{score}</Text>
    </View>
  );
}

function AttributeBar({ label, value, color, maxWidth }: { label: string; value: number; color: string; maxWidth: number }) {
  const barWidth = Math.max(4, (value / 100) * maxWidth);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
      <Text style={{ fontSize: 10, color: "#8B92A8", width: 62, fontWeight: "600" }}>{label}</Text>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: "#242A42", width: maxWidth, marginHorizontal: 8 }}>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: color, width: barWidth }} />
      </View>
      <Text style={{ fontSize: 11, fontWeight: "800", color, width: 24, textAlign: "right" }}>{value}</Text>
    </View>
  );
}

export default function HumanScoreShareScreen() {
  const navigation = useNavigation();
  const viewRef = useRef<ViewShot>(null);
  const [sharing, setSharing] = useState(false);
  const { latestScore, level, archetype } = useHumanScoreStore();

  const score = latestScore;
  const tier = getTier(level);
  const color = score ? getScoreColor(score.composite_score) : "#7C3AED";

  const sessionCount = score?.score_breakdown?.growth?.sessionFreq
    ? Math.round(score.score_breakdown.growth.sessionFreq / 5)
    : 0;

  const daysSinceFirstScore = score
    ? Math.max(1, Math.ceil((Date.now() - new Date(score.period_start).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const handleShare = async () => {
    if (!viewRef.current?.capture) return;
    setSharing(true);
    try {
      const uri = await viewRef.current.capture();
      await hapticSuccess();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          UTI: "public.png",
        });
      }
    } catch (e) {
      console.error("Share error:", e);
    }
    setSharing(false);
  };

  const barMaxWidth = 110;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0C1120" }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12 }}>
        <Pressable onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="close" size={24} color="#8B92A8" />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", color: "#EAEDF3" }}>
          Share Your Score
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}>
        <ViewShot ref={viewRef} options={{ format: "png", quality: 1.0, result: "tmpfile" }}>
          <View
            style={{
              width: 340,
              borderRadius: 24,
              overflow: "hidden",
              borderWidth: 1.5,
              borderColor: color + "50",
            }}
          >
            <LinearGradient
              colors={["#1A1040", "#0C1120", "#0A1628"]}
              style={{
                padding: 28,
                alignItems: "center",
              }}
            >
              {/* Archetype Hero */}
              <Text style={{ fontSize: 11, fontWeight: "600", color: "#5A6178", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
                I AM
              </Text>
              <Text style={{ fontSize: 22, fontWeight: "900", color, letterSpacing: 1, textTransform: "uppercase", textAlign: "center", marginBottom: 16 }}>
                {archetype}
              </Text>

              {/* Score Ring */}
              <StaticScoreRing score={score?.composite_score ?? 0} size={100} />
              <Text style={{ fontSize: 12, color: "#8B92A8", marginTop: 8 }}>
                Level {level} · {tier.name}
              </Text>

              {/* 2x3 Attribute Grid */}
              <View style={{ marginTop: 20, width: "100%" }}>
                {ATTR_KEYS.map(k => (
                  <AttributeBar
                    key={k}
                    label={ATTR_META[k].label}
                    value={score?.[k] ?? 0}
                    color={ATTR_META[k].color}
                    maxWidth={barMaxWidth}
                  />
                ))}
              </View>

              {/* Credibility Line */}
              <View style={{
                marginTop: 16,
                paddingTop: 16,
                borderTopWidth: 0.5,
                borderTopColor: "#242A42",
                width: "100%",
                alignItems: "center",
              }}>
                <Text style={{ fontSize: 11, color: "#5A6178", textAlign: "center", lineHeight: 18 }}>
                  Based on {sessionCount > 0 ? `${sessionCount}+ sessions` : "real sessions"} and {daysSinceFirstScore} days of tracking
                </Text>
              </View>

              <ShareFooter variant="dark" />
            </LinearGradient>
          </View>
        </ViewShot>
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: 20 }}>
        <Pressable
          onPress={handleShare}
          disabled={sharing}
          style={{ borderRadius: 14, overflow: "hidden" }}
        >
          <LinearGradient
            colors={["#7C3AED", "#2DD4BF"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ paddingVertical: 16, alignItems: "center", borderRadius: 14 }}
          >
            {sharing ? (
              <ActivityIndicator color="#EAEDF3" />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="share-social" size={20} color="#EAEDF3" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#EAEDF3" }}>Share to Stories</Text>
              </View>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
