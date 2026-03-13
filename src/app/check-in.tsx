import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useCheckInStore, type CheckInType } from "@/store/checkin";
import { useAuthStore } from "@/store/auth";
import CommitmentCheck from "@/components/checkin/CommitmentCheck";
import MorningBriefing from "@/components/checkin/MorningBriefing";
import PatternCheck from "@/components/checkin/PatternCheck";
import QuickMoodRow from "@/components/checkin/QuickMoodRow";
import CheckInComplete from "@/components/checkin/CheckInComplete";
import { hapticSuccess } from "@/lib/haptics";
import { screen, track } from "@/lib/analytics";
import { colors } from "@/constants/theme";

const c = colors.dark;

export default function CheckInScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    type?: string;
    id?: string;
    action_item?: string;
    context?: string;
    description?: string;
    pattern_type?: string;
    focus_summary?: string;
    top_priorities?: string;
    companion_message?: string;
    is_overdue?: string;
    overdue_count?: string;
    completed_this_week?: string;
    total_completed?: string;
    companion_name?: string;
    recent_themes?: string;
    energy_forecast?: string;
    streak_status?: string;
  }>();

  const profile = useAuthStore((s) => s.profile);
  const companionName =
    params.companion_name || profile?.companion_name || "Lumis";

  const {
    type,
    referenceData,
    moodScore,
    commitmentOutcome,
    isSubmitting,
    isComplete,
    initFromParams,
    setMood,
    setNote,
    setCommitmentOutcome,
    setPatternAcknowledged,
    setIntention,
    submit,
    reset,
    fetchPending,
  } = useCheckInStore();

  const [generalNote, setGeneralNote] = useState("");

  useEffect(() => {
    screen("check_in");
    const checkinType = (params.type as CheckInType) || "general";
    const data: Record<string, unknown> = {};

    if (params.action_item) data.action_item = params.action_item;
    if (params.context) data.context = params.context;
    if (params.description) data.description = params.description;
    if (params.pattern_type) data.pattern_type = params.pattern_type;
    if (params.focus_summary) data.focus_summary = params.focus_summary;
    if (params.companion_message)
      data.companion_message = params.companion_message;
    if (params.energy_forecast) data.energy_forecast = params.energy_forecast;
    if (params.streak_status) data.streak_status = params.streak_status;
    if (params.companion_name) data.companion_name = params.companion_name;
    if (params.is_overdue) data.is_overdue = params.is_overdue === "true";
    if (params.overdue_count)
      data.overdue_count = parseInt(params.overdue_count, 10) || 0;
    if (params.completed_this_week)
      data.completed_this_week =
        parseInt(params.completed_this_week, 10) || 0;
    if (params.total_completed)
      data.total_completed = parseInt(params.total_completed, 10) || 0;
    if (params.top_priorities) {
      try {
        data.top_priorities = JSON.parse(params.top_priorities);
      } catch {
        data.top_priorities = [];
      }
    }
    if (params.recent_themes) {
      try {
        data.recent_themes = JSON.parse(params.recent_themes);
      } catch {
        data.recent_themes = [];
      }
    }

    initFromParams(checkinType, params.id ?? null, data);
    track("checkin_opened", { type: checkinType });

    return () => {
      reset();
    };
  }, []);

  // Refresh the pending check-in card on home when this screen completes
  useEffect(() => {
    if (isComplete) {
      fetchPending();
    }
  }, [isComplete, fetchPending]);

  const handleSubmitGeneral = useCallback(async () => {
    await hapticSuccess();
    submit();
  }, [submit]);

  const handleTalkToCompanion = useCallback(() => {
    const topicMap: Record<CheckInType, string | undefined> = {
      commitment_followup: referenceData.action_item
        ? `I want to talk about my experiment: ${referenceData.action_item}`
        : undefined,
      pattern_checkin: referenceData.description
        ? `I want to explore this pattern: ${referenceData.description}`
        : undefined,
      morning_briefing: undefined,
      general: undefined,
    };

    const topic = type ? topicMap[type] : undefined;
    router.back();
    setTimeout(() => {
      if (topic) {
        router.push({
          pathname: "/(tabs)/chat",
          params: { topic: encodeURIComponent(String(topic)) },
        });
      } else {
        router.push("/(tabs)/chat");
      }
    }, 100);
  }, [type, referenceData, router]);

  const handleDismiss = useCallback(() => {
    router.back();
  }, [router]);

  const overdueCount = (referenceData.overdue_count as number) ?? 0;

  if (isComplete) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: c.bg.primary }}
        edges={["top"]}
      >
        <View style={{ flex: 1, paddingHorizontal: 24 }}>
          <Pressable
            onPress={handleDismiss}
            style={{
              alignSelf: "flex-end",
              padding: 8,
              marginTop: 8,
            }}
            hitSlop={12}
          >
            <Ionicons name="close" size={24} color={c.text.tertiary} />
          </Pressable>

          <CheckInComplete
            type={type!}
            moodScore={moodScore}
            companionName={companionName}
            commitmentOutcome={commitmentOutcome}
            overdueCount={overdueCount}
            onTalkToCompanion={handleTalkToCompanion}
            onDismiss={handleDismiss}
          />
        </View>
      </SafeAreaView>
    );
  }

  const recentThemes = (referenceData.recent_themes as string[]) ?? [];

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.bg.primary }}
      edges={["top"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingVertical: 12,
          }}
        >
          <Animated.View entering={FadeIn.duration(300)}>
            <Text
              style={{
                fontSize: 22,
                fontWeight: "700",
                color: c.text.primary,
              }}
            >
              {getTitle(type, referenceData)}
            </Text>
          </Animated.View>
          <Pressable onPress={handleDismiss} hitSlop={12}>
            <Ionicons name="close" size={24} color={c.text.tertiary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 40,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {type === "commitment_followup" && (
            <CommitmentCheck
              actionItem={
                (referenceData.action_item as string) ?? "Your experiment"
              }
              context={(referenceData.context as string) ?? null}
              isOverdue={!!referenceData.is_overdue}
              overdueCount={overdueCount}
              completedThisWeek={
                (referenceData.completed_this_week as number) ?? 0
              }
              totalCompleted={
                (referenceData.total_completed as number) ?? 0
              }
              companionName={companionName}
              moodScore={moodScore}
              onMoodSelect={setMood}
              onOutcomeSelect={setCommitmentOutcome}
              onNoteChange={setNote}
              onSubmit={submit}
              isSubmitting={isSubmitting}
            />
          )}

          {type === "morning_briefing" && (
            <MorningBriefing
              focusSummary={
                (referenceData.focus_summary as string) ?? null
              }
              topPriorities={
                (referenceData.top_priorities as string[]) ?? null
              }
              companionMessage={
                (referenceData.companion_message as string) ?? null
              }
              companionName={companionName}
              moodScore={moodScore}
              onMoodSelect={setMood}
              onIntentionChange={setIntention}
              onSubmit={submit}
              isSubmitting={isSubmitting}
            />
          )}

          {type === "pattern_checkin" && (
            <PatternCheck
              description={
                (referenceData.description as string) ??
                "A pattern was noticed"
              }
              patternType={
                (referenceData.pattern_type as string) ??
                "recurring_theme"
              }
              moodScore={moodScore}
              onMoodSelect={setMood}
              onAcknowledge={setPatternAcknowledged}
              onNoteChange={setNote}
              onSubmit={submit}
              isSubmitting={isSubmitting}
            />
          )}

          {type === "general" && (
            <View style={{ gap: 24 }}>
              {/* Personalized greeting with recent session context */}
              {recentThemes.length > 0 && (
                <Animated.View entering={FadeInDown.duration(400)}>
                  <Text
                    style={{
                      fontSize: 15,
                      color: c.text.secondary,
                      lineHeight: 22,
                    }}
                  >
                    Last time we talked about{" "}
                    <Text style={{ color: c.text.primary, fontWeight: "500" }}>
                      {recentThemes[0].toLowerCase()}
                    </Text>
                    {recentThemes.length > 1
                      ? ` and ${recentThemes[1].toLowerCase()}`
                      : ""}
                    . How are things going?
                  </Text>
                </Animated.View>
              )}

              <QuickMoodRow selected={moodScore} onSelect={setMood} />

              <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                <TextInput
                  value={generalNote}
                  onChangeText={(text) => {
                    setGeneralNote(text);
                    setNote(text);
                  }}
                  placeholder="Anything on your mind? (optional)"
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
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(300).duration(400)}>
                <Pressable
                  onPress={handleSubmitGeneral}
                  disabled={moodScore == null || isSubmitting}
                  accessibilityRole="button"
                  style={{
                    backgroundColor:
                      moodScore != null ? c.brand.purple : c.bg.elevated,
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
                      color:
                        moodScore != null ? "#FFFFFF" : c.text.tertiary,
                    }}
                  >
                    {isSubmitting ? "Saving..." : "Done"}
                  </Text>
                </Pressable>
              </Animated.View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getTitle(
  type: CheckInType | null,
  data: Record<string, unknown>,
): string {
  switch (type) {
    case "commitment_followup":
      return data.is_overdue ? "Catching up" : "How did it go?";
    case "morning_briefing":
      return "Good morning";
    case "pattern_checkin":
      return "I noticed something";
    case "general":
      return "Quick check-in";
    default:
      return "Check-in";
  }
}
