import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeIn, FadeInDown, SlideInRight, SlideOutLeft } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import CompanionAvatar from "@/components/companion/CompanionAvatar";
import { useAuthStore } from "@/store/auth";
import { useLifeDomainsStore, DOMAIN_META, ALL_DOMAINS } from "@/store/lifeDomains";
import { hapticLight, hapticMedium } from "@/lib/haptics";
import { registerPushToken } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import type { LifeDomainType } from "@/types/database";

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

const TOTAL_STEPS = 9;

const REASONS = [
  { emoji: "😮‍💨", label: "I'm feeling stressed" },
  { emoji: "🌱", label: "I want to grow" },
  { emoji: "💭", label: "Going through something" },
  { emoji: "🔍", label: "Just exploring" },
];

const STRESS_RESPONSES = [
  { emoji: "🤖", label: "Push through" },
  { emoji: "🌀", label: "Spiral (okay, a lot)" },
  { emoji: "🫠", label: "Pretend it's fine" },
  { emoji: "💤", label: "Shut down" },
];

const SUGGESTED_NAMES = ["Lumis", "Sol", "Nova", "Echo", "Sage"];

function getPersonalizedPath(reason: string, stress: string): { emoji: string; text: string }[] {
  if (reason === "I'm feeling stressed") {
    if (stress === "Push through" || stress === "Pretend it's fine") {
      return [
        { emoji: "🔍", text: "Recognize your stress signals before they build" },
        { emoji: "⏸️", text: "Learn to pause instead of powering through" },
        { emoji: "🛠️", text: "Build coping tools that actually work for you" },
        { emoji: "📈", text: "Track what helps and watch your progress" },
      ];
    }
    return [
      { emoji: "🧘", text: "Calm your nervous system in the moment" },
      { emoji: "🧩", text: "Understand what triggers your stress spirals" },
      { emoji: "💪", text: "Build resilience with small daily practices" },
      { emoji: "📈", text: "Track your wellbeing over time" },
    ];
  }

  if (reason === "Going through something") {
    return [
      { emoji: "💜", text: "Process what you're going through at your pace" },
      { emoji: "🤝", text: "Feel supported without judgment" },
      { emoji: "💡", text: "Gain clarity on what you need right now" },
      { emoji: "🌱", text: "Find your way forward, one step at a time" },
    ];
  }

  if (reason === "I want to grow") {
    return [
      { emoji: "🎯", text: "Set meaningful goals and stay accountable" },
      { emoji: "🧩", text: "Discover patterns you didn't know you had" },
      { emoji: "💡", text: "Develop deeper self-awareness" },
      { emoji: "📈", text: "Measure your growth with real data" },
    ];
  }

  return [
    { emoji: "🎯", text: "Build self-awareness" },
    { emoji: "💡", text: "Discover your patterns" },
    { emoji: "🛠️", text: "Learn coping tools that work for you" },
    { emoji: "📈", text: "Track your growth over time" },
  ];
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, setOnboarded, fetchProfile } = useAuthStore();
  const saveAssessment = useLifeDomainsStore((s) => s.saveAssessment);
  const [step, setStep] = useState<Step>(1);
  const [reason, setReason] = useState("");
  const [stressResponse, setStressResponse] = useState("");
  const [companionName, setCompanionName] = useState("Lumis");
  const [referralCode, setReferralCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [domainScores, setDomainScores] = useState<Record<LifeDomainType, number>>(
    Object.fromEntries(ALL_DOMAINS.map((d) => [d, 5])) as Record<LifeDomainType, number>,
  );
  const [futureVision, setFutureVision] = useState("");

  const next = async () => {
    await hapticLight();
    if (step < TOTAL_STEPS) {
      setStep((s) => (s + 1) as Step);
    }
  };

  const prev = async () => {
    await hapticLight();
    if (step > 1) {
      setStep((s) => (s - 1) as Step);
    }
  };

  const finishOnboarding = async (wantsNotifications: boolean) => {
    if (isSaving) return;
    setIsSaving(true);
    await hapticMedium();

    try {
      if (user) {
        const { error } = await supabase.from("users").upsert({
          id: user.id,
          email: user.email,
          companion_name: companionName,
          future_self_vision: futureVision.trim() || null,
          preferences: {
            onboarding_reason: reason,
            stress_response: stressResponse,
            notifications_enabled: wantsNotifications,
          },
          onboarding_completed_at: new Date().toISOString(),
        });

        if (error) throw error;

        await saveAssessment(
          ALL_DOMAINS.map((d) => ({ domain: d, score: domainScores[d] })),
        );

        if (wantsNotifications) {
          registerPushToken().catch(() => {});
        }

        // Apply referral code if provided
        if (referralCode.trim()) {
          try {
            await supabase.functions.invoke("redeem-referral", {
              body: { action: "apply", code: referralCode.trim() },
            });
          } catch {}
        }

        await fetchProfile();
      }

      setOnboarded(true);
      router.replace("/(tabs)/home");
    } catch (err: any) {
      Alert.alert(
        "Something went wrong",
        "We couldn't save your preferences. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const pathItems = getPersonalizedPath(reason, stressResponse);

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      {/* Progress bar */}
      <View className="px-lg pt-sm">
        <View className="h-1 rounded-full bg-bg-surface">
          <View
            className="h-1 rounded-full bg-brand-purple"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </View>
      </View>

      {step > 1 && (
        <Pressable onPress={prev} className="px-lg pt-sm">
          <Text className="text-sm text-text-tertiary">← Back</Text>
        </Pressable>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            className="px-lg"
          >
        {step === 1 && (
          <Animated.View entering={FadeIn.duration(600)} className="items-center">
            <CompanionAvatar expression="warm" size="large" />
            <Text className="mt-xl text-center text-h1 font-inter-semibold text-text-primary">
              Hi. I'm glad you're here.
            </Text>
            <Text className="mt-md text-center text-body text-text-secondary">
              No labels. No pressure.{"\n"}Just a space to grow.
            </Text>
            <Pressable onPress={next} className="mt-xl w-full items-center rounded-lg bg-brand-purple py-4">
              <Text className="text-body font-inter-semibold text-white">Let's begin</Text>
            </Pressable>
          </Animated.View>
        )}

        {step === 2 && (
          <Animated.View entering={SlideInRight.duration(300)} exiting={SlideOutLeft.duration(200)}>
            <Text className="mb-xl text-h2 font-inter-semibold text-text-primary">
              What brought you here today?
            </Text>
            {REASONS.map((r) => (
              <Pressable
                key={r.label}
                onPress={async () => {
                  setReason(r.label);
                  next();
                }}
                className={`mb-sm rounded-lg p-md ${
                  reason === r.label ? "border border-brand-purple bg-brand-purple/10" : "bg-bg-surface"
                }`}
                accessibilityLabel={r.label}
                accessibilityRole="button"
              >
                <Text className="text-body text-text-primary">
                  {r.emoji} {r.label}
                </Text>
              </Pressable>
            ))}
          </Animated.View>
        )}

        {step === 3 && (
          <Animated.View entering={SlideInRight.duration(300)} className="items-center">
            <CompanionAvatar expression="warm" size="medium" />
            <Text className="mt-lg text-center text-body text-text-primary">
              {reason === "I'm feeling stressed"
                ? "I hear you. Stress can feel like it's everywhere. Let me show you something that might help right now."
                : reason === "I want to grow"
                  ? "That takes real courage. Growth isn't always comfortable, but you're already taking the first step."
                  : reason === "Going through something"
                    ? "I'm sorry you're going through this. You don't have to do it alone."
                    : "Curiosity is a great place to start. Let me show you what I can do."}
            </Text>
            <Text className="mt-lg text-center text-body text-text-secondary">
              Try this: Take a slow breath in for 4 counts... hold for 4... and out for 6.
            </Text>
            <Pressable onPress={next} className="mt-xl w-full items-center rounded-lg bg-brand-purple py-4">
              <Text className="text-body font-inter-semibold text-white">That felt good</Text>
            </Pressable>
            <Pressable onPress={next} className="mt-sm items-center py-md">
              <Text className="text-body text-text-tertiary">Skip for now</Text>
            </Pressable>
          </Animated.View>
        )}

        {step === 4 && (
          <Animated.View entering={SlideInRight.duration(300)}>
            <Text className="mb-md text-h2 font-inter-semibold text-text-primary">
              When stress hits, I usually...
            </Text>
            {STRESS_RESPONSES.map((r) => (
              <Pressable
                key={r.label}
                onPress={async () => {
                  setStressResponse(r.label);
                  next();
                }}
                className={`mb-sm rounded-lg p-md ${
                  stressResponse === r.label ? "border border-brand-purple bg-brand-purple/10" : "bg-bg-surface"
                }`}
                accessibilityLabel={r.label}
                accessibilityRole="button"
              >
                <Text className="text-body text-text-primary">
                  {r.emoji} {r.label}
                </Text>
              </Pressable>
            ))}
          </Animated.View>
        )}

        {step === 5 && (
          <Animated.View entering={SlideInRight.duration(300)} className="items-center">
            <CompanionAvatar expression="curious" size="large" />
            <Text className="mt-lg text-center text-h2 font-inter-semibold text-text-primary">
              Your companion is ready
            </Text>
            <Text className="mt-sm text-center text-body text-text-secondary">
              What would you like to call them?
            </Text>
            <View className="mt-lg flex-row flex-wrap justify-center gap-sm">
              {SUGGESTED_NAMES.map((name) => (
                <Pressable
                  key={name}
                  onPress={async () => {
                    setCompanionName(name);
                    await hapticLight();
                  }}
                  className={`rounded-full px-4 py-2 ${
                    companionName === name ? "bg-brand-purple" : "border border-bg-elevated bg-bg-surface"
                  }`}
                >
                  <Text className={companionName === name ? "text-white" : "text-text-primary"}>
                    {name}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              className="mt-md w-full rounded-lg bg-bg-surface px-md py-3 text-center text-body text-text-primary"
              placeholder="Or type your own name..."
              placeholderTextColor="#5A6178"
              value={companionName}
              onChangeText={setCompanionName}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              blurOnSubmit
            />
            <Pressable onPress={() => { 
              Keyboard.dismiss(); 
              if (!companionName.trim()) {
                setCompanionName("Lumis");
              }
              next(); 
            }} className="mt-xl w-full items-center rounded-lg bg-brand-purple py-4">
              <Text className="text-body font-inter-semibold text-white">
                Nice to meet you, {companionName}!
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {step === 6 && (
          <Animated.View entering={SlideInRight.duration(300)} className="items-center">
            <Text className="mb-lg text-center text-h2 font-inter-semibold text-text-primary">
              Based on what you shared, here's your path
            </Text>
            <View className="w-full rounded-lg bg-bg-surface p-lg">
              {pathItems.map((item, i) => (
                <View key={i} className={`flex-row items-center ${i < pathItems.length - 1 ? "mb-md" : ""}`}>
                  <Text className="mr-sm text-lg">{item.emoji}</Text>
                  <Text className="flex-1 text-body text-text-primary">{item.text}</Text>
                </View>
              ))}
            </View>
            <Pressable onPress={next} className="mt-xl w-full items-center rounded-lg bg-brand-purple py-4">
              <Text className="text-body font-inter-semibold text-white">Let's do this</Text>
            </Pressable>
          </Animated.View>
        )}

        {step === 7 && (
          <Animated.View entering={SlideInRight.duration(300)}>
            <Text className="mb-sm text-center text-h2 font-inter-semibold text-text-primary">
              Quick Life Check-in
            </Text>
            <Text className="mb-lg text-center text-body text-text-secondary">
              Rate each area of your life right now (1–10). Takes 20 seconds.
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {ALL_DOMAINS.map((domain) => {
                const meta = DOMAIN_META[domain];
                const score = domainScores[domain];
                return (
                  <View key={domain} style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                      <Ionicons name={meta.icon as any} size={16} color={meta.color} style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#F4F4F5" }}>{meta.label}</Text>
                      <Text style={{ marginLeft: "auto", fontSize: 14, fontWeight: "700", color: meta.color }}>{score}</Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 4 }}>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
                        <Pressable
                          key={val}
                          onPress={() => {
                            setDomainScores((prev) => ({ ...prev, [domain]: val }));
                            hapticLight();
                          }}
                          style={{
                            flex: 1, height: 32, borderRadius: 6, alignItems: "center", justifyContent: "center",
                            backgroundColor: val <= score ? meta.color + "30" : "#1E1E27",
                            borderWidth: 1,
                            borderColor: val <= score ? meta.color + "50" : "#27272A40",
                          }}
                        >
                          <Text style={{ fontSize: 11, color: val <= score ? meta.color : "#52525B", fontWeight: "600" }}>{val}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            <Pressable onPress={next} className="mt-lg w-full items-center rounded-lg bg-brand-purple py-4">
              <Text className="text-body font-inter-semibold text-white">Continue</Text>
            </Pressable>
          </Animated.View>
        )}

        {step === 8 && (
          <Animated.View entering={SlideInRight.duration(300)} className="items-center">
            <Text style={{ fontSize: 36, marginBottom: 12 }}>🔮</Text>
            <Text className="text-center text-h2 font-inter-semibold text-text-primary">
              Imagine 6 months from now
            </Text>
            <Text className="mt-sm text-center text-body text-text-secondary">
              Everything is going well. What's different about your life?
            </Text>
            <TextInput
              className="mt-lg w-full rounded-lg bg-bg-surface px-md py-4 text-body text-text-primary"
              placeholder="e.g., I'm sleeping better, less anxious, exercising 3x a week..."
              placeholderTextColor="#5A6178"
              value={futureVision}
              onChangeText={setFutureVision}
              multiline
              style={{ minHeight: 100, textAlignVertical: "top" }}
            />
            <Pressable onPress={() => { Keyboard.dismiss(); next(); }} className="mt-xl w-full items-center rounded-lg bg-brand-purple py-4">
              <Text className="text-body font-inter-semibold text-white">
                {futureVision.trim() ? "That's the goal" : "Skip for now"}
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {step === 9 && (
          <Animated.View entering={SlideInRight.duration(300)} className="items-center">
            <CompanionAvatar expression="proud" size="large" />
            <Text className="mt-lg text-center text-h2 font-inter-semibold text-text-primary">
              Can I check in with you tomorrow morning?
            </Text>
            <Text className="mt-sm text-center text-body text-text-secondary">
              A gentle reminder — never guilt. You can change this anytime.
            </Text>
            <Pressable
              onPress={() => { Keyboard.dismiss(); finishOnboarding(true); }}
              disabled={isSaving}
              className={`mt-xl w-full items-center rounded-lg py-4 ${isSaving ? "bg-brand-purple/50" : "bg-brand-purple"}`}
            >
              <Text className="text-body font-inter-semibold text-white">
                {isSaving ? "Setting up..." : "Yes, please"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => { Keyboard.dismiss(); finishOnboarding(false); }}
              disabled={isSaving}
              className="mt-sm items-center py-md"
            >
              <Text className="text-body text-text-tertiary">Maybe later</Text>
            </Pressable>

            {/* Referral code (optional) */}
            <View className="mt-lg w-full items-center">
              <TextInput
                className="w-full rounded-lg bg-bg-surface px-md py-3 text-center text-body text-text-primary"
                placeholder="Have a referral code? (optional)"
                placeholderTextColor="#5A6178"
                value={referralCode}
                onChangeText={(t) => setReferralCode(t.toUpperCase())}
                autoCapitalize="characters"
                maxLength={8}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>
          </Animated.View>
        )}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
