import { useRef, useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle as SvgCircle } from "react-native-svg";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withTiming, withDelay } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { hapticSuccess } from "@/lib/haptics";

const ATTR_META: Record<string, { label: string; color: string }> = {
  awareness: { label: "Awareness", color: "#A78BFA" },
  resilience: { label: "Resilience", color: "#F87171" },
  discipline: { label: "Discipline", color: "#2DD4BF" },
  growth: { label: "Growth", color: "#FBBF24" },
  connection: { label: "Connection", color: "#60A5FA" },
  vitality: { label: "Vitality", color: "#34D399" },
};

const ATTR_KEYS = ["awareness", "resilience", "discipline", "growth", "connection", "vitality"] as const;

function getScoreColor(score: number): string {
  if (score < 30) return "#F87171";
  if (score < 60) return "#FBBF24";
  if (score < 80) return "#2DD4BF";
  return "#A78BFA";
}

function AnimatedBar({ label, value, color, delay }: { label: string; value: number; color: string; delay: number }) {
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withDelay(delay, withTiming(value, { duration: 800 }));
  }, [value]);
  const barStyle = useAnimatedStyle(() => ({ width: `${width.value}%`, backgroundColor: color }));

  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
        <Text style={{ fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.7)" }}>{label}</Text>
        <Text style={{ fontSize: 11, fontWeight: "800", color }}>{Math.round(value)}</Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.1)" }}>
        <Animated.View style={[barStyle, { height: 6, borderRadius: 3 }]} />
      </View>
    </View>
  );
}

function ScoreRing({ score, size = 90 }: { score: number; size?: number }) {
  const strokeWidth = 5;
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = getScoreColor(score);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <SvgCircle cx={size / 2} cy={size / 2} r={r} stroke="#242A42" strokeWidth={strokeWidth} fill="none" />
        <SvgCircle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${circ}`} strokeDashoffset={offset} strokeLinecap="round"
        />
      </Svg>
      <Text style={{ fontSize: 22, fontWeight: "900", color }}>{score}</Text>
    </View>
  );
}

export interface BlueprintResult {
  archetype: string;
  archetype_emoji: string;
  composite_score: number;
  dimensions: Record<string, number>;
  superpower: string;
  blind_spot: string;
}

interface Props {
  result: BlueprintResult;
  onStartJourney: () => void;
  onRetake: () => void;
}

export default function BlueprintResultCard({ result, onStartJourney, onRetake }: Props) {
  const viewRef = useRef<ViewShot>(null);
  const [sharing, setSharing] = useState(false);
  const color = getScoreColor(result.composite_score);

  const handleShare = useCallback(async () => {
    if (!viewRef.current?.capture) return;
    setSharing(true);
    try {
      const uri = await viewRef.current.capture();
      await hapticSuccess();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "image/png", UTI: "public.png" });
      }
    } catch (e) {
      console.warn("Share failed:", e);
    }
    setSharing(false);
  }, []);

  return (
    <View style={{ alignItems: "center" }}>
      <Animated.View entering={FadeInDown.duration(500)}>
        <ViewShot ref={viewRef} options={{ format: "png", quality: 1.0, result: "tmpfile" }}>
          <View style={{ width: 340, borderRadius: 24, overflow: "hidden", borderWidth: 1.5, borderColor: `${color}40` }}>
            <LinearGradient
              colors={["#1A1040", "#0C1120", "#0A1628"]}
              style={{ padding: 28, alignItems: "center" }}
            >
              <Text style={{
                fontSize: 11, fontWeight: "600", color: "#5A6178",
                letterSpacing: 2, textTransform: "uppercase", marginBottom: 4,
              }}>
                MY LIFE BLUEPRINT
              </Text>
              <Text style={{ fontSize: 32, marginBottom: 2 }}>{result.archetype_emoji}</Text>
              <Text style={{
                fontSize: 20, fontWeight: "900", color, letterSpacing: 0.5,
                textTransform: "uppercase", textAlign: "center", marginBottom: 16,
              }}>
                {result.archetype}
              </Text>

              <ScoreRing score={result.composite_score} size={90} />
              <Text style={{ fontSize: 10, color: "#5A6178", marginTop: 6, marginBottom: 16 }}>Life Score</Text>

              <View style={{ width: "100%" }}>
                {ATTR_KEYS.map((k, i) => (
                  <AnimatedBar
                    key={k}
                    label={ATTR_META[k].label}
                    value={result.dimensions[k] ?? 0}
                    color={ATTR_META[k].color}
                    delay={300 + i * 100}
                  />
                ))}
              </View>

              <View style={{ marginTop: 14, width: "100%", paddingTop: 14, borderTopWidth: 0.5, borderTopColor: "#242A42" }}>
                <View style={{ flexDirection: "row", marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, marginRight: 6 }}>⚡</Text>
                  <Text style={{ flex: 1, fontSize: 12, color: "rgba(255,255,255,0.8)", lineHeight: 18 }}>
                    <Text style={{ fontWeight: "700", color }}>Superpower: </Text>
                    {result.superpower}
                  </Text>
                </View>
                <View style={{ flexDirection: "row" }}>
                  <Text style={{ fontSize: 13, marginRight: 6 }}>🔍</Text>
                  <Text style={{ flex: 1, fontSize: 12, color: "rgba(255,255,255,0.8)", lineHeight: 18 }}>
                    <Text style={{ fontWeight: "700", color: "#FBBF24" }}>Blind spot: </Text>
                    {result.blind_spot}
                  </Text>
                </View>
              </View>

              <Text style={{ fontSize: 9, color: "#5A617840", marginTop: 16, letterSpacing: 3, fontWeight: "600" }}>
                lumis.app
              </Text>
            </LinearGradient>
          </View>
        </ViewShot>
      </Animated.View>

      {/* Share CTA */}
      <Animated.View entering={FadeInDown.delay(400).duration(400)} style={{ width: "100%", marginTop: 20 }}>
        <Pressable onPress={handleShare} disabled={sharing} style={{ borderRadius: 14, overflow: "hidden" }}>
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
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#EAEDF3" }}>Share Your Blueprint</Text>
              </View>
            )}
          </LinearGradient>
        </Pressable>
      </Animated.View>

      {/* Start Journey CTA */}
      <Animated.View entering={FadeInDown.delay(500).duration(400)} style={{ width: "100%", marginTop: 12 }}>
        <Pressable
          onPress={onStartJourney}
          style={{
            paddingVertical: 16, alignItems: "center", borderRadius: 14,
            backgroundColor: "#1A1F35", borderWidth: 1, borderColor: "#242A4260",
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#EAEDF3" }}>Start Your Growth Journey</Text>
        </Pressable>
      </Animated.View>

      {/* Retake */}
      <Animated.View entering={FadeInDown.delay(600).duration(300)}>
        <Pressable onPress={onRetake} style={{ paddingVertical: 16 }}>
          <Text style={{ fontSize: 14, color: "#5A6178" }}>Retake Quiz</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
