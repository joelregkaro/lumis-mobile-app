import { useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import QuickMoodRow from "./QuickMoodRow";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { colors } from "@/constants/theme";
import type { CommitmentOutcome } from "@/store/checkin";

const c = colors.dark;

const OUTCOMES: {
  key: CommitmentOutcome;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  { key: "done", label: "Did it", icon: "checkmark-circle", color: c.brand.teal },
  { key: "partially", label: "Partially", icon: "ellipse-outline", color: c.brand.gold },
  { key: "not_done", label: "Not yet", icon: "close-circle-outline", color: c.text.tertiary },
  { key: "rescheduled", label: "Reschedule", icon: "calendar-outline", color: c.brand.purpleLight },
];

interface CommitmentCheckProps {
  actionItem: string;
  context: string | null;
  isOverdue: boolean;
  overdueCount: number;
  completedThisWeek: number;
  totalCompleted: number;
  companionName: string;
  moodScore: number | null;
  onMoodSelect: (score: number) => void;
  onOutcomeSelect: (outcome: CommitmentOutcome) => void;
  onNoteChange: (text: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export default function CommitmentCheck({
  actionItem,
  context,
  isOverdue,
  overdueCount,
  completedThisWeek,
  totalCompleted,
  companionName,
  moodScore,
  onMoodSelect,
  onOutcomeSelect,
  onNoteChange,
  onSubmit,
  isSubmitting,
}: CommitmentCheckProps) {
  const [selectedOutcome, setSelectedOutcome] =
    useState<CommitmentOutcome | null>(null);
  const [note, setNote] = useState("");

  const handleOutcome = async (outcome: CommitmentOutcome) => {
    await hapticLight();
    setSelectedOutcome(outcome);
    onOutcomeSelect(outcome);
  };

  const handleSubmit = async () => {
    await hapticSuccess();
    onSubmit();
  };

  const canSubmit = selectedOutcome != null && moodScore != null;

  return (
    <View style={{ gap: 20 }}>
      {/* Overdue context banner */}
      {isOverdue && (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={{
            backgroundColor: `${c.brand.gold}12`,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Ionicons name="time-outline" size={16} color={c.brand.gold} />
          <Text style={{ fontSize: 13, color: c.brand.gold, flex: 1, lineHeight: 18 }}>
            {overdueCount > 1
              ? `You have ${overdueCount} experiments to catch up on. No pressure — let's start with this one.`
              : `This one's from a few days ago. Let's check in.`}
          </Text>
        </Animated.View>
      )}

      {/* Commitment card */}
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
        <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: c.text.tertiary,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 8,
          }}
        >
          Your experiment
        </Text>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: c.text.primary,
            lineHeight: 22,
          }}
        >
          {actionItem}
        </Text>
        {context && (
          <Text
            style={{
              fontSize: 13,
              color: c.text.secondary,
              marginTop: 6,
              lineHeight: 18,
            }}
          >
            {context}
          </Text>
        )}
      </Animated.View>

      {/* Progress stat */}
      {totalCompleted > 0 && (
        <Animated.View
          entering={FadeInDown.delay(50).duration(400)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 4,
          }}
        >
          <Ionicons name="trending-up" size={14} color={c.brand.teal} />
          <Text style={{ fontSize: 13, color: c.text.secondary }}>
            {completedThisWeek > 0
              ? `${completedThisWeek} done this week · ${totalCompleted} total`
              : `${totalCompleted} experiment${totalCompleted !== 1 ? "s" : ""} completed so far`}
          </Text>
        </Animated.View>
      )}

      {/* Outcome selection */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "600",
            color: c.text.primary,
            marginBottom: 12,
          }}
        >
          How did it go?
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {OUTCOMES.map((o) => {
            const isSelected = selectedOutcome === o.key;
            return (
              <Pressable
                key={o.key}
                onPress={() => handleOutcome(o.key)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                style={{
                  width: "47%",
                  flexGrow: 1,
                  alignItems: "center",
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: isSelected
                    ? `${o.color}20`
                    : c.bg.surface,
                  borderWidth: 1.5,
                  borderColor: isSelected ? o.color : "transparent",
                  gap: 6,
                }}
              >
                <Ionicons
                  name={o.icon}
                  size={22}
                  color={isSelected ? o.color : c.text.tertiary}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: isSelected ? o.color : c.text.tertiary,
                  }}
                >
                  {o.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>

      {/* Contextual encouragement after selection */}
      {selectedOutcome != null && (
        <Animated.View entering={FadeInDown.duration(300)}>
          {selectedOutcome === "done" && (
            <Text style={{ fontSize: 14, color: c.brand.teal, fontWeight: "500", paddingHorizontal: 4 }}>
              That's real follow-through. {companionName} is proud of you.
            </Text>
          )}
          {selectedOutcome === "partially" && (
            <Text style={{ fontSize: 14, color: c.brand.gold, fontWeight: "500", paddingHorizontal: 4 }}>
              Partial counts. What worked and what didn't?
            </Text>
          )}
          {selectedOutcome === "not_done" && (
            <Text style={{ fontSize: 14, color: c.text.secondary, fontWeight: "500", paddingHorizontal: 4 }}>
              That's just data, not failure. What got in the way?
            </Text>
          )}
          {selectedOutcome === "rescheduled" && (
            <Text style={{ fontSize: 14, color: c.brand.purpleLight, fontWeight: "500", paddingHorizontal: 4 }}>
              Smart. When do you want to try this?
            </Text>
          )}
        </Animated.View>
      )}

      {/* Optional note */}
      {selectedOutcome != null && (
        <Animated.View entering={FadeInDown.duration(300)}>
          <TextInput
            value={note}
            onChangeText={(text) => {
              setNote(text);
              onNoteChange(text);
            }}
            placeholder={
              selectedOutcome === "done"
                ? "What made it work?"
                : selectedOutcome === "not_done"
                  ? "What got in the way?"
                  : "Any thoughts? (optional)"
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
      <Animated.View entering={FadeInDown.delay(200).duration(400)}>
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
      </Animated.View>
    </View>
  );
}
