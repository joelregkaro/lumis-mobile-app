import { useState, useEffect } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import CompanionAvatar from "@/components/companion/CompanionAvatar";
import { useAuthStore } from "@/store/auth";
import { useMemoryStore } from "@/store/memory";
import { useEchoStore } from "@/store/echo";
import { useMoodStore } from "@/store/mood";
import { hapticLight, hapticSuccess } from "@/lib/haptics";

const MOOD_OPTIONS = [
  { score: 2, emoji: "😔", label: "Low" },
  { score: 4, emoji: "😐", label: "Meh" },
  { score: 6, emoji: "🙂", label: "Okay" },
  { score: 8, emoji: "😊", label: "Good" },
  { score: 10, emoji: "😄", label: "Great" },
];

type Step = "mood" | "context" | "ready";

export default function WarmUpScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { memoryDoc, fetchMemoryDoc } = useMemoryStore();
  const { pendingEchoes, fetchPendingEchoes } = useEchoStore();
  const logMood = useMoodStore((s) => s.logMood);

  const [step, setStep] = useState<Step>("mood");
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [topicText, setTopicText] = useState("");

  const companionName = profile?.companion_name ?? "Lumis";

  useEffect(() => {
    fetchMemoryDoc();
    fetchPendingEchoes();
  }, []);

  const nextSessionSnippet = extractNextSessionNotes(memoryDoc?.content);
  const latestEcho = pendingEchoes.length > 0 ? pendingEchoes[0] : null;

  const handleMoodSelect = async (score: number) => {
    await hapticLight();
    setSelectedMood(score);
  };

  const handleMoodContinue = async () => {
    if (selectedMood !== null) {
      await logMood({ mood_score: selectedMood, notes: "Pre-session check-in" });
    }
    setStep("context");
  };

  const handleStartSession = async () => {
    await hapticSuccess();
    router.back();
    setTimeout(() => {
      const params = topicText.trim() ? `?topic=${encodeURIComponent(topicText.trim())}` : "";
      router.push(`/(tabs)/chat${params}` as any);
    }, 100);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#0C1120" }}>
      <Animated.View entering={FadeIn.duration(400)} className="flex-1 px-lg pt-16">
        {/* Header */}
        <View className="mb-lg items-center">
          <CompanionAvatar expression="warm" size="medium" name={companionName} />
          <Text className="mt-md text-center text-h2 font-inter-semibold text-text-primary">
            Tuning In
          </Text>
          <Text className="mt-xs text-center text-body text-text-secondary">
            A moment to arrive before we begin
          </Text>
        </View>

        {/* Step indicators */}
        <View className="mb-lg flex-row justify-center gap-sm">
          {(["mood", "context", "ready"] as Step[]).map((s) => (
            <View
              key={s}
              className={`h-1 flex-1 rounded-full ${
                s === step ? "bg-brand-purple" :
                (["mood", "context", "ready"].indexOf(s) < ["mood", "context", "ready"].indexOf(step))
                  ? "bg-brand-purple/50" : "bg-bg-elevated"
              }`}
            />
          ))}
        </View>

        {/* Step: Mood */}
        {step === "mood" && (
          <Animated.View entering={FadeInDown.duration(400)} className="flex-1">
            <Text className="mb-lg text-center text-h3 font-inter-semibold text-text-primary">
              How are you feeling right now?
            </Text>

            <View className="flex-row justify-around">
              {MOOD_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.score}
                  onPress={() => handleMoodSelect(opt.score)}
                  className={`items-center rounded-xl px-3 py-3 ${
                    selectedMood === opt.score ? "bg-brand-purple/20" : ""
                  }`}
                >
                  <Text className="text-stat">{opt.emoji}</Text>
                  <Text className={`mt-xs text-small ${
                    selectedMood === opt.score ? "text-brand-purple-light" : "text-text-secondary"
                  }`}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View className="mt-auto pb-lg">
              <Pressable
                onPress={handleMoodContinue}
                disabled={selectedMood === null}
                className={`items-center rounded-lg py-4 ${
                  selectedMood !== null ? "bg-brand-purple" : "bg-bg-elevated"
                }`}
              >
                <Text className={`text-body font-inter-semibold ${
                  selectedMood !== null ? "text-white" : "text-text-tertiary"
                }`}>
                  Continue
                </Text>
              </Pressable>

              <Pressable onPress={() => { setStep("context"); }} className="mt-md items-center">
                <Text className="text-body text-text-tertiary">Skip</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* Step: Context surface */}
        {step === "context" && (
          <Animated.View entering={FadeInDown.duration(400)} className="flex-1">
            {/* Show context from memory or echoes */}
            {(nextSessionSnippet || latestEcho) && (
              <View className="mb-lg rounded-lg bg-bg-surface p-md">
                <Text className="mb-xs text-label text-text-secondary">
                  {nextSessionSnippet ? "📋 From last time" : "📌 Your action item"}
                </Text>
                <Text className="text-body text-text-primary">
                  {nextSessionSnippet ?? latestEcho?.action_item}
                </Text>
              </View>
            )}

            <Text className="mb-sm text-h3 font-inter-semibold text-text-primary">
              Anything specific on your mind?
            </Text>
            <Text className="mb-md text-body text-text-secondary">
              This helps {companionName} understand where you're at today.
            </Text>

            <TextInput
              className="mb-lg min-h-[100px] rounded-lg bg-bg-surface p-md text-body text-text-primary"
              placeholder="What's been on your mind lately..."
              placeholderTextColor="#5A6178"
              value={topicText}
              onChangeText={setTopicText}
              multiline
              textAlignVertical="top"
            />

            <View className="mt-auto pb-lg">
              <Pressable
                onPress={() => setStep("ready")}
                className="items-center rounded-lg bg-brand-purple py-4"
              >
                <Text className="text-body font-inter-semibold text-white">
                  {topicText.trim() ? "Continue with this" : "Continue"}
                </Text>
              </Pressable>

              <Pressable onPress={() => setStep("ready")} className="mt-md items-center">
                <Text className="text-body text-text-tertiary">Skip</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* Step: Ready */}
        {step === "ready" && (
          <Animated.View entering={FadeInDown.duration(400)} className="flex-1 items-center justify-center">
            <CompanionAvatar expression="curious" size="large" />

            <Text className="mt-lg text-center text-h2 font-inter-semibold text-text-primary">
              Ready when you are
            </Text>
            <Text className="mt-sm text-center text-body text-text-secondary">
              There's no right or wrong way to do this.{"\n"}Just be honest.
            </Text>

            <Pressable
              onPress={handleStartSession}
              className="mt-xl w-full items-center rounded-lg bg-brand-purple py-4"
            >
              <Text className="text-body font-inter-semibold text-white">
                💬 Start Session
              </Text>
            </Pressable>

            <Pressable onPress={() => router.back()} className="mt-md items-center">
              <Text className="text-body text-text-tertiary">Not right now</Text>
            </Pressable>
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}

function extractNextSessionNotes(memoryContent: string | null | undefined): string | null {
  if (!memoryContent) return null;

  const marker = "## For Next Session";
  const idx = memoryContent.indexOf(marker);
  if (idx === -1) return null;

  const afterMarker = memoryContent.slice(idx + marker.length).trim();
  const nextSectionIdx = afterMarker.indexOf("\n## ");
  const section = nextSectionIdx !== -1
    ? afterMarker.slice(0, nextSectionIdx).trim()
    : afterMarker.trim();

  if (section.length < 10) return null;

  return section.length > 200 ? section.slice(0, 197) + "..." : section;
}
