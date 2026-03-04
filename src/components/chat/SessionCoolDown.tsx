import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import type { CompletedSessionSummary } from "@/store/chat";
import { useMoodStore } from "@/store/mood";
import { hapticLight } from "@/lib/haptics";

const MOOD_EMOJIS = [
  { score: 1, emoji: "😔", label: "Heavy" },
  { score: 2, emoji: "😕", label: "Low" },
  { score: 3, emoji: "😐", label: "Okay" },
  { score: 4, emoji: "🙂", label: "Good" },
  { score: 5, emoji: "😊", label: "Light" },
];

interface Props {
  session: CompletedSessionSummary;
  onDismiss: () => void;
}

export default function SessionCoolDown({ session, onDismiss }: Props) {
  const { logMood } = useMoodStore();
  const [moodLogged, setMoodLogged] = useState(false);

  const handleMoodSelect = async (score: number) => {
    await hapticLight();
    await logMood({ mood_score: score });
    setMoodLogged(true);
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      exiting={FadeOutUp.duration(300)}
      className="mx-md mb-md"
    >
      <View className="rounded-xl bg-bg-surface p-lg">
        {/* Header */}
        <View className="mb-md items-center">
          <Text className="text-h3 font-inter-semibold text-text-primary">
            Session {session.sessionNumber} Complete
          </Text>
          <View className="mt-xs h-px w-16 bg-brand-purple opacity-50" />
        </View>

        {/* Themes */}
        {session.keyThemes.length > 0 && (
          <View className="mb-md">
            <Text className="mb-xs text-label text-text-secondary">
              We talked about:
            </Text>
            {session.keyThemes.map((theme, i) => (
              <Text key={i} className="text-body text-text-primary">
                • {theme.replace(/_/g, " ")}
              </Text>
            ))}
          </View>
        )}

        {/* Summary */}
        {session.summary && (
          <View className="mb-md">
            <Text className="text-body leading-6 text-text-secondary" numberOfLines={4}>
              {session.summary}
            </Text>
          </View>
        )}

        {/* Echoes */}
        {session.echoes.length > 0 && (
          <View className="mb-md rounded-lg bg-bg-elevated p-sm">
            <Text className="mb-xs text-label text-brand-teal">
              Things to try this week
            </Text>
            {session.echoes.map((echo, i) => (
              <Text key={i} className="text-body text-text-primary">
                → {echo.action_item}
              </Text>
            ))}
          </View>
        )}

        {/* Post-session mood */}
        {!moodLogged ? (
          <View className="mt-sm">
            <Text className="mb-sm text-center text-body text-text-secondary">
              How are you feeling now?
            </Text>
            <View className="flex-row justify-center gap-lg">
              {MOOD_EMOJIS.map(({ score, emoji, label }) => (
                <Pressable
                  key={score}
                  onPress={() => handleMoodSelect(score)}
                  className="items-center"
                >
                  <Text className="text-2xl">{emoji}</Text>
                  <Text className="mt-1 text-xs text-text-tertiary">{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <View className="mt-sm items-center">
            <Text className="text-body text-text-secondary">
              ✓ Thanks for checking in. Take a moment before you continue.
            </Text>
          </View>
        )}

        {/* Dismiss */}
        <Pressable
          onPress={onDismiss}
          className="mt-lg items-center rounded-lg bg-brand-purple py-3"
        >
          <Text className="text-body font-inter-medium text-white">
            Start a New Conversation
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}
