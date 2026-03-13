import { useEffect } from "react";
import { View, Text } from "react-native";
import {
  Canvas,
  Circle,
  Fill,
  RadialGradient,
  Shader,
  Skia,
  vec,
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

export type MirrorState = "idle" | "listening" | "thinking" | "encouraging" | "celebrating";
export type CompanionExpression = "neutral" | "warm" | "curious" | "proud" | "concerned";
export type EvolutionTier = "seedling" | "sprout" | "bloom" | "radiant" | "luminary";
export type HeroDropletPreset = "default" | "heroHome" | "heroChat";

interface GlowColors {
  primary: string;
  secondary: string;
  warm: string;
  sparkWarm: string;
}

interface TierConfig {
  glowScale: number;
  label: string;
}

interface PoseTarget {
  tilt: number;
  stretchX: number;
  stretchY: number;
  leanX: number;
  shellBias: number;
  eyeOpen: number;
  eyeSpread: number;
  eyeTilt: number;
  warm: number;
  think: number;
  listen: number;
  encourage: number;
  sway: number;
  drift: number;
}

interface PresetConfig {
  padLarge: number;
  padMedium: number;
  heightLarge: number;
  heightMedium: number;
  glowMin: number;
  glowMax: number;
}

const TIER_CONFIG: Record<EvolutionTier, TierConfig> = {
  seedling: { glowScale: 1.0, label: "Seedling" },
  sprout: { glowScale: 1.05, label: "Sprout" },
  bloom: { glowScale: 1.1, label: "Bloom" },
  radiant: { glowScale: 1.16, label: "Radiant" },
  luminary: { glowScale: 1.22, label: "Luminary" },
};

const EXPRESSION_MAP: Record<CompanionExpression, MirrorState> = {
  neutral: "idle",
  warm: "idle",
  curious: "thinking",
  proud: "encouraging",
  concerned: "listening",
};

const STATE_GLOWS: Record<MirrorState, GlowColors> = {
  idle: {
    primary: "rgba(120, 80, 200, 0.22)",
    secondary: "rgba(200, 170, 240, 0.10)",
    warm: "rgba(255, 194, 120, 0.12)",
    sparkWarm: "rgba(255, 222, 165, 0.40)",
  },
  thinking: {
    primary: "rgba(120, 80, 200, 0.26)",
    secondary: "rgba(200, 170, 240, 0.12)",
    warm: "rgba(255, 180, 120, 0.10)",
    sparkWarm: "rgba(255, 218, 170, 0.42)",
  },
  encouraging: {
    primary: "rgba(140, 90, 210, 0.28)",
    secondary: "rgba(220, 190, 240, 0.14)",
    warm: "rgba(255, 196, 102, 0.18)",
    sparkWarm: "rgba(255, 225, 150, 0.48)",
  },
  listening: {
    primary: "rgba(120, 80, 200, 0.24)",
    secondary: "rgba(190, 170, 240, 0.12)",
    warm: "rgba(255, 188, 128, 0.12)",
    sparkWarm: "rgba(255, 220, 170, 0.42)",
  },
  celebrating: {
    primary: "rgba(150, 100, 220, 0.30)",
    secondary: "rgba(230, 200, 245, 0.16)",
    warm: "rgba(255, 206, 120, 0.20)",
    sparkWarm: "rgba(255, 236, 170, 0.52)",
  },
};

const STATE_POSE: Record<MirrorState, PoseTarget> = {
  idle: {
    tilt: 0, stretchX: 1.0, stretchY: 1.0, leanX: 0, shellBias: 0,
    eyeOpen: 1.0, eyeSpread: 1.0, eyeTilt: 0,
    warm: 0.08, think: 0, listen: 0, encourage: 0,
    sway: 0.0, drift: 0.0,
  },
  thinking: {
    tilt: -0.14, stretchX: 0.97, stretchY: 1.06, leanX: 0.03, shellBias: 0.02,
    eyeOpen: 0.88, eyeSpread: 1.04, eyeTilt: -0.10,
    warm: 0.10, think: 1.0, listen: 0, encourage: 0,
    sway: 0.06, drift: 2.0,
  },
  encouraging: {
    tilt: -0.05, stretchX: 1.03, stretchY: 0.98, leanX: -0.02, shellBias: -0.01,
    eyeOpen: 1.12, eyeSpread: 0.98, eyeTilt: -0.04,
    warm: 0.8, think: 0, listen: 0, encourage: 1.0,
    sway: 0.03, drift: 2.5,
  },
  listening: {
    tilt: 0.28, stretchX: 1.08, stretchY: 0.94, leanX: 0.06, shellBias: 0.04,
    eyeOpen: 0.80, eyeSpread: 0.94, eyeTilt: 0.16,
    warm: 0.15, think: 0, listen: 1.0, encourage: 0,
    sway: 0.10, drift: 1.8,
  },
  celebrating: {
    tilt: -0.06, stretchX: 1.02, stretchY: 1.01, leanX: 0.0, shellBias: -0.01,
    eyeOpen: 1.10, eyeSpread: 1.0, eyeTilt: -0.03,
    warm: 0.9, think: 0, listen: 0, encourage: 1.0,
    sway: 0.04, drift: 2.8,
  },
};

const PRESET_CONFIG: Record<HeroDropletPreset, PresetConfig> = {
  default: {
    padMedium: 20, padLarge: 50,
    heightMedium: 1.08, heightLarge: 1.20,
    glowMin: 0.40, glowMax: 0.56,
  },
  heroHome: {
    padMedium: 26, padLarge: 70,
    heightMedium: 1.10, heightLarge: 1.26,
    glowMin: 0.50, glowMax: 0.72,
  },
  heroChat: {
    padMedium: 24, padLarge: 60,
    heightMedium: 1.08, heightLarge: 1.22,
    glowMin: 0.46, glowMax: 0.66,
  },
};

const SIZES = { small: 36, medium: 132, large: 260 };

export function getEvolutionTier(streak: number, sessionCount?: number): EvolutionTier {
  const score = streak + (sessionCount ?? 0) * 0.5;
  if (score >= 365) return "luminary";
  if (score >= 90) return "radiant";
  if (score >= 30) return "bloom";
  if (score >= 7) return "sprout";
  return "seedling";
}

const DROPLET_SKSL = `
uniform float2 iResolution;
uniform float iTime;
uniform float iGlow;
uniform float iTilt;
uniform float iStretchX;
uniform float iStretchY;
uniform float iLeanX;
uniform float iShellBias;
uniform float iEyeOpen;
uniform float iEyeSpread;
uniform float iEyeTilt;
uniform float iWarm;
uniform float iThink;
uniform float iListen;
uniform float iEncourage;

mat2 rot(float a) {
  float s = sin(a), c = cos(a);
  return mat2(c, -s, s, c);
}

// Egg SDF: width varies with height. Narrow top, wide bottom.
float eggSDF(vec2 p) {
  // Vertical extent: top at y=-0.28, bottom at y=+0.24
  float ny = (p.y + 0.02) / 0.26;  // normalized -1..+1 ish
  // Width profile: narrower at top, wider at bottom
  float w = 0.18 + 0.04 * ny - 0.015 * ny * ny;
  // Elliptical distance
  float dx = p.x / w;
  float dy = p.y / 0.26;
  return length(vec2(dx, dy)) - 1.0;
}

float dropSDF(vec2 uv) {
  vec2 p = rot(-iTilt) * uv;
  p.x -= p.y * iLeanX;
  p.x /= iStretchX;
  p.y /= iStretchY;
  p.x += iShellBias * 0.3;
  return eggSDF(p);
}

vec4 main(vec2 fc) {
  vec2 res = iResolution;
  float mn = min(res.x, res.y);
  vec2 uv = (fc - res * 0.5) / mn;

  float d = dropSDF(uv);

  // Soft outer halo -- very subtle purple glow
  float halo = exp(-max(d, 0.0) * 28.0) * 0.10 * (0.8 + iGlow * 0.2);
  vec3 haloCol = mix(vec3(0.22, 0.14, 0.48), vec3(0.36, 0.22, 0.56), smoothstep(-0.1, 0.15, uv.y));

  if (d > 0.06) {
    return vec4(haloCol * halo, halo * 0.4);
  }

  // Outer edge mask (anti-aliased)
  float outerMask = 1.0 - smoothstep(-0.003, 0.002, d);
  // Inner edge for the glass rim (very thin, ~0.004 units = ~1-2px)
  float innerMask = 1.0 - smoothstep(-0.002, 0.001, d + 0.004);
  float rim = clamp(outerMask - innerMask, 0.0, 1.0);

  // Pose space for interior effects
  vec2 pp = rot(-iTilt) * uv;
  pp.x -= pp.y * iLeanX;
  pp.x /= iStretchX;
  pp.y /= iStretchY;

  // --- Rim color: cool lavender at top, warm amber at bottom ---
  float topness = smoothstep(0.05, -0.24, pp.y);
  float bottomness = smoothstep(-0.04, 0.22, pp.y);
  vec3 rimCool = vec3(0.72, 0.66, 0.88);
  vec3 rimWarm = vec3(0.82, 0.62, 0.26);
  vec3 rimColor = mix(rimCool, rimWarm, bottomness * (0.30 + iWarm * 0.35));
  float rimIntensity = 0.40 + topness * 0.25;

  // --- Dark glass body ---
  vec3 body = mix(
    vec3(0.04, 0.03, 0.10),
    vec3(0.018, 0.012, 0.05),
    smoothstep(-0.18, 0.14, pp.y)
  );

  // Subtle internal glow at center
  float cg = exp(-(pp.x * pp.x * 18.0 + pp.y * pp.y * 14.0)) * 0.06;
  body += vec3(0.08, 0.05, 0.18) * cg;

  // Crown reflection near the top apex
  float crown = exp(-(pp.x * pp.x * 28.0 + (pp.y + 0.22) * (pp.y + 0.22) * 80.0)) * 0.14;
  body += vec3(0.32, 0.28, 0.55) * crown;

  // Warm amber accent at the lower belly
  float warmZone = exp(-(pp.x * pp.x * 16.0 + (pp.y - 0.15) * (pp.y - 0.15) * 55.0));
  body += vec3(0.16, 0.09, 0.02) * warmZone * (0.06 + iWarm * 0.12 + iEncourage * 0.08);

  // Thinking: faint internal swirl
  float tWave = sin(pp.y * 30.0 + pp.x * 12.0 + iTime * 2.0) * 0.5 + 0.5;
  float tMask = exp(-(pp.x * pp.x * 22.0 + pp.y * pp.y * 14.0));
  body += vec3(0.10, 0.06, 0.24) * tWave * tMask * iThink * 0.06;

  // Listening: lean-side shadow
  float lShadow = exp(-((pp.x + 0.03) * (pp.x + 0.03) * 35.0 + pp.y * pp.y * 12.0));
  body *= 1.0 - iListen * lShadow * 0.12;

  // Encouraging: warm bloom from center
  float eBloom = exp(-(pp.x * pp.x * 14.0 + (pp.y - 0.06) * (pp.y - 0.06) * 22.0));
  body += vec3(0.18, 0.09, 0.02) * eBloom * iEncourage * 0.10;

  // --- Visor (dark face cavity for the eyes) ---
  float vTop = smoothstep(0.02, -0.14, pp.y);
  float vBot = 1.0 - smoothstep(-0.10, 0.06, pp.y);
  float vSide = 1.0 - smoothstep(0.08, 0.13, abs(pp.x));
  float visor = clamp(vTop * vBot * vSide, 0.0, 1.0);
  body = mix(body, vec3(0.006, 0.005, 0.020), visor * 0.90);

  // --- Eyes: two distinct small slits ---
  vec2 eyeL = vec2(-0.050 * iEyeSpread, -0.050);
  vec2 eyeR = vec2( 0.050 * iEyeSpread, -0.050);
  eyeL += vec2(-iTilt * 0.012, iListen * 0.006);
  eyeR += vec2(-iTilt * 0.006, iListen * 0.006);

  float et = iEyeTilt + iTilt * 0.28;
  vec2 qL = rot(-et) * (pp - eyeL);
  vec2 qR = rot(-et) * (pp - eyeR);

  // Tight horizontal slits: high x-scale = narrow, very high y-scale = thin
  float openFactor = max(iEyeOpen, 0.1);
  float sL = exp(-(pow(qL.x * (16.0 / openFactor), 2.0) + pow(qL.y * 48.0, 2.0)));
  float sR = exp(-(pow(qR.x * (16.0 / openFactor), 2.0) + pow(qR.y * 48.0, 2.0)));

  // Apply eyes only in the visor zone
  body += vec3(0.40, 0.82, 0.96) * sL * visor * (1.0 + iEncourage * 0.12);
  body += vec3(0.40, 0.82, 0.96) * sR * visor * (1.0 + iEncourage * 0.12);

  // Subtle bloom around each eye
  float bL = exp(-(pow(qL.x * 8.0, 2.0) + pow(qL.y * 18.0, 2.0))) * 0.04;
  float bR = exp(-(pow(qR.x * 8.0, 2.0) + pow(qR.y * 18.0, 2.0))) * 0.04;
  body += vec3(0.25, 0.60, 0.80) * (bL + bR) * visor;

  // --- Composite ---
  float bodyAlpha = innerMask * 0.97;
  vec4 result = vec4(body * bodyAlpha, bodyAlpha);

  // Glass rim on top
  result.rgb += rimColor * rim * rimIntensity;
  result.a = max(result.a, rim * 0.55);

  // Pearl highlight at crown
  float pearl = exp(-(pp.x * pp.x * 24.0 + (pp.y + 0.24) * (pp.y + 0.24) * 85.0)) * outerMask;
  result.rgb += vec3(0.88, 0.84, 0.98) * pearl * 0.32;

  // Side edge specular
  float ny = (pp.y + 0.02) / 0.26;
  float edgeW = 0.18 + 0.04 * ny - 0.015 * ny * ny;
  float sSpec = exp(-pow((abs(pp.x) - edgeW * 0.95) * 26.0, 2.0) - pow(pp.y * 2.8, 2.0)) * outerMask * 0.14;
  result.rgb += rimColor * sSpec;

  // Halo behind (only outside the body)
  result.rgb += haloCol * halo * (1.0 - outerMask);
  result.a = max(result.a, halo * 0.35 * (1.0 - outerMask));

  return result;
}
`;

const dropletEffect = Skia.RuntimeEffect.Make(DROPLET_SKSL);

function SmallDroplet({ glowColors }: { glowColors: GlowColors }) {
  return (
    <Canvas style={{ width: 36, height: 36 }}>
      <Circle cx={18} cy={18} r={16}>
        <RadialGradient
          c={vec(18, 18)}
          r={16}
          colors={["#2A1A50", "#100C2A", "#060412"]}
        />
      </Circle>
      <Circle cx={18} cy={18} r={15.5} color="rgba(200, 185, 240, 0.22)" style="stroke" strokeWidth={1.0} />
      <Circle cx={18} cy={18} r={20}>
        <RadialGradient c={vec(18, 18)} r={20} colors={[glowColors.primary, "transparent"]} />
      </Circle>
      <Circle cx={15.2} cy={17.0} r={1.1} color="rgba(140, 220, 255, 0.65)" />
      <Circle cx={20.8} cy={17.0} r={1.1} color="rgba(140, 220, 255, 0.65)" />
    </Canvas>
  );
}

interface Props {
  expression?: CompanionExpression;
  state?: MirrorState;
  size?: "small" | "medium" | "large";
  tier?: EvolutionTier;
  showTier?: boolean;
  name?: string;
  showGreeting?: boolean;
  greetingText?: string;
  preset?: HeroDropletPreset;
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
  preset = "default",
}: Props) {
  const mirrorState = directState ?? EXPRESSION_MAP[expression];
  const px = SIZES[size];
  const tierConfig = TIER_CONFIG[tier];
  const presetConfig = PRESET_CONFIG[preset];
  const glowColors = STATE_GLOWS[mirrorState];
  const pose = STATE_POSE[mirrorState];

  const renderPad = size === "small" ? 0 : size === "large" ? presetConfig.padLarge : presetConfig.padMedium;
  const baseHeight = size === "large" ? px * presetConfig.heightLarge : px * presetConfig.heightMedium;
  const canvasW = px + renderPad * 2;
  const canvasH = baseHeight + renderPad * 2;
  const isLarge = size === "large";

  const clock = useSharedValue(0);
  const glowIntensity = useSharedValue(presetConfig.glowMin);
  const tilt = useSharedValue(pose.tilt);
  const stretchX = useSharedValue(pose.stretchX);
  const stretchY = useSharedValue(pose.stretchY);
  const leanX = useSharedValue(pose.leanX);
  const shellBias = useSharedValue(pose.shellBias);
  const eyeOpen = useSharedValue(pose.eyeOpen);
  const eyeSpread = useSharedValue(pose.eyeSpread);
  const eyeTilt = useSharedValue(pose.eyeTilt);
  const warm = useSharedValue(pose.warm);
  const think = useSharedValue(pose.think);
  const listen = useSharedValue(pose.listen);
  const encourage = useSharedValue(pose.encourage);
  const driftAmp = useSharedValue(pose.drift);
  const swayAmp = useSharedValue(pose.sway);

  useEffect(() => {
    clock.value = 0;
    clock.value = withRepeat(
      withTiming(Math.PI * 200, { duration: 600000, easing: Easing.linear }),
      -1, false,
    );
    glowIntensity.value = withRepeat(
      withSequence(
        withTiming(presetConfig.glowMax, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
        withTiming(presetConfig.glowMin, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, false,
    );
  }, [presetConfig.glowMax, presetConfig.glowMin]);

  useEffect(() => {
    const next = STATE_POSE[mirrorState];
    const config = { duration: 650, easing: Easing.out(Easing.cubic) };
    tilt.value = withTiming(next.tilt, config);
    stretchX.value = withTiming(next.stretchX, config);
    stretchY.value = withTiming(next.stretchY, config);
    leanX.value = withTiming(next.leanX, config);
    shellBias.value = withTiming(next.shellBias, config);
    eyeOpen.value = withTiming(next.eyeOpen, config);
    eyeSpread.value = withTiming(next.eyeSpread, config);
    eyeTilt.value = withTiming(next.eyeTilt, config);
    warm.value = withTiming(next.warm, config);
    think.value = withTiming(next.think, config);
    listen.value = withTiming(next.listen, config);
    encourage.value = withTiming(next.encourage, config);
    driftAmp.value = withTiming(next.drift, config);
    swayAmp.value = withTiming(next.sway, config);
  }, [mirrorState]);

  const breathScale = useDerivedValue(() => 1.0 + Math.sin(clock.value * 0.92) * 0.010);
  const floatY = useDerivedValue(() => Math.sin(clock.value * 0.88) * (isLarge ? 4.0 : 2.5));
  const driftX = useDerivedValue(() => Math.sin(clock.value * 0.6 + 0.8) * driftAmp.value);
  const sway = useDerivedValue(() => Math.sin(clock.value * 0.75) * swayAmp.value);

  const breathAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: driftX.value },
      { translateY: floatY.value },
      { scale: breathScale.value },
    ],
  }));

  const shaderUniforms = useDerivedValue(() => ({
    iResolution: [canvasW, canvasH] as const,
    iTime: clock.value,
    iGlow: glowIntensity.value,
    iTilt: tilt.value + sway.value,
    iStretchX: stretchX.value,
    iStretchY: stretchY.value,
    iLeanX: leanX.value,
    iShellBias: shellBias.value,
    iEyeOpen: eyeOpen.value,
    iEyeSpread: eyeSpread.value,
    iEyeTilt: eyeTilt.value,
    iWarm: warm.value,
    iThink: think.value,
    iListen: listen.value,
    iEncourage: encourage.value,
  }));

  if (size === "small") {
    return (
      <View
        style={{ alignItems: "center" }}
        accessibilityLabel={`Mirror companion, ${mirrorState} state, ${tier} tier`}
        accessibilityRole="image"
      >
        <SmallDroplet glowColors={glowColors} />
      </View>
    );
  }

  return (
    <View
      style={{ alignItems: "center" }}
      accessibilityLabel={`Mirror companion, ${mirrorState} state, ${tier} tier`}
      accessibilityRole="image"
    >
      <Animated.View style={[breathAnimStyle, { width: canvasW, height: canvasH }]}>
        <Canvas style={{ width: canvasW, height: canvasH }}>
          {dropletEffect && (
            <Fill>
              <Shader source={dropletEffect} uniforms={shaderUniforms} />
            </Fill>
          )}
        </Canvas>
      </Animated.View>

      {showTier && tier !== "seedling" && (
        <Text
          style={{
            fontSize: 11,
            fontWeight: "600",
            color: tier === "luminary" ? "#FBBF24" : "#A78BFA",
            marginTop: 4,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          {tierConfig.label}
        </Text>
      )}

      {showGreeting && (
        <View style={{ marginTop: 16, alignItems: "center" }}>
          {name && (
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: "#9B97C0",
                letterSpacing: 2,
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              {name}
            </Text>
          )}
          {greetingText && (
            <Text
              style={{
                maxWidth: 250,
                textAlign: "center",
                fontSize: 16,
                lineHeight: 25.6,
                color: "#F0EEFF",
              }}
            >
              {greetingText}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
