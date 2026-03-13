import { useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import QuickMoodRow from "./QuickMoodRow";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { colors } from "@/constants/theme";

const c = colors.dark;

interface PatternCheckProps {
  description: string;
  patternType: string;
  moodScore: number | null;
  onMoodSelect: (score: number) => void;
  onAcknowledge: (value: boolean) => void;
  onNoteChange: (text: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export default function PatternCheck({
  description,
  patternType,
  moodScore,
  onMoodSelect,
  onAcknowledge,
  onNoteChange,
  onSubmit,
  isSubmitting,
}: PatternCheckProps) {
  const [acknowledged, setAcknowledged] = useState<boolean | null>(null);
  const [note, setNote] = useState("");

  const handleAcknowledge = async (value: boolean) => {
    await hapticLight();
    setAcknowledged(value);
    onAcknowledge(value);
  };

  const handleSubmit = async () => {
    await hapticSuccess();
    onSubmit();
  };

  const canSubmit = acknowledged != null && moodScore != null;
  const typeLabel = patternType.replace(/_/g, " ");

  return (
    <View style={{ gap: 24 }}>
      {/* Pattern card */}
      <Animated.View
        entering={FadeInDown.duration(400)}
        style={{
          backgroundColor: c.bg.surface,
          borderRadius: 16,
          padding: 16,
          borderLeftWidth: 3,
          borderLeftColor: c.brand.teal,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginBottom: 10,
          }}
        >
          <Ionicons
            name="git-network-outline"
            size={14}
            color={c.brand.teal}
          />
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: c.brand.teal,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {typeLabel}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 16,
            color: c.text.primary,
            lineHeight: 24,
          }}
        >
          {description.startsWith("You")
            ? description
            : `You tend to ${description.toLowerCase()}`}
        </Text>
      </Animated.View>

      {/* Acknowledgment */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "600",
            color: c.text.primary,
            marginBottom: 12,
          }}
        >
          Does this resonate?
        </Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={() => handleAcknowledge(true)}
            accessibilityRole="radio"
            accessibilityState={{ selected: acknowledged === true }}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor:
                acknowledged === true
                  ? `${c.brand.teal}20`
                  : c.bg.surface,
              borderWidth: 1.5,
              borderColor:
                acknowledged === true ? c.brand.teal : "transparent",
            }}
          >
            <Ionicons
              name="checkmark"
              size={18}
              color={
                acknowledged === true ? c.brand.teal : c.text.tertiary
              }
            />
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color:
                  acknowledged === true ? c.brand.teal : c.text.tertiary,
              }}
            >
              Yes, I see it
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleAcknowledge(false)}
            accessibilityRole="radio"
            accessibilityState={{ selected: acknowledged === false }}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor:
                acknowledged === false
                  ? `${c.text.secondary}20`
                  : c.bg.surface,
              borderWidth: 1.5,
              borderColor:
                acknowledged === false ? c.text.secondary : "transparent",
            }}
          >
            <Ionicons
              name="help"
              size={18}
              color={
                acknowledged === false
                  ? c.text.secondary
                  : c.text.tertiary
              }
            />
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color:
                  acknowledged === false
                    ? c.text.secondary
                    : c.text.tertiary,
              }}
            >
              Not sure
            </Text>
          </Pressable>
        </View>
      </Animated.View>

      {/* Optional reflection */}
      {acknowledged != null && (
        <Animated.View entering={FadeInDown.duration(300)}>
          <TextInput
            value={note}
            onChangeText={(text) => {
              setNote(text);
              onNoteChange(text);
            }}
            placeholder={
              acknowledged
                ? "Any thoughts on this pattern?"
                : "What feels off about it?"
            }
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

      {/* Mood */}
      <QuickMoodRow selected={moodScore} onSelect={onMoodSelect} />

      {/* Submit */}
      <Pressable
        onPress={handleSubmit}
        disabled={!canSubmit || isSubmitting}
        accessibilityRole="button"
        style={{
          backgroundColor: canSubmit ? c.brand.purple : c.bg.elevated,
          borderRadius: 14,
          paddingVertical: 16,
          alignItems: "center",
          opacity: isSubmitting ? 0.6 : 1,
        }}
      >
        <Text
          style={{
            fontSize: 17,
            fontWeight: "700",
            color: canSubmit ? "#FFFFFF" : c.text.tertiary,
          }}
        >
          {isSubmitting ? "Saving..." : "Done"}
        </Text>
      </Pressable>
    </View>
  );
}
