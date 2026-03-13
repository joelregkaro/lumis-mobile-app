import { View, Text, Pressable } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";
import type { CheckInType, CommitmentOutcome } from "@/store/checkin";

const c = colors.dark;

interface CheckInCompleteProps {
  type: CheckInType;
  moodScore: number | null;
  companionName: string;
  commitmentOutcome: CommitmentOutcome | null;
  overdueCount: number;
  onTalkToCompanion: () => void;
  onDismiss: () => void;
}

function getCompletionMessage(
  type: CheckInType,
  moodScore: number | null,
  companionName: string,
  commitmentOutcome: CommitmentOutcome | null,
  overdueCount: number,
): { emoji: string; title: string; subtitle: string } {
  if (moodScore != null && moodScore <= 4) {
    return {
      emoji: "💜",
      title: "Thanks for being honest",
      subtitle: `${companionName} is here if you want to talk.`,
    };
  }

  if (type === "commitment_followup") {
    if (commitmentOutcome === "done") {
      const extra =
        overdueCount > 1
          ? ` You have ${overdueCount - 1} more to catch up on — no rush.`
          : "";
      return {
        emoji: "🎯",
        title: "You followed through!",
        subtitle: `That's real growth. Every experiment builds momentum.${extra}`,
      };
    }
    if (commitmentOutcome === "partially") {
      return {
        emoji: "💪",
        title: "Partial counts",
        subtitle: "You showed up. That matters more than perfection.",
      };
    }
    if (commitmentOutcome === "not_done") {
      return {
        emoji: "🌱",
        title: "Noted — no judgment",
        subtitle: "Understanding what blocks you is progress too.",
      };
    }
    if (commitmentOutcome === "rescheduled") {
      return {
        emoji: "📅",
        title: "Rescheduled",
        subtitle: "Adjusting the plan is a sign of self-awareness, not failure.",
      };
    }
    return {
      emoji: "✨",
      title: "Noted!",
      subtitle: "Every experiment teaches you something.",
    };
  }

  switch (type) {
    case "morning_briefing":
      return {
        emoji: "☀️",
        title: "You're set",
        subtitle: `Have a great day. ${companionName} is here if you need anything.`,
      };
    case "pattern_checkin":
      return {
        emoji: "🔍",
        title: "Thanks for reflecting",
        subtitle: "Noticing patterns is the first step to changing them.",
      };
    default:
      return {
        emoji: "👋",
        title: "Check-in complete",
        subtitle: `${companionName} will check in again later.`,
      };
  }
}

function getSmartCTA(
  type: CheckInType,
  moodScore: number | null,
  commitmentOutcome: CommitmentOutcome | null,
): { label: string; icon: keyof typeof Ionicons.glyphMap } {
  if (moodScore != null && moodScore <= 4) {
    return { label: "Talk about it", icon: "chatbubble-outline" };
  }

  if (type === "commitment_followup") {
    if (commitmentOutcome === "done") {
      return { label: "Celebrate with me", icon: "chatbubble-outline" };
    }
    if (commitmentOutcome === "not_done") {
      return { label: "Figure out what happened", icon: "chatbubble-outline" };
    }
  }

  switch (type) {
    case "commitment_followup":
      return { label: "Tell me more", icon: "chatbubble-outline" };
    case "morning_briefing":
      return { label: "Start a session", icon: "mic-outline" };
    case "pattern_checkin":
      return { label: "Explore this pattern", icon: "chatbubble-outline" };
    default:
      return { label: "Want to chat?", icon: "chatbubble-outline" };
  }
}

export default function CheckInComplete({
  type,
  moodScore,
  companionName,
  commitmentOutcome,
  overdueCount,
  onTalkToCompanion,
  onDismiss,
}: CheckInCompleteProps) {
  const message = getCompletionMessage(type, moodScore, companionName, commitmentOutcome, overdueCount);
  const cta = getSmartCTA(type, moodScore, commitmentOutcome);

  return (
    <View style={{ alignItems: "center", gap: 20, paddingTop: 32 }}>
      <Animated.View entering={FadeIn.duration(600)}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: `${c.brand.purple}15`,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 36 }}>{message.emoji}</Text>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(200).duration(400)}
        style={{ alignItems: "center", gap: 8 }}
      >
        <Text
          style={{
            fontSize: 22,
            fontWeight: "700",
            color: c.text.primary,
            textAlign: "center",
          }}
        >
          {message.title}
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: c.text.secondary,
            textAlign: "center",
            maxWidth: 300,
            lineHeight: 22,
          }}
        >
          {message.subtitle}
        </Text>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(400).duration(400)}
        style={{ width: "100%", gap: 12, marginTop: 8 }}
      >
        <Pressable
          onPress={onTalkToCompanion}
          accessibilityRole="button"
          style={{
            backgroundColor: c.brand.purple,
            borderRadius: 14,
            paddingVertical: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Ionicons name={cta.icon} size={18} color="#FFFFFF" />
          <Text
            style={{ fontSize: 17, fontWeight: "700", color: "#FFFFFF" }}
          >
            {cta.label}
          </Text>
        </Pressable>

        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          style={{
            paddingVertical: 12,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "500",
              color: c.text.tertiary,
            }}
          >
            I'm good — see you later
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
