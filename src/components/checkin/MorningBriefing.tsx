import { useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import QuickMoodRow from "./QuickMoodRow";
import { hapticSuccess } from "@/lib/haptics";
import { colors } from "@/constants/theme";

const c = colors.dark;

interface MorningBriefingProps {
  focusSummary: string | null;
  topPriorities: string[] | null;
  companionMessage: string | null;
  companionName: string;
  moodScore: number | null;
  onMoodSelect: (score: number) => void;
  onIntentionChange: (text: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export default function MorningBriefing({
  focusSummary,
  topPriorities,
  companionMessage,
  companionName,
  moodScore,
  onMoodSelect,
  onIntentionChange,
  onSubmit,
  isSubmitting,
}: MorningBriefingProps) {
  const [intention, setIntention] = useState("");

  const handleSubmit = async () => {
    await hapticSuccess();
    onSubmit();
  };

  const canSubmit = moodScore != null;

  return (
    <View style={{ gap: 24 }}>
      {/* Companion message */}
      {companionMessage && (
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={{
            backgroundColor: c.bg.surface,
            borderRadius: 16,
            padding: 16,
            borderLeftWidth: 3,
            borderLeftColor: c.brand.purpleLight,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: c.brand.purpleLight,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 6,
            }}
          >
            {companionName} says
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: c.text.primary,
              lineHeight: 22,
              fontStyle: "italic",
            }}
          >
            "{companionMessage}"
          </Text>
        </Animated.View>
      )}

      {/* Focus summary */}
      {focusSummary && (
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: c.text.primary,
              marginBottom: 8,
            }}
          >
            Today's focus
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: c.text.secondary,
              lineHeight: 20,
            }}
          >
            {focusSummary}
          </Text>
        </Animated.View>
      )}

      {/* Top priorities */}
      {topPriorities && topPriorities.length > 0 && (
        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: c.text.tertiary,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 8,
            }}
          >
            Priorities
          </Text>
          {topPriorities.map((p, i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <Ionicons
                name="chevron-forward"
                size={14}
                color={c.brand.teal}
                style={{ marginTop: 3 }}
              />
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: c.text.primary,
                  lineHeight: 20,
                }}
              >
                {p}
              </Text>
            </View>
          ))}
        </Animated.View>
      )}

      {/* Mood */}
      <QuickMoodRow
        selected={moodScore}
        onSelect={onMoodSelect}
        label="How are you starting the day?"
      />

      {/* Intention */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "600",
            color: c.text.primary,
            marginBottom: 8,
          }}
        >
          Set an intention
        </Text>
        <TextInput
          value={intention}
          onChangeText={(text) => {
            setIntention(text);
            onIntentionChange(text);
          }}
          placeholder="Today I want to..."
          placeholderTextColor={c.text.tertiary}
          style={{
            backgroundColor: c.bg.surface,
            borderRadius: 12,
            padding: 14,
            color: c.text.primary,
            fontSize: 15,
          }}
        />
      </Animated.View>

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
          {isSubmitting ? "Saving..." : "Start my day"}
        </Text>
      </Pressable>
    </View>
  );
}
