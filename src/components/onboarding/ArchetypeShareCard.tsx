import React, { useRef, useCallback, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withTiming, withDelay } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { hapticSuccess } from "@/lib/haptics";
import ShareFooter from "@/components/share/ShareFooter";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 48, 360);

const ATTR_META: Record<string, { label: string; color: string }> = {
  awareness: { label: "Awareness", color: "#A78BFA" },
  resilience: { label: "Resilience", color: "#F87171" },
  discipline: { label: "Discipline", color: "#2DD4BF" },
  growth: { label: "Growth", color: "#FBBF24" },
  connection: { label: "Connection", color: "#60A5FA" },
  vitality: { label: "Vitality", color: "#34D399" },
};
const ATTR_KEYS = Object.keys(ATTR_META);

function AnimatedBar({ label, value, color, delay }: { label: string; value: number; color: string; delay: number }) {
  const width = useSharedValue(0);
  React.useEffect(() => {
    width.value = withDelay(delay, withTiming(value, { duration: 800 }));
  }, [value]);
  const barStyle = useAnimatedStyle(() => ({ width: `${width.value}%`, backgroundColor: color }));

  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
        <Text style={{ fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.6)" }}>{label}</Text>
        <Text style={{ fontSize: 11, fontWeight: "800", color }}>{Math.round(value)}</Text>
      </View>
      <View style={{ height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.08)" }}>
        <Animated.View style={[barStyle, { height: 5, borderRadius: 3 }]} />
      </View>
    </View>
  );
}

export interface ArchetypeShareData {
  archetype: string;
  archetypeEmoji: string;
  compositeScore: number;
  dimensions: Record<string, number>;
  superpower: string;
  blindSpot: string;
}

interface Props {
  data: ArchetypeShareData;
  showActions?: boolean;
}

export default function ArchetypeShareCard({ data, showActions = true }: Props) {
  const viewRef = useRef<ViewShot>(null);
  const [sharing, setSharing] = useState(false);

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
      <ViewShot ref={viewRef} options={{ format: "png", quality: 1.0, result: "tmpfile" }}>
        <View style={{ width: CARD_WIDTH, borderRadius: 28, overflow: "hidden" }}>
          <LinearGradient
            colors={["#1A1F35", "#0C1120"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ padding: 28, alignItems: "center" }}
          >
            {/* Archetype identity */}
            <Text style={{ fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.35)", letterSpacing: 3, marginBottom: 16 }}>
              MY ARCHETYPE
            </Text>

            <View style={{
              width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center",
              backgroundColor: "rgba(124,58,237,0.15)", borderWidth: 1.5, borderColor: "rgba(124,58,237,0.3)",
              marginBottom: 12,
            }}>
              <Text style={{ fontSize: 38 }}>{data.archetypeEmoji}</Text>
            </View>

            <Text style={{ fontSize: 22, fontWeight: "900", color: "white", textAlign: "center", letterSpacing: -0.3, marginBottom: 6 }}>
              {data.archetype}
            </Text>

            <View style={{ flexDirection: "row", alignItems: "baseline", marginBottom: 24 }}>
              <Text style={{ fontSize: 34, fontWeight: "900", color: "#7C3AED" }}>{data.compositeScore}</Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.3)", marginLeft: 3 }}>/100</Text>
            </View>

            {/* Dimension bars */}
            <View style={{
              width: "100%", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 16, marginBottom: 20,
              borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
            }}>
              {ATTR_KEYS.map((k, i) => (
                <AnimatedBar
                  key={k}
                  label={ATTR_META[k].label}
                  value={data.dimensions[k] ?? 0}
                  color={ATTR_META[k].color}
                  delay={200 + i * 100}
                />
              ))}
            </View>

            {/* Superpower & blind spot */}
            <View style={{ width: "100%", gap: 10 }}>
              <View style={{
                backgroundColor: "rgba(45,212,191,0.08)", borderRadius: 14, padding: 14,
                borderWidth: 1, borderColor: "rgba(45,212,191,0.12)",
              }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                  <Text style={{ fontSize: 13, marginRight: 6 }}>⚡</Text>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#2DD4BF", letterSpacing: 0.5 }}>SUPERPOWER</Text>
                </View>
                <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 19 }}>{data.superpower}</Text>
              </View>

              <View style={{
                backgroundColor: "rgba(167,139,250,0.08)", borderRadius: 14, padding: 14,
                borderWidth: 1, borderColor: "rgba(167,139,250,0.12)",
              }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                  <Text style={{ fontSize: 13, marginRight: 6 }}>🔮</Text>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#A78BFA", letterSpacing: 0.5 }}>BLIND SPOT</Text>
                </View>
                <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 19 }}>{data.blindSpot}</Text>
              </View>
            </View>

            <ShareFooter variant="dark" />
          </LinearGradient>
        </View>
      </ViewShot>

      {showActions && (
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={{ width: CARD_WIDTH, marginTop: 16 }}>
          <Pressable onPress={handleShare} disabled={sharing} style={{ borderRadius: 16, overflow: "hidden" }}>
            <LinearGradient
              colors={["#7C3AED", "#2DD4BF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ paddingVertical: 16, alignItems: "center", borderRadius: 16 }}
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
        </Animated.View>
      )}
    </View>
  );
}
