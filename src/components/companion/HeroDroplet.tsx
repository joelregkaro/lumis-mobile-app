import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  Canvas,
  Fill,
  Shader,
  Skia,
} from "@shopify/react-native-skia";
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

// --- Types & Constants ---
export type MirrorState = "idle" | "listening" | "thinking" | "encouraging" | "celebrating";
export type CompanionExpression = "neutral" | "warm" | "curious" | "proud" | "concerned";
export type EvolutionTier = "seedling" | "sprout" | "bloom" | "radiant" | "luminary";

const SIZES = { small: 40, medium: 160, large: 320 };

// Restored helper used by home screen to derive the evolution tier
export function getEvolutionTier(streak: number, sessionCount?: number): EvolutionTier {
  const score = streak + (sessionCount ?? 0) * 0.5;
  if (score >= 365) return "luminary";
  if (score >= 90) return "radiant";
  if (score >= 30) return "bloom";
  if (score >= 7) return "sprout";
  return "seedling";
}

const EXPRESSION_MAP: Record<CompanionExpression, MirrorState> = {
  neutral: "idle",
  warm: "idle",
  curious: "thinking",
  proud: "encouraging",
  concerned: "listening",
};

// --- High Fidelity SkSL Shader ---
const DROPLET_SKSL = `
uniform float2 iResolution;
uniform float iTime;
uniform float iGlow;
uniform float iTilt;
uniform float iEyeOpen;
uniform float iWarm;
uniform float iThink;

mat2 rot(float a) {
  float s = sin(a), c = cos(a);
  return mat2(c, -s, s, c);
}

float dropletSDF(vec2 p) {
  p.y += 0.08; 
  float k = 0.48; // Controls the "heavy bottom" tapering
  return length(vec2(p.x, p.y)) - (0.26 - k * p.y);
}

vec3 getNormal(vec2 p) {
  float eps = 0.001;
  return normalize(vec3(
    dropletSDF(p + vec2(eps, 0.0)) - dropletSDF(p - vec2(eps, 0.0)),
    dropletSDF(p + vec2(0.0, eps)) - dropletSDF(p - vec2(0.0, eps)),
    0.08
  ));
}

vec4 main(vec2 fc) {
  vec2 res = iResolution;
  vec2 uv = (fc - res * 0.5) / min(res.x, res.y);
  
  // Pose & Animation
  vec2 p = rot(-iTilt) * uv;
  float d = dropletSDF(p);

  // 1. Exterior "Outer Space" Glow
  float aura = exp(-max(d, 0.0) * 6.5) * (0.35 + iGlow * 0.45);
  vec3 auraCol = mix(vec3(0.4, 0.2, 0.8), vec3(0.1, 0.05, 0.3), p.y + 0.5);
  if (d > 0.01) return vec4(auraCol * aura, aura * 0.7);

  // 2. Glass Physics (Normals & Fresnel)
  vec3 N = getNormal(p);
  vec3 V = vec3(0.0, 0.0, 1.0);
  float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  
  // Sharp High-Key Speculars
  vec3 lp1 = normalize(vec3(0.5, 0.8, 1.0)); 
  float spec = pow(max(dot(reflect(-lp1, N), V), 0.0), 50.0) * 2.2;

  // 3. The Core Body
  vec3 body = mix(vec3(0.04, 0.02, 0.1), vec3(0.1, 0.06, 0.25), p.y + 0.4);
  
  // Thinking Ripple (Subtle internal movement)
  float ripple = sin(p.y * 30.0 - iTime * 4.0) * 0.02 * iThink;
  body += vec3(0.2, 0.3, 0.6) * ripple;

  // Internal Belly Glow (Warm state)
  float belly = exp(-length(p - vec2(0.0, 0.15)) * 5.0);
  body += vec3(0.9, 0.5, 0.15) * belly * (0.3 + iWarm * 0.7);

  // 4. Eyes (High Intensity almond slits)
  vec2 eyeL = p - vec2(-0.045, -0.06);
  vec2 eyeR = p - vec2(0.045, -0.06);
  float eyeGlow = exp(-(eyeL.x*eyeL.x*1200.0/iEyeOpen + eyeL.y*eyeL.y*3500.0)) +
                  exp(-(eyeR.x*eyeR.x*1200.0/iEyeOpen + eyeR.y*eyeR.y*3500.0));
  
  // Composite
  vec3 final = mix(body, vec3(1.0), spec);
  final += vec3(0.5, 0.95, 1.0) * eyeGlow * 3.5;
  final = mix(final, vec3(0.75, 0.7, 1.0), fresnel * 0.55); // Edge rim

  return vec4(final, 1.0);
}
`;

const dropletEffect = Skia.RuntimeEffect.Make(DROPLET_SKSL);

interface Props {
  expression?: CompanionExpression;
  state?: MirrorState;
  size?: "small" | "medium" | "large";
  tier?: EvolutionTier;
  showTier?: boolean;
  name?: string;
  showGreeting?: boolean;
  greetingText?: string;
}

export default function HeroDroplet({
  expression = "neutral",
  state: directState,
  size = "medium",
  tier = "seedling",
  showTier = false,
  name,
  showGreeting = false,
  greetingText,
}: Props) {
  const activeState = directState ?? EXPRESSION_MAP[expression];
  const px = SIZES[size];

  // Animation Shared Values
  const clock = useSharedValue(0);
  const glowIntensity = useSharedValue(0.7);

  useEffect(() => {
    clock.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
      -1,
      false
    );
    glowIntensity.value = withRepeat(
      withSequence(
        withTiming(1.0, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.7, { duration: 2500, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );
  }, []);

  // Organic Motion Derived Values
  const floatY = useDerivedValue(() => Math.sin(clock.value) * (size === 'large' ? 10 : 5));
  const sway = useDerivedValue(() => Math.cos(clock.value * 0.6) * 0.05);
  const scale = useDerivedValue(() => 1 + Math.sin(clock.value * 1.1) * 0.02);

  const uniforms = useDerivedValue(() => ({
    iResolution: [px, px * 1.2],
    iTime: clock.value,
    iGlow: glowIntensity.value,
    iTilt: sway.value,
    iEyeOpen: activeState === "thinking" ? 0.6 : 1.0,
    iWarm: activeState === "encouraging" || activeState === "celebrating" ? 1.0 : 0.2,
    iThink: activeState === "thinking" ? 1.0 : 0.0,
  }));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }, { scale: scale.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[animatedStyle, { width: px, height: px * 1.2 }]}>
        <Canvas style={{ flex: 1 }}>
          {dropletEffect && (
            <Fill>
              <Shader source={dropletEffect} uniforms={uniforms} />
            </Fill>
          )}
        </Canvas>
      </Animated.View>

      {/* Re-restored Tier & Text UI */}
      {showTier && tier !== "seedling" && (
        <Text style={[styles.tierText, { color: tier === "luminary" ? "#FBBF24" : "#A78BFA" }]}>
          {tier.toUpperCase()}
        </Text>
      )}

      {showGreeting && (
        <View style={styles.greetingContainer}>
          {name && <Text style={styles.nameText}>{name}</Text>}
          {greetingText && <Text style={styles.greetingText}>{greetingText}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  tierText: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 8,
    letterSpacing: 1.5,
  },
  greetingContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  nameText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9B97C0",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  greetingText: {
    maxWidth: 280,
    textAlign: "center",
    fontSize: 18,
    lineHeight: 26,
    color: "#F0EEFF",
  },
});