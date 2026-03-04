import { useEffect, useMemo } from "react";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/constants/theme";

export type CompanionExpression = "neutral" | "warm" | "curious" | "proud" | "concerned";
export type EvolutionTier = "seedling" | "sprout" | "bloom" | "radiant" | "luminary";

interface Props {
  expression?: CompanionExpression;
  size?: "small" | "medium" | "large";
  tier?: EvolutionTier;
  name?: string;
  showGreeting?: boolean;
  greetingText?: string;
  showTier?: boolean;
}

const SIZES = { small: 32, medium: 80, large: 140 };

const EXPRESSION_GLOWS: Record<CompanionExpression, readonly [string, string]> = {
  neutral: [colors.dark.brand.purple, colors.dark.brand.teal] as const,
  warm: [colors.dark.brand.gold, colors.dark.brand.purple] as const,
  curious: [colors.dark.brand.teal, colors.dark.brand.purpleLight] as const,
  proud: [colors.dark.brand.gold, colors.dark.brand.teal] as const,
  concerned: [colors.dark.status.crisis, colors.dark.brand.purpleLight] as const,
};

const EXPRESSION_FACES: Record<CompanionExpression, string> = {
  neutral: "◕‿◕",
  warm: "◠‿◠",
  curious: "◕‸◕",
  proud: "◠◡◠",
  concerned: "◕_◕",
};

const TIER_CONFIG: Record<EvolutionTier, {
  glowScale: number;
  glowOpacityMin: number;
  glowOpacityMax: number;
  shimmer: boolean;
  particles: number;
  goldenTint: boolean;
  label: string;
}> = {
  seedling: { glowScale: 1.2, glowOpacityMin: 0.2, glowOpacityMax: 0.4, shimmer: false, particles: 0, goldenTint: false, label: "Seedling" },
  sprout: { glowScale: 1.3, glowOpacityMin: 0.35, glowOpacityMax: 0.6, shimmer: false, particles: 0, goldenTint: false, label: "Sprout" },
  bloom: { glowScale: 1.4, glowOpacityMin: 0.5, glowOpacityMax: 0.8, shimmer: true, particles: 3, goldenTint: false, label: "Bloom" },
  radiant: { glowScale: 1.5, glowOpacityMin: 0.6, glowOpacityMax: 0.9, shimmer: true, particles: 5, goldenTint: false, label: "Radiant" },
  luminary: { glowScale: 1.6, glowOpacityMin: 0.7, glowOpacityMax: 1.0, shimmer: true, particles: 7, goldenTint: true, label: "Luminary" },
};

export function getEvolutionTier(streak: number, sessionCount?: number): EvolutionTier {
  const score = streak + (sessionCount ?? 0) * 0.5;
  if (score >= 365) return "luminary";
  if (score >= 90) return "radiant";
  if (score >= 30) return "bloom";
  if (score >= 7) return "sprout";
  return "seedling";
}

export default function CompanionAvatar({
  expression = "neutral",
  size = "medium",
  tier = "seedling",
  name,
  showGreeting = false,
  greetingText,
  showTier = false,
}: Props) {
  const breathScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.6);
  const shimmerOpacity = useSharedValue(0);

  const config = TIER_CONFIG[tier];

  useEffect(() => {
    breathScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.0, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(config.glowOpacityMax, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(config.glowOpacityMin, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    if (config.shimmer) {
      shimmerOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    }
  }, [tier]);

  const breathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
  }));

  const px = SIZES[size];
  const glowColors = EXPRESSION_GLOWS[expression];
  const glowSize = px * config.glowScale;

  const particles = useMemo(() => {
    if (config.particles === 0 || size === "small") return [];
    return Array.from({ length: config.particles }, (_, i) => {
      const angle = (i / config.particles) * Math.PI * 2;
      const radius = px * 0.8;
      return {
        key: i,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        size: 2 + Math.random() * 3,
      };
    });
  }, [config.particles, px, size]);

  return (
    <View className="items-center" accessibilityLabel={`Companion avatar, ${expression} expression, ${tier} tier`} accessibilityRole="image">
      <Animated.View style={[breathStyle, { width: px, height: px }]}>
        <View className="relative items-center justify-center" style={{ width: px, height: px }}>
          {/* Outer glow */}
          <Animated.View
            style={[
              glowStyle,
              {
                position: "absolute",
                width: glowSize,
                height: glowSize,
                borderRadius: glowSize * 0.5,
                top: -(glowSize - px) / 2,
                left: -(glowSize - px) / 2,
              },
            ]}
          >
            <LinearGradient
              colors={[
                `${config.goldenTint ? "#FBBF24" : glowColors[0]}40`,
                `${glowColors[1]}20`,
                "transparent",
              ]}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: glowSize * 0.5,
              }}
            />
          </Animated.View>

          {/* Shimmer overlay (bloom+) */}
          {config.shimmer && size !== "small" && (
            <Animated.View
              style={[
                shimmerStyle,
                {
                  position: "absolute",
                  width: px,
                  height: px,
                  borderRadius: px * 0.5,
                  borderWidth: 1.5,
                  borderColor: config.goldenTint ? "#FBBF2480" : "#FFFFFF40",
                  zIndex: 2,
                },
              ]}
            />
          )}

          {/* Floating particles (bloom+) */}
          {particles.map((p) => (
            <View
              key={p.key}
              style={{
                position: "absolute",
                width: p.size,
                height: p.size,
                borderRadius: p.size / 2,
                backgroundColor: config.goldenTint ? "#FBBF2480" : "#FFFFFF30",
                left: px / 2 + p.x - p.size / 2,
                top: px / 2 + p.y - p.size / 2,
              }}
            />
          ))}

          {/* Main body */}
          <LinearGradient
            colors={config.goldenTint ? ["#FBBF24", glowColors[1]] : [glowColors[0], glowColors[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: px,
              height: px,
              borderRadius: px * 0.5,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {size !== "small" && (
              <Text
                style={{
                  fontSize: px * 0.25,
                  color: "#FFFFFF",
                  textAlign: "center",
                }}
              >
                {EXPRESSION_FACES[expression]}
              </Text>
            )}
          </LinearGradient>
        </View>
      </Animated.View>

      {showTier && tier !== "seedling" && (
        <Text style={{ fontSize: 11, fontWeight: "600", color: config.goldenTint ? "#FBBF24" : "#A78BFA", marginTop: 4, letterSpacing: 1, textTransform: "uppercase" }}>
          {config.label}
        </Text>
      )}

      {showGreeting && (
        <View className="mt-md items-center">
          {name && (
            <Text className="mb-xs text-label uppercase tracking-wider text-text-secondary">
              {name}
            </Text>
          )}
          {greetingText && (
            <Text className="max-w-[250px] text-center text-body text-text-primary">
              {greetingText}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
