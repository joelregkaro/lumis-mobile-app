import { useState, useEffect } from "react";
import { View, Text, Pressable, Linking, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
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
import { screen } from "@/lib/analytics";
import CompanionAvatar from "@/components/companion/CompanionAvatar";
import { SOS_CONFIGS, type SOSMode } from "@/types/chat";

function BreathingCircle({ color }: { color: string }) {
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.0, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.6, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.3, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
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
    <View className="items-center justify-center" style={{ width: 250, height: 250 }}>
      <Animated.View
        style={[
          circleStyle,
          {
            width: 250,
            height: 250,
            borderRadius: 125,
            backgroundColor: color,
          },
        ]}
      />
      <BreathingLabel />
    </View>
  );
}

function BreathingLabel() {
  const [phase, setPhase] = useState<"Breathe in" | "Breathe out">("Breathe in");

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase((p) => (p === "Breathe in" ? "Breathe out" : "Breathe in"));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Text className="absolute text-h2 font-inter-semibold text-white">{phase}</Text>
  );
}

const GROUNDING_STEPS = [
  { count: 5, sense: "see", emoji: "👁️", prompt: "Name 5 things you can see right now" },
  { count: 4, sense: "touch", emoji: "✋", prompt: "Name 4 things you can touch" },
  { count: 3, sense: "hear", emoji: "👂", prompt: "Name 3 things you can hear" },
  { count: 2, sense: "smell", emoji: "👃", prompt: "Name 2 things you can smell" },
  { count: 1, sense: "taste", emoji: "👅", prompt: "Name 1 thing you can taste" },
];

function GroundingExercise({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState(false);

  const handleNext = () => {
    Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (step < GROUNDING_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType?.Success);
      setCompleted(true);
    }
  };

  if (completed) {
    return (
      <Animated.View entering={FadeIn.duration(600)} className="flex-1 items-center justify-center px-lg">
        <Text className="mb-md text-center text-stat">🌿</Text>
        <Text className="mb-sm text-center text-h2 font-inter-semibold text-text-primary">
          You're here. You're grounded.
        </Text>
        <Text className="mb-xl text-center text-body text-text-secondary">
          Take a moment to notice how your body feels now.
        </Text>
        <Pressable onPress={onBack} className="items-center">
          <Text className="text-body text-text-tertiary">← Back</Text>
        </Pressable>
      </Animated.View>
    );
  }

  const current = GROUNDING_STEPS[step];
  const progress = ((step + 1) / GROUNDING_STEPS.length) * 100;

  return (
    <Animated.View entering={FadeIn.duration(600)} className="flex-1 items-center justify-center px-lg">
      {/* Progress bar */}
      <View className="absolute left-6 right-6 top-16">
        <View className="h-1 w-full overflow-hidden rounded-full bg-bg-elevated">
          <View
            className="h-full rounded-full bg-brand-purple-light"
            style={{ width: `${progress}%` }}
          />
        </View>
        <Text className="mt-xs text-center text-small text-text-tertiary">
          Step {step + 1} of {GROUNDING_STEPS.length}
        </Text>
      </View>

      <Animated.View key={step} entering={FadeInDown.duration(400)} className="items-center">
        <Text className="mb-md text-stat">{current.emoji}</Text>
        <Text className="mb-sm text-center text-h1 font-inter-semibold text-brand-purple-light">
          {current.count}
        </Text>
        <Text className="mb-xl text-center text-h3 font-inter-semibold text-text-primary">
          {current.prompt}
        </Text>
        <Text className="mb-xl text-center text-body text-text-secondary">
          Take your time. Look around you.
        </Text>
      </Animated.View>

      <Pressable
        onPress={handleNext}
        className="mb-lg w-48 items-center rounded-lg bg-brand-purple-light/20 py-4"
      >
        <Text className="text-body font-inter-semibold text-brand-purple-light">
          {step < GROUNDING_STEPS.length - 1 ? "Next →" : "Done ✓"}
        </Text>
      </Pressable>

      <Pressable onPress={onBack} className="items-center">
        <Text className="text-body text-text-tertiary">Try something else</Text>
      </Pressable>
    </Animated.View>
  );
}

const AFFIRMATIONS = [
  "You're not alone right now",
  "This feeling will pass",
  "It's okay to feel this way",
  "You are safe in this moment",
  "You don't have to have all the answers",
];

