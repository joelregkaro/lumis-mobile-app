import { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  FadeIn,
  FadeInDown,
  cancelAnimation,
} from "react-native-reanimated";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { colors } from "@/constants/theme";

const c = colors.dark;

const PATTERNS = [
  {
    key: "box",
    label: "Box Breathing",
    inhale: 4,
    hold1: 4,
    exhale: 4,
    hold2: 4,
    description: "Equal inhale, hold, exhale, hold",
  },
  {
    key: "478",
    label: "4-7-8",
    inhale: 4,
    hold1: 7,
    exhale: 8,
    hold2: 0,
    description: "Deep relaxation technique",
  },
  {
    key: "sigh",
    label: "Physiological Sigh",
    inhale: 3,
    hold1: 0,
    exhale: 6,
    hold2: 2,
    description: "Double inhale, long exhale",
  },
] as const;

type Pattern = (typeof PATTERNS)[number];
type PhaseName = "inhale" | "hold" | "exhale" | "hold2";

interface PhaseConfig {
  name: PhaseName;
  duration: number;
}

interface BreathingExerciseProps {
  onComplete: () => void;
}

export default function BreathingExercise({ onComplete }: BreathingExerciseProps) {
  const [selectedPattern, setSelectedPattern] = useState<Pattern | null>(null);
  const [phase, setPhase] = useState<PhaseName>("inhale");
  const [cycleCount, setCycleCount] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const totalCycles = 4;

  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0.3);
  const completedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, []);

  const buildPhases = useCallback((p: Pattern): PhaseConfig[] => {
    const phases: PhaseConfig[] = [{ name: "inhale", duration: p.inhale }];
    if (p.hold1 > 0) phases.push({ name: "hold", duration: p.hold1 });
    phases.push({ name: "exhale", duration: p.exhale });
    if (p.hold2 > 0) phases.push({ name: "hold2", duration: p.hold2 });
    return phases;
  }, []);

  const animatePhase = useCallback((name: PhaseName, durationMs: number) => {
    if (name === "inhale") {
      scale.value = withTiming(1.0, { duration: durationMs, easing: Easing.inOut(Easing.sin) });
      opacity.value = withTiming(0.8, { duration: durationMs, easing: Easing.inOut(Easing.sin) });
    } else if (name === "exhale") {
      scale.value = withTiming(0.5, { duration: durationMs, easing: Easing.inOut(Easing.sin) });
      opacity.value = withTiming(0.3, { duration: durationMs, easing: Easing.inOut(Easing.sin) });
    }
  }, [scale, opacity]);

  const runSequence = useCallback((pattern: Pattern) => {
    const phases = buildPhases(pattern);
    let cycle = 0;
    let phaseIdx = 0;
    completedRef.current = false;

    const runNextPhase = () => {
      if (completedRef.current) return;

      if (cycle >= totalCycles) {
        completedRef.current = true;
        hapticSuccess();
        onComplete();
        return;
      }

      const current = phases[phaseIdx];
      setPhase(current.name);
      setSecondsLeft(current.duration);
      setCycleCount(cycle);
      animatePhase(current.name, current.duration * 1000);

      if (Platform.OS !== "web") {
        try {
          const Haptics = require("expo-haptics");
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch { /* ignore */ }
      }

      if (tickRef.current) clearInterval(tickRef.current);
      let remaining = current.duration;
      tickRef.current = setInterval(() => {
        remaining--;
        if (remaining >= 0) setSecondsLeft(remaining);
      }, 1000);

      timerRef.current = setTimeout(() => {
        if (tickRef.current) clearInterval(tickRef.current);
        phaseIdx++;
        if (phaseIdx >= phases.length) {
          phaseIdx = 0;
          cycle++;
        }
        runNextPhase();
      }, current.duration * 1000);
    };

    runNextPhase();
  }, [buildPhases, animatePhase, onComplete, totalCycles]);

  const startPattern = useCallback(async (pattern: Pattern) => {
    await hapticLight();
    setSelectedPattern(pattern);
    setCycleCount(0);
    setPhase("inhale");
    scale.value = 0.5;
    opacity.value = 0.3;
    runSequence(pattern);
  }, [runSequence, scale, opacity]);

  const phaseLabel =
    phase === "inhale" ? "Breathe in" :
    phase === "exhale" ? "Breathe out" :
    "Hold";

  if (!selectedPattern) {
    return (
      <View style={{ gap: 20 }}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text style={{ fontSize: 15, color: c.text.secondary, lineHeight: 22, marginBottom: 8 }}>
            Choose a breathing pattern. Each runs for {totalCycles} cycles.
          </Text>
        </Animated.View>
        {PATTERNS.map((p, i) => (
          <Animated.View key={p.key} entering={FadeInDown.delay(i * 80).duration(400)}>
            <Pressable
              onPress={() => startPattern(p)}
              style={{
                backgroundColor: c.bg.surface,
                borderRadius: 16,
                padding: 16,
                borderLeftWidth: 3,
                borderLeftColor: c.brand.teal,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "600", color: c.text.primary }}>{p.label}</Text>
              <Text style={{ fontSize: 13, color: c.text.secondary, marginTop: 4 }}>{p.description}</Text>
              <Text style={{ fontSize: 12, color: c.text.tertiary, marginTop: 6 }}>
                {p.inhale}s in · {p.hold1 > 0 ? `${p.hold1}s hold · ` : ""}{p.exhale}s out{p.hold2 > 0 ? ` · ${p.hold2}s hold` : ""}
              </Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>
    );
  }

  return (
    <View style={{ alignItems: "center", gap: 24, paddingTop: 16 }}>
      <Animated.View entering={FadeIn.duration(600)} style={{ alignItems: "center", justifyContent: "center", width: 220, height: 220 }}>
        <Animated.View
          style={[
            circleStyle,
            {
              width: 220,
              height: 220,
              borderRadius: 110,
              backgroundColor: c.brand.teal,
              position: "absolute",
            },
          ]}
        />
        <View style={{ zIndex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 20, fontWeight: "600", color: "#FFFFFF" }}>
            {phaseLabel}
          </Text>
          <Text style={{ fontSize: 40, fontWeight: "700", color: "#FFFFFF", marginTop: 4 }}>
            {secondsLeft}
          </Text>
        </View>
      </Animated.View>

      <Text style={{ fontSize: 14, color: c.text.secondary }}>
        Cycle {Math.min(cycleCount + 1, totalCycles)} of {totalCycles}
      </Text>

      <View style={{ width: "100%", height: 4, backgroundColor: c.bg.elevated, borderRadius: 2, overflow: "hidden" }}>
        <View
          style={{
            height: "100%",
            backgroundColor: c.brand.teal,
            borderRadius: 2,
            width: `${(cycleCount / totalCycles) * 100}%`,
          }}
        />
      </View>

      <Text style={{ fontSize: 13, color: c.text.tertiary, textAlign: "center" }}>
        {selectedPattern.label}
      </Text>
    </View>
  );
}
