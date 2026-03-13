import { View, Text, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { hapticLight } from "@/lib/haptics";
import { colors, bento } from "@/constants/theme";

const c = colors.dark;

const MOODS = [
  { score: 2, emoji: "😔", label: "Low" },
  { score: 4, emoji: "😐", label: "Meh" },
  { score: 6, emoji: "🙂", label: "Okay" },
  { score: 8, emoji: "😊", label: "Good" },
  { score: 10, emoji: "😄", label: "Great" },
];

interface QuickMoodRowProps {
  selected: number | null;
  onSelect: (score: number) => void;
  label?: string;
}

export default function QuickMoodRow({
  selected,
  onSelect,
  label = "How are you feeling?",
}: QuickMoodRowProps) {
  const handleSelect = async (score: number) => {
    await hapticLight();
    onSelect(score);
  };

  return (
    <Animated.View entering={FadeInDown.delay(100).duration(400)}>
      <Text
        style={{
          fontSize: 15,
          fontWeight: "600",
          color: c.text.primary,
          marginBottom: 12,
          letterSpacing: -0.3,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {MOODS.map((mood) => {
          const isSelected = selected === mood.score;
          return (
            <Pressable
              key={mood.score}
              onPress={() => handleSelect(mood.score)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${mood.label} mood`}
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: 10,
                borderRadius: bento.radiusSm,
                backgroundColor: isSelected
                  ? `${c.brand.purple}25`
                  : c.bg.surface,
                borderWidth: 1.5,
                borderColor: isSelected ? c.brand.purple : c.glass.border,
              }}
            >
              <Text style={{ fontSize: 24, marginBottom: 4 }}>
                {mood.emoji}
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: isSelected ? "700" : "500",
                  color: isSelected ? c.brand.purpleLight : c.text.tertiary,
                  letterSpacing: 0.3,
                }}
              >
                {mood.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}
