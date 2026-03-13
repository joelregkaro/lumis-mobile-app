import { useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { colors } from "@/constants/theme";

const c = colors.dark;

const REFRAME_LENSES = [
  { key: "friend", label: "Friend's perspective", prompt: "What would you say to a friend thinking this?" },
  { key: "future", label: "Future self", prompt: "How will you see this in a week? A year?" },
  { key: "evidence", label: "Evidence check", prompt: "What facts actually support or contradict this?" },
  { key: "growth", label: "Growth lens", prompt: "What can you learn from this situation?" },
];

type Step = "negative" | "lens" | "reframe";

interface ReframeExerciseProps {
  onComplete: (data: Record<string, unknown>) => void;
}

export default function ReframeExercise({ onComplete }: ReframeExerciseProps) {
  const [step, setStep] = useState<Step>("negative");
  const [negativeThought, setNegativeThought] = useState("");
  const [selectedLens, setSelectedLens] = useState<string | null>(null);
  const [reframedThought, setReframedThought] = useState("");

  const handleSelectLens = async (key: string) => {
    await hapticLight();
    setSelectedLens(key);
    setStep("reframe");
  };

  const handleComplete = async () => {
    await hapticSuccess();
    onComplete({
      negative_thought: negativeThought,
      lens: selectedLens,
      reframed_thought: reframedThought,
    });
  };

  const selectedLensData = REFRAME_LENSES.find((l) => l.key === selectedLens);

  return (
    <View style={{ gap: 20 }}>
      {step === "negative" && (
        <Animated.View entering={FadeInDown.duration(400)} style={{ gap: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: c.text.primary }}>
            What's the thought?
          </Text>
          <Text style={{ fontSize: 14, color: c.text.secondary, lineHeight: 20 }}>
            Write down the negative or unhelpful thought that's bothering you.
          </Text>
          <TextInput
            value={negativeThought}
            onChangeText={setNegativeThought}
            placeholder="e.g., I always mess things up"
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
            }}
          />
          <Pressable
            onPress={() => { hapticLight(); setStep("lens"); }}
            disabled={!negativeThought.trim()}
            style={{
              paddingVertical: 16,
              borderRadius: 14,
              alignItems: "center",
              backgroundColor: negativeThought.trim() ? c.brand.gold : c.bg.elevated,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: "700", color: negativeThought.trim() ? "#1A1A2E" : c.text.tertiary }}>
              Find a new lens
            </Text>
          </Pressable>
        </Animated.View>
      )}

      {step === "lens" && (
        <Animated.View entering={FadeInDown.duration(400)} style={{ gap: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: c.text.primary }}>
            Choose a perspective
          </Text>
          <View style={{
            backgroundColor: c.bg.surface,
            borderRadius: 12,
            padding: 12,
            borderLeftWidth: 3,
            borderLeftColor: c.text.tertiary,
            opacity: 0.7,
          }}>
            <Text style={{ fontSize: 14, color: c.text.secondary, fontStyle: "italic" }}>
              "{negativeThought}"
            </Text>
          </View>
          {REFRAME_LENSES.map((lens, i) => (
            <Animated.View key={lens.key} entering={FadeInDown.delay(i * 60).duration(300)}>
              <Pressable
                onPress={() => handleSelectLens(lens.key)}
                style={{
                  backgroundColor: c.bg.surface,
                  borderRadius: 14,
                  padding: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <View style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: `${c.brand.gold}15`,
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Ionicons
                    name={
                      lens.key === "friend" ? "people-outline" :
                      lens.key === "future" ? "time-outline" :
                      lens.key === "evidence" ? "search-outline" :
                      "trending-up-outline"
                    }
                    size={18}
                    color={c.brand.gold}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: c.text.primary }}>{lens.label}</Text>
                  <Text style={{ fontSize: 13, color: c.text.secondary }}>{lens.prompt}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={c.text.tertiary} />
              </Pressable>
            </Animated.View>
          ))}
          <Pressable onPress={() => setStep("negative")} style={{ alignItems: "center", paddingVertical: 8 }}>
            <Text style={{ fontSize: 14, color: c.text.tertiary }}>Back</Text>
          </Pressable>
        </Animated.View>
      )}

      {step === "reframe" && selectedLensData && (
        <Animated.View entering={FadeInDown.duration(400)} style={{ gap: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: c.text.primary }}>
            {selectedLensData.label}
          </Text>
          <Text style={{ fontSize: 14, color: c.text.secondary, lineHeight: 20 }}>
            {selectedLensData.prompt}
          </Text>
          <View style={{
            backgroundColor: c.bg.surface,
            borderRadius: 12,
            padding: 12,
            borderLeftWidth: 3,
            borderLeftColor: c.text.tertiary,
            opacity: 0.7,
          }}>
            <Text style={{ fontSize: 14, color: c.text.secondary, fontStyle: "italic" }}>
              "{negativeThought}"
            </Text>
          </View>
          <TextInput
            value={reframedThought}
            onChangeText={setReframedThought}
            placeholder="Write your reframed thought here..."
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
              borderLeftColor: c.brand.teal,
            }}
          />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              onPress={() => setStep("lens")}
              style={{ flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: "center", backgroundColor: c.bg.surface }}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: c.text.secondary }}>Back</Text>
            </Pressable>
            <Pressable
              onPress={handleComplete}
              disabled={!reframedThought.trim()}
              style={{
                flex: 2,
                paddingVertical: 16,
                borderRadius: 14,
                alignItems: "center",
                backgroundColor: reframedThought.trim() ? c.brand.purple : c.bg.elevated,
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: "700", color: reframedThought.trim() ? "#FFF" : c.text.tertiary }}>
                Complete
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      )}
    </View>
  );
}
