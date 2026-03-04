import { useState, useEffect } from "react";
import { View, Text, Pressable, TextInput, ScrollView, Platform } from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";
const Haptics = Platform.OS !== "web" ? require("expo-haptics") : null;
import CompanionAvatar from "@/components/companion/CompanionAvatar";
import { useMoodStore } from "@/store/mood";
import { useAuthStore } from "@/store/auth";
import { hapticSuccess } from "@/lib/haptics";

type WindDownMode = "reflection" | "gratitude" | "breathing" | "conversation";

function SleepBreathingCircle() {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    // 4-7-8 breathing pattern: slower for sleep
    scale.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.9, { duration: 7000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.5, { duration: 8000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.7, { duration: 7000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.2, { duration: 8000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );

    const interval = setInterval(() => {
      Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View className="items-center justify-center" style={{ width: 220, height: 220 }}>
      <Animated.View
        style={[
          circleStyle,
          {
            width: 220,
            height: 220,
            borderRadius: 110,
            backgroundColor: "#2DD4BF",
          },
        ]}
      />
      <SleepBreathingLabel />
    </View>
  );
}

function SleepBreathingLabel() {
  const [phase, setPhase] = useState(0);
  const labels = ["Breathe in... 4s", "Hold... 7s", "Breathe out... 8s"];

  useEffect(() => {
    const durations = [4000, 7000, 8000];
    let current = 0;

    const advance = () => {
      current = (current + 1) % 3;
      setPhase(current);
      setTimeout(advance, durations[current]);
    };

    const timeout = setTimeout(advance, durations[0]);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <Text className="absolute text-center text-h3 font-inter-semibold text-white">
      {labels[phase]}
    </Text>
  );
}

export default function WindDownScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const logMood = useMoodStore((s) => s.logMood);
  const [mode, setMode] = useState<WindDownMode | null>(null);
  const [gratitude, setGratitude] = useState(["", "", ""]);
  const [reflectionText, setReflectionText] = useState("");
  const [saved, setSaved] = useState(false);

  const companionName = profile?.companion_name ?? "Lumis";

  const handleSaveGratitude = async () => {
    const items = gratitude.filter((g) => g.trim());
    if (items.length === 0) return;

    await logMood({
      mood_score: 7,
      notes: `Gratitude: ${items.join(" | ")}`,
    });
    await hapticSuccess();
    setSaved(true);
  };

  const handleSaveReflection = async () => {
    if (!reflectionText.trim()) return;

    await logMood({
      mood_score: 6,
      notes: `Evening reflection: ${reflectionText}`,
    });
    await hapticSuccess();
    setSaved(true);
  };

  if (!mode) {
    return (
      <View className="flex-1" style={{ backgroundColor: "#0A0E1A" }}>
        <Animated.View entering={FadeIn.duration(600)} className="flex-1 px-lg pt-16">
          <View className="mb-xl items-center">
            <CompanionAvatar expression="warm" size="medium" name={companionName} />
            <Text className="mt-md text-center text-h2 font-inter-semibold text-text-primary">
              Time to wind down
            </Text>
            <Text className="mt-sm text-center text-body text-text-secondary">
              How would you like to end your day?
            </Text>
          </View>

          <Pressable
            onPress={() => setMode("reflection")}
            className="mb-sm rounded-lg border border-brand-teal/20 bg-bg-surface p-lg"
          >
            <Text className="text-h3 font-inter-semibold text-brand-teal">
              🌙 Guided Reflection
            </Text>
            <Text className="mt-xs text-body text-text-secondary">
              Reflect on how your day went
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setMode("gratitude")}
            className="mb-sm rounded-lg border border-accent-warm/20 bg-bg-surface p-lg"
          >
            <Text className="text-h3 font-inter-semibold text-accent-warm">
              ✨ Gratitude
            </Text>
            <Text className="mt-xs text-body text-text-secondary">
              3 things you're grateful for today
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setMode("breathing")}
            className="mb-sm rounded-lg border border-brand-purple/20 bg-bg-surface p-lg"
          >
            <Text className="text-h3 font-inter-semibold text-brand-purple-light">
              🫁 Sleep Breathing
            </Text>
            <Text className="mt-xs text-body text-text-secondary">
              4-7-8 breathing technique for sleep
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              router.back();
              setTimeout(() => router.push("/(tabs)/chat"), 100);
            }}
            className="mb-xl rounded-lg border border-bg-elevated bg-bg-surface p-lg"
          >
            <Text className="text-h3 font-inter-semibold text-text-primary">
              💬 Gentle Conversation
            </Text>
            <Text className="mt-xs text-body text-text-secondary">
              Chat with {companionName} before bed
            </Text>
          </Pressable>

          <Pressable onPress={() => router.back()} className="items-center">
            <Text className="text-body text-text-tertiary">← Not tonight</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  if (mode === "breathing") {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: "#0A0E1A" }}>
        <Animated.View entering={FadeIn.duration(800)} className="items-center">
          <Text className="mb-lg text-h2 font-inter-semibold text-text-primary">
            4-7-8 Sleep Breathing
          </Text>
          <SleepBreathingCircle />
          <Text className="mt-xl text-center text-body text-text-secondary">
            This technique activates your parasympathetic{"\n"}nervous system for sleep
          </Text>
          <Pressable onPress={() => setMode(null)} className="mt-xl">
            <Text className="text-body text-text-tertiary">← Back</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  if (mode === "gratitude") {
    return (
      <View className="flex-1" style={{ backgroundColor: "#0A0E1A" }}>
        <ScrollView className="flex-1 px-lg pt-16">
          <Animated.View entering={FadeIn.duration(400)}>
            <Text className="mb-sm text-h2 font-inter-semibold text-text-primary">
              ✨ Three Good Things
            </Text>
            <Text className="mb-lg text-body text-text-secondary">
              What went well today? Even small things count.
            </Text>

            {saved ? (
              <Animated.View entering={FadeInDown.duration(300)} className="items-center py-xl">
                <Text className="text-stat">🌟</Text>
                <Text className="mt-md text-h3 font-inter-semibold text-text-primary">
                  Saved
                </Text>
                <Text className="mt-sm text-center text-body text-text-secondary">
                  Gratitude practice builds resilience over time.{"\n"}Sweet dreams.
                </Text>
                <Pressable onPress={() => router.back()} className="mt-lg">
                  <Text className="text-body text-brand-teal">Close</Text>
                </Pressable>
              </Animated.View>
            ) : (
              <>
                {[0, 1, 2].map((i) => (
                  <Animated.View
                    key={i}
                    entering={FadeInDown.delay(i * 150).duration(300)}
                    className="mb-sm"
                  >
                    <Text className="mb-xs text-small text-text-tertiary">{i + 1}.</Text>
                    <TextInput
                      className="rounded-lg bg-bg-surface p-md text-body text-text-primary"
                      placeholder="Something good that happened..."
                      placeholderTextColor="#5A6178"
                      value={gratitude[i]}
                      onChangeText={(text) => {
                        const next = [...gratitude];
                        next[i] = text;
                        setGratitude(next);
                      }}
                      multiline
                    />
                  </Animated.View>
                ))}

                <Pressable
                  onPress={handleSaveGratitude}
                  className="mb-lg mt-sm items-center rounded-lg bg-brand-teal/20 py-4"
                >
                  <Text className="text-body font-inter-semibold text-brand-teal">
                    Save & Sleep Well
                  </Text>
                </Pressable>

                <Pressable onPress={() => setMode(null)} className="items-center">
                  <Text className="text-body text-text-tertiary">← Back</Text>
                </Pressable>
              </>
            )}
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  // Reflection mode
  return (
    <View className="flex-1" style={{ backgroundColor: "#0A0E1A" }}>
      <ScrollView className="flex-1 px-lg pt-16">
        <Animated.View entering={FadeIn.duration(400)}>
          <Text className="mb-sm text-h2 font-inter-semibold text-text-primary">
            🌙 Evening Reflection
          </Text>
          <Text className="mb-lg text-body text-text-secondary">
            How was your day? Take a moment to reflect.
          </Text>

          {saved ? (
            <Animated.View entering={FadeInDown.duration(300)} className="items-center py-xl">
              <Text className="text-stat">🌙</Text>
              <Text className="mt-md text-h3 font-inter-semibold text-text-primary">
                Reflection saved
              </Text>
              <Text className="mt-sm text-center text-body text-text-secondary">
                Tomorrow is a new opportunity.{"\n"}Rest well.
              </Text>
              <Pressable onPress={() => router.back()} className="mt-lg">
                <Text className="text-body text-brand-teal">Close</Text>
              </Pressable>
            </Animated.View>
          ) : (
            <>
              <TextInput
                className="mb-md min-h-[150px] rounded-lg bg-bg-surface p-md text-body text-text-primary"
                placeholder="What happened today? How did it make you feel?"
                placeholderTextColor="#5A6178"
                value={reflectionText}
                onChangeText={setReflectionText}
                multiline
                textAlignVertical="top"
              />

              <Pressable
                onPress={handleSaveReflection}
                className="mb-lg items-center rounded-lg bg-brand-purple/20 py-4"
              >
                <Text className="text-body font-inter-semibold text-brand-purple-light">
                  Save Reflection
                </Text>
              </Pressable>

              <Pressable onPress={() => setMode(null)} className="items-center">
                <Text className="text-body text-text-tertiary">← Back</Text>
              </Pressable>
            </>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}
