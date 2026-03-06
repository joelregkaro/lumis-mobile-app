import { View, Text, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { hapticLight } from "@/lib/haptics";
import { colors } from "@/constants/theme";

const c = colors.dark;

export interface QuizOption {
  emoji: string;
  label: string;
  subtitle?: string;
  value: number;
}

interface Props {
  question: string;
  subtitle?: string;
  options: QuizOption[];
  selectedValue: number | null;
  onSelect: (value: number) => void;
}

export default function QuizCard({ question, subtitle, options, selectedValue, onSelect }: Props) {
  return (
    <View>
      <Animated.Text
        entering={FadeInDown.duration(300)}
        style={{
          fontSize: 24,
          fontWeight: "700",
          color: c.text.primary,
          marginBottom: subtitle ? 6 : 20,
          lineHeight: 32,
        }}
      >
        {question}
      </Animated.Text>
      {subtitle && (
        <Animated.Text
          entering={FadeInDown.delay(100).duration(300)}
          style={{ fontSize: 15, color: c.text.secondary, marginBottom: 24, lineHeight: 22 }}
        >
          {subtitle}
        </Animated.Text>
      )}
      {options.map((opt, i) => {
        const isSelected = selectedValue === opt.value;
        return (
          <Animated.View key={opt.label} entering={FadeInDown.delay(150 + i * 80).duration(300)}>
            <Pressable
              onPress={async () => {
                await hapticLight();
                onSelect(opt.value);
              }}
              style={{
                marginBottom: 12,
                borderRadius: 16,
                padding: 18,
                backgroundColor: isSelected ? `${c.brand.purple}15` : c.bg.surface,
                borderWidth: 1.5,
                borderColor: isSelected ? `${c.brand.purple}60` : c.bg.border,
                flexDirection: "row",
                alignItems: "center",
              }}
              accessibilityLabel={opt.label}
              accessibilityRole="button"
            >
              <Text style={{ fontSize: 28, marginRight: 14 }}>{opt.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: c.text.primary }}>{opt.label}</Text>
                {opt.subtitle && (
                  <Text style={{ fontSize: 13, color: c.text.secondary, marginTop: 3 }}>{opt.subtitle}</Text>
                )}
              </View>
              {isSelected && (
                <View style={{
                  width: 24, height: 24, borderRadius: 12,
                  backgroundColor: c.brand.purple,
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Text style={{ color: "white", fontSize: 14, fontWeight: "700" }}>✓</Text>
                </View>
              )}
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}