function PresenceExercise({ onBack }: { onBack: () => void }) {
  const navigation = useNavigation();
  const [affirmationIdx, setAffirmationIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAffirmationIdx((i) => (i + 1) % AFFIRMATIONS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Animated.View entering={FadeIn.duration(1000)} className="flex-1 items-center justify-center px-lg">
      <CompanionAvatar expression="concerned" size="large" />

      <Animated.View key={affirmationIdx} entering={FadeIn.duration(800)} className="mt-xl items-center">
        <Text className="text-center text-h2 font-inter-semibold text-text-primary">
          {AFFIRMATIONS[affirmationIdx]}
        </Text>
      </Animated.View>

      <Text className="mt-lg text-center text-body text-text-secondary">
        I'm right here with you.{"\n"}There's no rush.
      </Text>

      <View className="mt-xl w-full">
        <Pressable
          onPress={() => {
            navigation.goBack();
            setTimeout(() => navigation.navigate("Tabs" as never, { screen: "chat" }), 100);
          }}
          className="mb-md items-center rounded-lg bg-brand-purple/20 py-4"
        >
          <Text className="text-body font-inter-semibold text-brand-purple-light">
            💬 Talk to Lumis
          </Text>
        </Pressable>

        <Pressable onPress={onBack} className="items-center">
          <Text className="text-body text-text-tertiary">Try something else</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function CrisisFooter() {
  const handleCall988 = () => Linking.openURL("tel:988");
  const handleTextCrisis = () =>
    Linking.openURL(Platform.OS === "ios" ? "sms:741741&body=HOME" : "sms:741741?body=HOME");

  return (
    <View className="border-t border-bg-surface px-lg pb-12 pt-md">
      <Text className="mb-sm text-center text-label text-text-tertiary">
        If you're in crisis, please reach out:
      </Text>
      <View className="flex-row justify-center gap-lg">
        <Pressable onPress={handleCall988} accessibilityLabel="Call 988 Suicide and Crisis Lifeline" accessibilityRole="button">
          <Text className="text-body font-inter-semibold text-brand-teal">Call 988</Text>
        </Pressable>
        <Pressable onPress={handleTextCrisis} accessibilityLabel="Text HOME to 741741 for Crisis Text Line" accessibilityRole="button">
          <Text className="text-body font-inter-semibold text-brand-teal">
            Text HOME to 741741
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function SOSScreen() {
  const navigation = useNavigation();
  const [selectedMode, setSelectedMode] = useState<SOSMode | null>(null);

  useEffect(() => { screen("sos"); }, []);

  const config = selectedMode ? SOS_CONFIGS[selectedMode] : null;

  if (!selectedMode) {
    return (
      <SafeAreaView className="flex-1 bg-bg-primary">
        <Animated.View entering={FadeIn.duration(400)} className="flex-1 items-center justify-center px-lg">
          <Text className="mb-xl text-h1 font-inter-semibold text-text-primary">
            What do you need right now?
          </Text>

          <Pressable
            onPress={() => setSelectedMode("panic")}
            className="mb-md w-full rounded-lg bg-bg-surface p-lg"
            accessibilityLabel="I'm panicking — guided breathing exercise"
            accessibilityRole="button"
          >
            <Text className="text-h3 font-inter-semibold text-brand-teal">
              🫁 I'm panicking
            </Text>
            <Text className="mt-xs text-body text-text-secondary">
              Guided breathing to calm your nervous system
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedMode("overwhelm")}
            className="mb-md w-full rounded-lg bg-bg-surface p-lg"
            accessibilityLabel="I'm overwhelmed — grounding exercise"
            accessibilityRole="button"
          >
            <Text className="text-h3 font-inter-semibold text-brand-purple-light">
              🌊 I'm overwhelmed
            </Text>
            <Text className="mt-xs text-body text-text-secondary">
              5-4-3-2-1 grounding to slow everything down
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedMode("distress")}
            className="mb-xl w-full rounded-lg bg-bg-surface p-lg"
            accessibilityLabel="I need support — presence and validation"
            accessibilityRole="button"
          >
            <Text className="text-h3 font-inter-semibold text-brand-purple">
              💜 I need support
            </Text>
            <Text className="mt-xs text-body text-text-secondary">
              I'm here with you — you're not alone
            </Text>
          </Pressable>

          <Pressable onPress={() => navigation.goBack()} style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
            <Text className="text-body text-text-tertiary">← Go back</Text>
          </Pressable>
        </Animated.View>

        <CrisisFooter />
      </SafeAreaView>
    );
  }

  if (selectedMode === "overwhelm") {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: "#0C1120" }}>
        <GroundingExercise onBack={() => setSelectedMode(null)} />
        <CrisisFooter />
      </SafeAreaView>
    );
  }

  if (selectedMode === "distress") {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: "#0C1120" }}>
        <PresenceExercise onBack={() => setSelectedMode(null)} />
        <CrisisFooter />
      </SafeAreaView>
    );
  }

  // Panic mode — breathing circle
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#0C1120" }}>
      <Animated.View entering={FadeIn.duration(800)} className="flex-1 items-center justify-center">
        <Text className="mb-md text-h1 font-inter-semibold text-text-primary">
          {config!.title}
        </Text>
        <Text className="mb-xl text-body text-text-secondary">{config!.subtitle}</Text>

        <BreathingCircle color={config!.color} />

        <View className="mt-xl">
          <Pressable onPress={() => setSelectedMode(null)} className="mb-md items-center">
            <Text className="text-body text-text-secondary">Try something else</Text>
          </Pressable>
          <Pressable onPress={() => navigation.goBack()} className="items-center" style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
            <Text className="text-body text-text-tertiary">← Close</Text>
          </Pressable>
        </View>
      </Animated.View>

      <CrisisFooter />
    </SafeAreaView>
  );
}
