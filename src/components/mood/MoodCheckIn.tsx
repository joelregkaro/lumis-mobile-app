import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { hapticLight } from "@/lib/haptics";
import { useMoodStore } from "@/store/mood";
import { colors, bento, shadow } from "@/constants/theme";

const c = colors.dark;

const MOODS = [
  { score: 2, emoji: "😔", label: "Struggling" },
  { score: 4, emoji: "😕", label: "Tough" },
  { score: 6, emoji: "😐", label: "Okay" },
  { score: 8, emoji: "🙂", label: "Good" },
  { score: 10, emoji: "😊", label: "Great" },
];

interface Props {
  onComplete?: () => void;
}

export default function MoodCheckIn({ onComplete }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [showSliders, setShowSliders] = useState(false);
  const [energy, setEnergy] = useState(5);
  const [anxiety, setAnxiety] = useState(5);
  const logMood = useMoodStore((s) => s.logMood);

  const handleSelect = async (score: number) => {
    await hapticLight();
    setSelected(score);
    setShowSliders(true);
  };

  const handleSubmit = async () => {
    if (selected === null) return;
    await logMood({ mood_score: selected, energy_level: energy, anxiety_level: anxiety });
    await hapticLight();
    onComplete?.();
  };

  return (
    <View style={{
      backgroundColor: c.bg.surface,
      borderRadius: bento.radiusSm,
      padding: bento.padding,
      borderWidth: 1,
      borderColor: c.glass.border,
      ...shadow.card,
    }}>
      <Text style={{ fontSize: 15, fontWeight: "600", color: c.text.primary, marginBottom: 16 }}>
        How are you feeling?
      </Text>

      <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
        {MOODS.map((mood) => {
          const isSelected = selected === mood.score;
          return (
            <Pressable
              key={mood.score}
              onPress={() => handleSelect(mood.score)}
              style={{ alignItems: "center", width: 56 }}
              accessibilityLabel={`Mood: ${mood.label}`}
              accessibilityRole="button"
              accessibilityHint={`Set your mood to ${mood.label}`}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: bento.radiusSm,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isSelected ? `${c.brand.purple}25` : c.bg.primary,
                  borderWidth: isSelected ? 2 : 1,
                  borderColor: isSelected ? c.brand.purple : c.glass.border,
                }}
              >
                <Text style={{ fontSize: 24 }}>{mood.emoji}</Text>
              </View>
              <Text style={{
                fontSize: 10,
                color: isSelected ? c.brand.purpleLight : c.text.tertiary,
                marginTop: 6,
                fontWeight: isSelected ? "700" : "500",
                letterSpacing: 0.3,
              }}>
                {mood.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {showSliders && (
        <Animated.View entering={FadeInDown.duration(300)} style={{ marginTop: 20 }}>
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ fontSize: 13, color: c.text.secondary }}>Energy</Text>
              <Text style={{ fontSize: 13, color: c.brand.teal, fontWeight: "600" }}>{energy}/10</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 3 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                <Pressable key={v} onPress={() => setEnergy(v)} style={{ flex: 1, paddingVertical: 8 }} accessibilityLabel={`Energy level ${v}`} accessibilityRole="button">
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: v <= energy ? c.brand.teal : c.bg.elevated }} />
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ fontSize: 13, color: c.text.secondary }}>Anxiety</Text>
              <Text style={{ fontSize: 13, color: c.brand.purpleFaint, fontWeight: "600" }}>{anxiety}/10</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 3 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                <Pressable key={v} onPress={() => setAnxiety(v)} style={{ flex: 1, paddingVertical: 8 }} accessibilityLabel={`Anxiety level ${v}`} accessibilityRole="button">
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: v <= anxiety ? c.brand.purpleLight : c.bg.elevated }} />
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable
            onPress={handleSubmit}
            style={{
              alignItems: "center",
              borderRadius: bento.radiusSm,
              paddingVertical: 13,
              backgroundColor: c.brand.purple,
              ...shadow.hero,
            }}
            accessibilityLabel="Submit mood check-in"
            accessibilityRole="button"
          >
            <Text style={{ fontSize: 15, fontWeight: "600", color: "white" }}>Check in</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}
