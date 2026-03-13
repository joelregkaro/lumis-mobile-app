import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { hapticMedium, hapticSuccess } from "@/lib/haptics";
import { colors } from "@/constants/theme";

const c = colors.dark;

const STEPS = [
  { count: 5, sense: "see", emoji: "👁️", prompt: "Name 5 things you can see", color: c.brand.purple },
  { count: 4, sense: "touch", emoji: "✋", prompt: "Name 4 things you can touch", color: c.brand.teal },
  { count: 3, sense: "hear", emoji: "👂", prompt: "Name 3 things you can hear", color: c.brand.gold },
  { count: 2, sense: "smell", emoji: "👃", prompt: "Name 2 things you can smell", color: "#A78BFA" },
  { count: 1, sense: "taste", emoji: "👅", prompt: "Name 1 thing you can taste", color: "#22C55E" },
];

interface GroundingExerciseProps {
  onComplete: () => void;
}

export default function GroundingExercise({ onComplete }: GroundingExerciseProps) {
  const [step, setStep] = useState(0);

  const handleNext = async () => {
    await hapticMedium();
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      await hapticSuccess();
      onComplete();
    }
  };

  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <View style={{ gap: 24 }}>
      {/* Progress */}
      <View style={{ gap: 6 }}>
        <View style={{ height: 4, backgroundColor: c.bg.elevated, borderRadius: 2, overflow: "hidden" }}>
          <View style={{ height: "100%", backgroundColor: current.color, borderRadius: 2, width: `${progress}%` }} />
        </View>
        <Text style={{ fontSize: 12, color: c.text.tertiary, textAlign: "center" }}>
          Step {step + 1} of {STEPS.length}
        </Text>
      </View>

      {/* Current sense */}
      <Animated.View
        key={step}
        entering={FadeInDown.duration(400)}
        style={{ alignItems: "center", gap: 16, paddingVertical: 24 }}
      >
        <Text style={{ fontSize: 56 }}>{current.emoji}</Text>
        <Text style={{ fontSize: 40, fontWeight: "700", color: current.color }}>
          {current.count}
        </Text>
        <Text style={{ fontSize: 18, fontWeight: "600", color: c.text.primary, textAlign: "center" }}>
          {current.prompt}
        </Text>
        <Text style={{ fontSize: 14, color: c.text.secondary, textAlign: "center" }}>
          Take your time. Look around you.
        </Text>
      </Animated.View>

      {/* Next button */}
      <Pressable
        onPress={handleNext}
        style={{
          backgroundColor: `${current.color}20`,
          borderRadius: 14,
          paddingVertical: 16,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <Text style={{ fontSize: 17, fontWeight: "600", color: current.color }}>
          {step < STEPS.length - 1 ? "Next" : "Done"}
        </Text>
        <Ionicons
          name={step < STEPS.length - 1 ? "arrow-forward" : "checkmark"}
          size={18}
          color={current.color}
        />
      </Pressable>
    </View>
  );
}
