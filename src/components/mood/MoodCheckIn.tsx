import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { hapticLight } from "@/lib/haptics";
import { useMoodStore } from "@/store/mood";

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
    <View style={{ backgroundColor: "#16161D", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#27272A40" }}>
      <Text style={{ fontSize: 15, fontWeight: "600", color: "#F4F4F5", marginBottom: 16 }}>
        How are you feeling?
      </Text>

      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {MOODS.map((mood) => (
          <Pressable key={mood.score} onPress={() => handleSelect(mood.score)} style={{ alignItems: "center" }} accessibilityLabel={`Mood: ${mood.label}`} accessibilityRole="button" accessibilityHint={`Set your mood to ${mood.label}`}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: selected === mood.score ? "#8B5CF620" : "transparent",
                borderWidth: selected === mood.score ? 2 : 0,
                borderColor: "#8B5CF6",
              }}
            >
              <Text style={{ fontSize: 28 }}>{mood.emoji}</Text>
            </View>
            <Text style={{ fontSize: 11, color: selected === mood.score ? "#A78BFA" : "#71717A", marginTop: 6, fontWeight: selected === mood.score ? "600" : "400" }}>
              {mood.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {showSliders && (
        <Animated.View entering={FadeInDown.duration(300)} style={{ marginTop: 20 }}>
          {/* Energy */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ fontSize: 13, color: "#A1A1AA" }}>Energy</Text>
              <Text style={{ fontSize: 13, color: "#2DD4BF", fontWeight: "600" }}>{energy}/10</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 3 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                <Pressable key={v} onPress={() => setEnergy(v)} style={{ flex: 1 }} accessibilityLabel={`Energy level ${v}`} accessibilityRole="button">
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: v <= energy ? "#14B8A6" : "#27272A" }} />
                </Pressable>
              ))}
            </View>
          </View>

          {/* Anxiety */}
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ fontSize: 13, color: "#A1A1AA" }}>Anxiety</Text>
              <Text style={{ fontSize: 13, color: "#C084FC", fontWeight: "600" }}>{anxiety}/10</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 3 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                <Pressable key={v} onPress={() => setAnxiety(v)} style={{ flex: 1 }} accessibilityLabel={`Anxiety level ${v}`} accessibilityRole="button">
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: v <= anxiety ? "#A78BFA" : "#27272A" }} />
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable
            onPress={handleSubmit}
            style={{
              alignItems: "center",
              borderRadius: 12,
              paddingVertical: 12,
              backgroundColor: "#8B5CF6",
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
