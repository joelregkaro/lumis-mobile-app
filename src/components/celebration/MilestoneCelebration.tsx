import { useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";
import CompanionAvatar from "@/components/companion/CompanionAvatar";
import { hapticMilestone } from "@/lib/haptics";

const MILESTONE_LABELS: Record<string, { emoji: string; title: string; subtitle: string }> = {
  first_session: {
    emoji: "💬",
    title: "First Session Complete!",
    subtitle: "You took the most important step — showing up.",
  },
  first_pattern: {
    emoji: "🧩",
    title: "First Pattern Discovered!",
    subtitle: "Self-awareness is growing. This is how change begins.",
  },
  streak_7: {
    emoji: "🔥",
    title: "7-Day Streak!",
    subtitle: "A full week of checking in. You're building a real habit.",
  },
  streak_30: {
    emoji: "💎",
    title: "30-Day Streak!",
    subtitle: "A whole month of showing up for yourself. That's rare and powerful.",
  },
  streak_100: {
    emoji: "⚡",
    title: "100-Day Streak!",
    subtitle: "100 days of growth. You've transformed this from a habit into who you are.",
  },
  streak_365: {
    emoji: "👑",
    title: "365-Day Streak!",
    subtitle: "One full year. You've done something most people only dream about.",
  },
  first_goal: {
    emoji: "🎯",
    title: "First Goal Achieved!",
    subtitle: "From intention to action. That's real growth.",
  },
  sessions_10: {
    emoji: "🏆",
    title: "10 Sessions!",
    subtitle: "You're committed to your growth journey. Keep going.",
  },
  companion_sprout: {
    emoji: "🌱",
    title: "Lumis Evolved: Sprout!",
    subtitle: "Your consistency is bringing Lumis to life.",
  },
  companion_bloom: {
    emoji: "🌸",
    title: "Lumis Evolved: Bloom!",
    subtitle: "Something beautiful is growing from your dedication.",
  },
  companion_radiant: {
    emoji: "✨",
    title: "Lumis Evolved: Radiant!",
    subtitle: "Your companion shines as bright as your commitment.",
  },
  companion_luminary: {
    emoji: "👑",
    title: "Lumis Evolved: Luminary!",
    subtitle: "Maximum radiance. You and Lumis have built something extraordinary.",
  },
};

interface Props {
  milestoneKey: string;
  onDismiss: () => void;
}

export default function MilestoneCelebration({ milestoneKey, onDismiss }: Props) {
  const milestone = MILESTONE_LABELS[milestoneKey] ?? {
    emoji: "✨",
    title: "Milestone Unlocked!",
    subtitle: "You're making progress.",
  };

  useEffect(() => {
    hapticMilestone();
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      exiting={FadeOut.duration(300)}
      style={styles.overlay}
    >
      <Pressable style={styles.backdrop} onPress={onDismiss} />

      <Animated.View entering={ZoomIn.duration(500)} style={styles.card}>
        <Text style={styles.emoji}>{milestone.emoji}</Text>

        <CompanionAvatar expression="proud" size="medium" />

        <Text style={styles.title}>{milestone.title}</Text>
        <Text style={styles.subtitle}>{milestone.subtitle}</Text>

        <Pressable
          onPress={onDismiss}
          style={styles.button}
          accessibilityLabel="Dismiss celebration"
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Amazing!</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  card: {
    backgroundColor: "#16161D",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    marginHorizontal: 32,
    borderWidth: 1,
    borderColor: "#FBBF2440",
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FBBF24",
    textAlign: "center",
    marginTop: 16,
  },
  subtitle: {
    fontSize: 15,
    color: "#A1A1AA",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  button: {
    marginTop: 24,
    backgroundColor: "#FBBF2420",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FBBF24",
  },
});
