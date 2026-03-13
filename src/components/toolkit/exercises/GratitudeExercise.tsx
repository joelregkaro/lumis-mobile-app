import { useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { colors } from "@/constants/theme";

const c = colors.dark;

interface GratitudeItem {
  thing: string;
  why: string;
}

interface GratitudeExerciseProps {
  onComplete: (data: Record<string, unknown>) => void;
}

export default function GratitudeExercise({ onComplete }: GratitudeExerciseProps) {
  const [items, setItems] = useState<GratitudeItem[]>([
    { thing: "", why: "" },
    { thing: "", why: "" },
    { thing: "", why: "" },
  ]);
  const [activeIdx, setActiveIdx] = useState(0);

  const current = items[activeIdx];
  const filledCount = items.filter((i) => i.thing.trim()).length;

  const updateItem = (field: "thing" | "why", text: string) => {
    const updated = [...items];
    updated[activeIdx] = { ...updated[activeIdx], [field]: text };
    setItems(updated);
  };

  const handleNext = async () => {
    await hapticLight();
    if (activeIdx < 2) {
      setActiveIdx(activeIdx + 1);
    } else {
      await hapticSuccess();
      onComplete({
        gratitude_items: items.filter((i) => i.thing.trim()).map((i) => ({
          thing: i.thing,
          why: i.why,
        })),
      });
    }
  };

  const handleBack = async () => {
    await hapticLight();
    if (activeIdx > 0) setActiveIdx(activeIdx - 1);
  };

  return (
    <View style={{ gap: 20 }}>
      {/* Dots */}
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
        {[0, 1, 2].map((i) => (
          <Pressable
            key={i}
            onPress={() => setActiveIdx(i)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: activeIdx === i ? c.brand.teal : items[i].thing.trim() ? `${c.brand.teal}30` : c.bg.surface,
            }}
          >
            {items[i].thing.trim() ? (
              <Ionicons name="checkmark" size={16} color={activeIdx === i ? "#FFF" : c.brand.teal} />
            ) : (
              <Text style={{ fontSize: 14, fontWeight: "600", color: activeIdx === i ? "#FFF" : c.text.tertiary }}>
                {i + 1}
              </Text>
            )}
          </Pressable>
        ))}
      </View>

      <Animated.View key={activeIdx} entering={FadeInDown.duration(300)} style={{ gap: 16 }}>
        <View style={{ alignItems: "center", gap: 4 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: c.text.primary }}>
            Gratitude #{activeIdx + 1}
          </Text>
          <Text style={{ fontSize: 14, color: c.text.secondary }}>
            What's something you're grateful for?
          </Text>
        </View>

        <TextInput
          value={current.thing}
          onChangeText={(t) => updateItem("thing", t)}
          placeholder="e.g., A good conversation with my friend today"
          placeholderTextColor={c.text.tertiary}
          style={{
            backgroundColor: c.bg.surface,
            borderRadius: 12,
            padding: 14,
            color: c.text.primary,
            fontSize: 15,
          }}
        />

        {current.thing.trim().length > 0 && (
          <Animated.View entering={FadeInDown.duration(300)} style={{ gap: 6 }}>
            <Text style={{ fontSize: 14, color: c.brand.teal, fontWeight: "500" }}>
              Why does this matter to you?
            </Text>
            <TextInput
              value={current.why}
              onChangeText={(t) => updateItem("why", t)}
              placeholder="Because..."
              placeholderTextColor={c.text.tertiary}
              multiline
              style={{
                backgroundColor: c.bg.surface,
                borderRadius: 12,
                padding: 14,
                color: c.text.primary,
                fontSize: 15,
                minHeight: 60,
                textAlignVertical: "top",
              }}
            />
          </Animated.View>
        )}
      </Animated.View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        {activeIdx > 0 && (
          <Pressable
            onPress={handleBack}
            style={{ flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: "center", backgroundColor: c.bg.surface }}
          >
            <Text style={{ fontSize: 15, fontWeight: "600", color: c.text.secondary }}>Back</Text>
          </Pressable>
        )}
        <Pressable
          onPress={handleNext}
          disabled={!current.thing.trim()}
          style={{
            flex: 2,
            paddingVertical: 16,
            borderRadius: 14,
            alignItems: "center",
            backgroundColor: current.thing.trim() ? c.brand.teal : c.bg.elevated,
            opacity: current.thing.trim() ? 1 : 0.5,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: "700", color: current.thing.trim() ? "#FFF" : c.text.tertiary }}>
            {activeIdx < 2 ? "Next" : `Done (${filledCount}/3)`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
