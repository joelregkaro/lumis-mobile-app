import { useMemo, useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

interface Props {
  intensity?: "subtle" | "full";
  children?: React.ReactNode;
}

interface StarDot {
  key: number;
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  animated: boolean;
  color: string;
  hasGlow: boolean;
}

const STAR_COUNT_FULL = 280;
const STAR_COUNT_SUBTLE = 50;
const BURST_COUNT = 200;

const WARM_COLORS = ["#FBBF24", "#F5C542", "#FCD34D", "#E8A930", "#D4A017", "#FFD700", "#F0D080"];
const COOL_COLORS = ["#C4B5FD", "#A78BFA", "#DDD6FE", "#E0D4FF"];

function gaussianRandom(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
}

function AnimatedStar({ dot }: { dot: StarDot }) {
  const opacity = useSharedValue(dot.baseOpacity);

  useEffect(() => {
    if (!dot.animated) return;
    opacity.value = withDelay(
      dot.key * 120,
      withRepeat(
        withSequence(
          withTiming(Math.min(dot.baseOpacity * 2.0, 1), { duration: 1800 + dot.key * 60, easing: Easing.inOut(Easing.sin) }),
          withTiming(dot.baseOpacity * 0.2, { duration: 1800 + dot.key * 60, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (dot.hasGlow) {
    return (
      <Animated.View style={[{ position: "absolute", left: dot.x - dot.size, top: dot.y - dot.size }, dot.animated ? style : { opacity: dot.baseOpacity }]}>
        <View style={{
          width: dot.size * 3,
          height: dot.size * 3,
          borderRadius: dot.size * 1.5,
          backgroundColor: dot.color,
          opacity: 0.25,
        }} />
        <View style={{
          position: "absolute",
          left: dot.size,
          top: dot.size,
          width: dot.size,
          height: dot.size,
          borderRadius: dot.size / 2,
          backgroundColor: dot.color,
        }} />
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: dot.x,
          top: dot.y,
          width: dot.size,
          height: dot.size,
          borderRadius: dot.size / 2,
          backgroundColor: dot.color,
        },
        dot.animated ? style : { opacity: dot.baseOpacity },
      ]}
    />
  );
}

export default function CosmicBackground({ intensity = "full", children }: Props) {
  const starCount = intensity === "full" ? STAR_COUNT_FULL : STAR_COUNT_SUBTLE;
  const isFull = intensity === "full";

  const stars = useMemo<StarDot[]>(() => {
    const result: StarDot[] = [];
    let keyIdx = 0;

    // Scattered stars across the screen
    for (let i = 0; i < starCount; i++) {
      const isWarm = Math.random() < 0.55;
      const palette = isWarm ? WARM_COLORS : COOL_COLORS;
      const color = palette[Math.floor(Math.random() * palette.length)];

      const isEdgeStar = Math.random() < 0.20;
      let x: number, y: number;
      if (isEdgeStar) {
        x = Math.random() * SCREEN_W;
        y = Math.random() * SCREEN_H;
      } else {
        x = Math.max(0, Math.min(SCREEN_W, gaussianRandom(SCREEN_W / 2, SCREEN_W * 0.22)));
        y = Math.max(0, Math.min(SCREEN_H, gaussianRandom(SCREEN_H * 0.38, SCREEN_H * 0.20)));
      }

      const isBright = Math.random() < 0.04;
      const size = isBright ? 3 + Math.random() * 2.5 : 1 + Math.random() * 2;
      const baseOpacity = isBright ? 0.5 + Math.random() * 0.35 : 0.10 + Math.random() * 0.35;

      result.push({
        key: keyIdx++,
        x,
        y,
        size,
        baseOpacity,
        animated: i < 30,
        color,
        hasGlow: isBright,
      });
    }

    // Dense warm sparkle cloud concentrated behind the droplet
    if (isFull) {
      for (let i = 0; i < BURST_COUNT; i++) {
        const color = WARM_COLORS[Math.floor(Math.random() * WARM_COLORS.length)];
        const x = Math.max(0, Math.min(SCREEN_W, gaussianRandom(SCREEN_W / 2, SCREEN_W * 0.14)));
        const y = Math.max(0, Math.min(SCREEN_H, gaussianRandom(SCREEN_H * 0.36, SCREEN_H * 0.10)));
        const size = 0.8 + Math.random() * 1.5;
        const baseOpacity = 0.15 + Math.random() * 0.40;

        result.push({
          key: keyIdx++,
          x,
          y,
          size,
          baseOpacity,
          animated: i < 20,
          color,
          hasGlow: false,
        });
      }
    }

    return result;
  }, [starCount, isFull]);

  const primaryGlowSize = isFull ? 500 : 260;

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Layer 1: Solid dark base */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#050714" }]} />

      {/* Layer 2: Rich purple gradient */}
      <LinearGradient
        colors={isFull
          ? ["#241552", "#1e1248", "#18103e", "#120c30", "#0c0822", "#070616"]
          : ["#160e38", "#120c30", "#0c0a24", "#080818", "#050714"]
        }
        locations={isFull ? [0, 0.18, 0.35, 0.55, 0.78, 1] : [0, 0.2, 0.45, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Layer 3: Large diffuse purple nebula */}
      {isFull && (
        <View
          style={{
            position: "absolute",
            width: SCREEN_W * 1.6,
            height: SCREEN_H * 0.7,
            borderRadius: SCREEN_W * 0.8,
            backgroundColor: "#2a1860",
            opacity: 0.26,
            left: (SCREEN_W - SCREEN_W * 1.6) / 2,
            top: SCREEN_H * 0.08,
          }}
        />
      )}

      {/* Layer 4a: Primary central glow */}
      <View
        style={{
          position: "absolute",
          width: primaryGlowSize,
          height: primaryGlowSize,
          borderRadius: primaryGlowSize / 2,
          backgroundColor: "#5C24B0",
          opacity: isFull ? 0.22 : 0.10,
          left: (SCREEN_W - primaryGlowSize) / 2,
          top: SCREEN_H * 0.20,
          shadowColor: "#7C3AED",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 100,
        }}
      />

      {/* Layer 4b: Warm golden nebula behind droplet */}
      {isFull && (
        <View
          style={{
            position: "absolute",
            width: 260,
            height: 260,
            borderRadius: 130,
            backgroundColor: "#5A3A10",
            opacity: 0.14,
            left: (SCREEN_W - 260) / 2,
            top: SCREEN_H * 0.30,
            shadowColor: "#FBBF24",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.35,
            shadowRadius: 70,
          }}
        />
      )}

      {/* Layer 4c: Tight purple hotspot */}
      {isFull && (
        <View
          style={{
            position: "absolute",
            width: 160,
            height: 160,
            borderRadius: 80,
            backgroundColor: "#6B30C0",
            opacity: 0.10,
            left: (SCREEN_W - 160) / 2,
            top: SCREEN_H * 0.33,
            shadowColor: "#A78BFA",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.35,
            shadowRadius: 45,
          }}
        />
      )}

      {/* Layer 5: Gentle vignette */}
      <LinearGradient
        colors={["rgba(5, 7, 20, 0.35)", "transparent", "transparent", "transparent", "rgba(5, 7, 20, 0.55)"]}
        locations={[0, 0.12, 0.5, 0.85, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(5, 7, 20, 0.45)", "transparent", "transparent", "rgba(5, 7, 20, 0.45)"]}
        locations={[0, 0.15, 0.85, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Layer 6: Stardust */}
      {stars.map((dot) => (
        <AnimatedStar key={dot.key} dot={dot} />
      ))}

      {children}
    </View>
  );
}
