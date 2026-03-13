import { useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { colors } from "@/constants/theme";

const c = colors.dark;

const STEPS = [
  {
    key: "mindfulness",
    title: "Acknowledge the pain",
    prompt: "What are you struggling with right now? Name it without judgment.",
    placeholder: "e.g., I'm feeling overwhelmed by work pressure and it hurts",
    color: c.brand.purple,
    emoji: "🧘",
  },
  {
    key: "humanity",
    title: "Common humanity",
    prompt: "You're not alone in this. Many people experience this. What would you say to remind yourself?",
    placeholder: "e.g., Lots of people feel this way under pressure. It's a human experience.",
    color: c.brand.teal,
    emoji: "🤝",
  },
  {
    key: "kindness",
    title: "Self-kindness",
    prompt: "What would you say to a close friend going through this? Now say it to yourself.",
    placeholder: "e.g., You're doing your best. It's okay to struggle sometimes.",
    color: "#E07373",
    emoji: "💜",
  },
] as const;

interface SelfCompassionProps {
  onComplete: (data: Record<string, unknown>) => void;
}

export default function SelfCompassion({ onComplete }: SelfCompassionProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [responses, setResponses] = useState<string[]>(["", "", ""]);

  const current = STEPS[stepIdx];
  const currentResponse = responses[stepIdx];
  const progress = ((stepIdx + 1) / STEPS.length) * 100;

  const updateResponse = (text: string) => {
    const updated = [...responses];
    updated[stepIdx] = text;
    setResponses(updated);
  };

  const handleNext = async () => {
    await hapticLight();
    if (stepIdx < STEPS.length - 1) {
      setStepIdx(stepIdx + 1);
    } else {
      await hapticSuccess();
      onComplete({
        mindfulness: responses[0],
        common_humanity: responses[1],
        self_kindness: responses[2],
      });
    }
  };

  const handleBack = async () => {
    await hapticLight();
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
  };

  return (
    <View style={{ gap: 20 }}>
      {/* Progress */}
      <View style={{ gap: 6 }}>
        <View style={{ height: 4, backgroundColor: c.bg.elevated, borderRadius: 2, overflow: "hidden" }}>
          <View style={{ height: "100%", backgroundColor: current.color, borderRadius: 2, width: `${progress}%` }} />
        </View>
        <Text style={{ fontSize: 12, color: c.text.tertiary, textAlign: "center" }}>
          {current.key === "mindfulness" ? "Mindfulness" : current.key === "humanity" ? "Common Humanity" : "Self-Kindness"}
        </Text>
      </View>

      <Animated.View key={stepIdx} entering={FadeInDown.duration(400)} style={{ gap: 16 }}>
        <View style={{ alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 40 }}>{current.emoji}</Text>
          <Text style={{ fontSize: 18, fontWeight: "700", color: c.text.primary, textAlign: "center" }}>
            {current.title}
          </Text>
        </View>

        <Text style={{ fontSize: 15, color: c.text.secondary, lineHeight: 22, textAlign: "center" }}>
          {current.prompt}
        </Text>

        <TextInput
          value={currentResponse}
          onChangeText={updateResponse}
          placeholder={current.placeholder}
          placeholderTextColor={c.text.tertiary}
          multiline
          style={{
            backgroundColor: c.bg.surface,
            borderRadius: 12,
            padding: 14,
            color: c.text.primary,
            fontSize: 15,
            minHeight: 80,
            textAlignVertical: "top",
            borderLeftWidth: 3,
            borderLeftColor: current.color,
          }}
        />
      </Animated.View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        {stepIdx > 0 && (
          <Pressable
            onPress={handleBack}
            style={{ flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: "center", backgroundColor: c.bg.surface }}
          >
            <Text style={{ fontSize: 15, fontWeight: "600", color: c.text.secondary }}>Back</Text>
          </Pressable>
        )}
        <Pressable
          onPress={handleNext}
          disabled={!currentResponse.trim()}
          style={{
            flex: 2,
            paddingVertical: 16,
            borderRadius: 14,
            alignItems: "center",
            backgroundColor: currentResponse.trim() ? current.color : c.bg.elevated,
            opacity: currentResponse.trim() ? 1 : 0.5,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: "700", color: currentResponse.trim() ? "#FFF" : c.text.tertiary }}>
            {stepIdx < STEPS.length - 1 ? "Next" : "Complete"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
