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

float eggSDF(vec2 p) {
  float t = clamp((p.y + 0.02) / 0.46 + 0.5, 0.0, 1.0);
  float w = mix(0.15, 0.25, t) - 0.035 * t * t;
  return length(vec2(p.x / max(w, 0.01), p.y / 0.27)) - 1.0;
}

vec2 poseSpace(vec2 uv) {
  vec2 p = rot(-iTilt) * uv;
  p.x -= p.y * iLeanX;
  p.x /= iStretchX;
  p.y /= iStretchY;
  p.x += iShellBias * 0.3;
  return p;
}

// Fake 3D normal from 2D SDF (imadr technique, finite-diff for SkSL)
vec3 eggNormal(vec2 p, float d, float thickness) {
  float eps = 0.002;
  vec2 grad = vec2(
    eggSDF(p + vec2(eps, 0.0)) - eggSDF(p - vec2(eps, 0.0)),
    eggSDF(p + vec2(0.0, eps)) - eggSDF(p - vec2(0.0, eps))
  ) / (2.0 * eps);
  float nc = clamp((thickness + d) / thickness, 0.0, 1.0);
  float ns = sqrt(max(1.0 - nc * nc, 0.0));
  return normalize(vec3(grad * nc, ns + 0.001));
}

float fresnelSchlick(float cosTheta, float f0) {
  return f0 + (1.0 - f0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

float blinnPhong(vec3 n, vec3 v, vec3 l, float shininess) {
  vec3 h = normalize(v + l);
  return pow(max(dot(n, h), 0.0), shininess);
}

vec4 main(vec2 fc) {
  vec2 res = iResolution;
  float mn = min(res.x, res.y);
  vec2 uv = (fc - res * 0.5) / mn;

  vec2 p = poseSpace(uv);
  float d = eggSDF(p);

  // --- Ambient halo around the droplet ---
  float haloStr = exp(-max(d, 0.0) * 18.0) * 0.16 * (0.7 + iGlow * 0.3);
  vec3 haloCol = mix(vec3(0.28, 0.16, 0.56), vec3(0.42, 0.26, 0.64), smoothstep(-0.1, 0.2, p.y));
  if (d > 0.10) return vec4(haloCol * haloStr, haloStr * 0.5);

  float outer = 1.0 - smoothstep(-0.004, 0.002, d);
  if (outer < 0.001) return vec4(haloCol * haloStr, haloStr * 0.5);

  // --- Physically-based glass lighting via fake 3D normals ---
  float thickness = 0.08;
  vec3 N = eggNormal(p, d, thickness);
  vec3 V = vec3(0.0, 0.0, 1.0);
  float NdotV = max(dot(N, V), 0.0);

  // Fresnel rim (Schlick, F0=0.04 for glass)
  float fres = fresnelSchlick(NdotV, 0.04);

  // Boost fresnel at edge zone where the bevel is steepest
  float edgeBand = smoothstep(-thickness, 0.0, d) * (1.0 - smoothstep(0.0, 0.003, d));
  fres = fres + edgeBand * 0.4;

  // Three light sources matching the reference image
  vec3 lightCrown    = normalize(vec3( 0.05,  0.8,  0.6));
  vec3 lightLeft     = normalize(vec3(-0.7,   0.2,  0.5));
  vec3 lightBottom   = normalize(vec3( 0.0,  -0.7,  0.5));

  vec3 colCrown  = vec3(0.95, 0.92, 1.0);
  vec3 colLeft   = vec3(0.82, 0.78, 1.0);
  vec3 colBottom = vec3(1.0, 0.78, 0.32);

  float specCrown  = blinnPhong(N, V, lightCrown,  80.0) * 3.5;
  float specLeft   = blinnPhong(N, V, lightLeft,   60.0) * 2.2;
  float specBottom = blinnPhong(N, V, lightBottom,  50.0) * 2.8;

  // Diffuse contribution (subtle, keeps the form visible)
  float diffCrown  = max(dot(N, lightCrown),  0.0) * 0.15;
  float diffLeft   = max(dot(N, lightLeft),   0.0) * 0.10;
  float diffBottom = max(dot(N, lightBottom), 0.0) * 0.12;

  // Warm boost from state
  float warmMul = 1.0 + iWarm * 0.4 + iEncourage * 0.2;

  vec3 specTotal = colCrown  * (specCrown + diffCrown)
                 + colLeft   * (specLeft  + diffLeft)
                 + colBottom * (specBottom + diffBottom) * warmMul;

  // Reflected environment approximation (purple-tinted upper hemisphere)
  vec3 R = reflect(-V, N);
  float envUp = smoothstep(-0.2, 0.6, R.y);
  vec3 envColor = mix(vec3(0.08, 0.04, 0.18), vec3(0.25, 0.18, 0.42), envUp);
  vec3 reflected = envColor * fres * 1.8;

  vec3 rimLight = specTotal + reflected;

  // --- Dark glass interior (deep indigo, not pure black) ---
  vec3 body = mix(
    vec3(0.06, 0.04, 0.14),
    vec3(0.025, 0.018, 0.07),
    smoothstep(-0.20, 0.12, p.y)
  );

  // Subtle purple depth in the center
  float depth = exp(-(p.x * p.x * 10.0 + (p.y + 0.04) * (p.y + 0.04) * 7.0)) * 0.14;
  body += vec3(0.14, 0.10, 0.28) * depth;

  // Internal silver reflection band (upper area)
  float refBand = exp(-(p.x * p.x * 8.0 + (p.y + 0.14) * (p.y + 0.14) * 45.0)) * 0.16;
  body += vec3(0.34, 0.30, 0.55) * refBand;

  // Internal warm golden light (lower belly)
  float warmInt = exp(-(p.x * p.x * 8.0 + (p.y - 0.10) * (p.y - 0.10) * 25.0));
  body += vec3(0.24, 0.15, 0.04) * warmInt * (0.14 + iWarm * 0.18 + iEncourage * 0.12);

  // Thinking: subtle ripple
  float tw = sin(p.y * 28.0 + p.x * 12.0 + iTime * 2.0) * 0.5 + 0.5;
  float tm = exp(-(p.x * p.x * 18.0 + p.y * p.y * 10.0));
  body += vec3(0.10, 0.06, 0.22) * tw * tm * iThink * 0.07;

  // Listening: shadow on lean side
  float ls = exp(-((p.x + 0.04) * (p.x + 0.04) * 28.0 + p.y * p.y * 10.0));
  body *= 1.0 - iListen * ls * 0.12;

  // Encouraging: warm bloom
  float eb = exp(-(p.x * p.x * 12.0 + (p.y - 0.04) * (p.y - 0.04) * 18.0));
  body += vec3(0.18, 0.10, 0.02) * eb * iEncourage * 0.10;

  // --- Visor: dark face region ---
  float vT = smoothstep(0.02, -0.16, p.y);
  float vB = 1.0 - smoothstep(-0.12, 0.04, p.y);
  float vS = 1.0 - smoothstep(0.08, 0.14, abs(p.x));
  float visor = clamp(vT * vB * vS, 0.0, 1.0);
  body = mix(body, vec3(0.008, 0.006, 0.024), visor * 0.88);

  // --- Eyes: narrow almond slits ---
  float esp = iEyeSpread;
  vec2 eL = vec2(-0.046 * esp - iTilt * 0.012, -0.060 + iListen * 0.006);
  vec2 eR = vec2( 0.046 * esp - iTilt * 0.006, -0.060 + iListen * 0.006);
  float et = iEyeTilt + iTilt * 0.28;
  vec2 qL = rot(-et) * (p - eL);
  vec2 qR = rot(-et) * (p - eR);
  float op = max(iEyeOpen, 0.1);
  float sL = exp(-(pow(qL.x * (12.0 / op), 2.0) + pow(qL.y * 36.0, 2.0)));
  float sR = exp(-(pow(qR.x * (12.0 / op), 2.0) + pow(qR.y * 36.0, 2.0)));
  float eyeVis = visor * 0.96;
  body += vec3(0.55, 0.92, 1.0) * sL * eyeVis * (1.6 + iEncourage * 0.15);
  body += vec3(0.55, 0.92, 1.0) * sR * eyeVis * (1.6 + iEncourage * 0.15);
  float gL = exp(-(pow(qL.x * 5.0, 2.0) + pow(qL.y * 12.0, 2.0))) * 0.08;
  float gR = exp(-(pow(qR.x * 5.0, 2.0) + pow(qR.y * 12.0, 2.0))) * 0.08;
  body += vec3(0.32, 0.68, 0.88) * (gL + gR) * eyeVis;

  // --- Final composite ---
  float interiorMask = 1.0 - smoothstep(-0.002, 0.001, d + 0.006);
  float bodyAlpha = interiorMask * 0.97;
  vec4 result = vec4(body * bodyAlpha, bodyAlpha);

  // Add physically-based rim/specular on top
  float rimStr = length(rimLight);
  float rimAlpha = clamp(rimStr * 0.6, 0.0, 1.0) * outer;
  result.rgb += rimLight * 1.6 * outer;
  result.a = max(result.a, rimAlpha);

  // Halo behind (outside the form)
  float behindMask = 1.0 - outer;
  result.rgb += haloCol * haloStr * behindMask;
  result.a = max(result.a, haloStr * 0.4 * behindMask);

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
