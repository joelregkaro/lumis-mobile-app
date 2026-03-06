import { useState, useEffect } from "react";
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
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  SlideOutLeft,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CompanionAvatar from "@/components/companion/CompanionAvatar";
import { useAuthStore } from "@/store/auth";
import { useLifeDomainsStore, DOMAIN_META, ALL_DOMAINS } from "@/store/lifeDomains";
import { hapticLight, hapticMedium, hapticSuccess } from "@/lib/haptics";
import { registerPushToken } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/analytics";
import { colors } from "@/constants/theme";
import type { LifeDomainType } from "@/types/database";

const BLUEPRINT_STORAGE_KEY = "lumis_blueprint_data";

const c = colors.dark;
type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;
const TOTAL_STEPS = 7;

const REASONS = [
  { emoji: "😮‍💨", label: "I'm feeling stressed", subtitle: "Overwhelmed, anxious, or burnt out" },
  { emoji: "🌱", label: "I want to grow", subtitle: "Build better habits and self-awareness" },
  { emoji: "💭", label: "Going through something", subtitle: "Processing a tough situation" },
  { emoji: "🔍", label: "Just exploring", subtitle: "Curious what this can do" },
];

const STRESS_RESPONSES = [
  { emoji: "🤖", label: "Push through", color: "#A78BFA" },
  { emoji: "🌀", label: "Spiral (okay, a lot)", color: "#7C3AED" },
  { emoji: "🫠", label: "Pretend it's fine", color: "#2DD4BF" },
  { emoji: "💤", label: "Shut down", color: "#F5C542" },
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

function BreathingCircle() {
  const scale = useSharedValue(1);
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.4, { duration: 4000 }),
        withTiming(1.0, { duration: 6000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );

    const cyclePhases = () => {
      setPhase("in");
      setTimeout(() => setPhase("hold"), 4000);
      setTimeout(() => setPhase("out"), 8000);
    };
    cyclePhases();
    const interval = setInterval(cyclePhases, 14000);
    return () => clearInterval(interval);
  }, []);

  const breathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={{ alignItems: "center", marginVertical: 32 }}>
      <Animated.View style={[breathStyle]}>
        <LinearGradient
          colors={[`${c.brand.purple}60`, `${c.brand.teal}40`]}
          style={{
            width: 160,
            height: 160,
            borderRadius: 80,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: `${c.brand.purple}30`,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "600", color: c.text.primary }}>
              {phase === "in" ? "Breathe in..." : phase === "hold" ? "Hold..." : "Breathe out..."}
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>
      <Text style={{ fontSize: 13, color: c.text.secondary, marginTop: 24 }}>
        4 seconds in · 4 seconds hold · 6 seconds out
      </Text>
    </View>
  );
}

// Map blueprint domain quick-rate (1-3) to 1-10 scores for life_domains
const BLUEPRINT_DOMAIN_MAP: Record<number, number> = { 1: 3, 2: 5, 3: 8 };

// Map blueprint Q1 answer to stress response label
const BLUEPRINT_STRESS_MAP: Record<number, string> = {
  1: "Push through",
  2: "Push through",
  3: "Pretend it's fine",
  4: "Spiral (okay, a lot)",
};

// Map blueprint Q7 answer to reason label
const BLUEPRINT_REASON_MAP: Record<number, string> = {
  1: "I want to grow",
  2: "I want to grow",
  3: "I'm feeling stressed",
  4: "Just exploring",
};

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, setOnboarded, fetchProfile } = useAuthStore();
  const saveAssessment = useLifeDomainsStore((s) => s.saveAssessment);
  const [step, setStep] = useState<Step>(1);
  const [reason, setReason] = useState("");
  const [stressResponse, setStressResponse] = useState("");
  const [companionName, setCompanionName] = useState("Lumis");
  const [isSaving, setIsSaving] = useState(false);
  const [nameReaction, setNameReaction] = useState("");
  const [domainScores, setDomainScores] = useState<Record<LifeDomainType, number>>(
    Object.fromEntries(ALL_DOMAINS.map((d) => [d, 5])) as Record<LifeDomainType, number>,
  );
  const [futureVision, setFutureVision] = useState("");
  const [hasConsented, setHasConsented] = useState(false);
  const [skippedSteps, setSkippedSteps] = useState<Set<number>>(new Set());

  // Load blueprint data and pre-populate + skip redundant steps
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(BLUEPRINT_STORAGE_KEY);
        if (!raw) return;
        const bp = JSON.parse(raw);
        const skip = new Set<number>();

        if (bp.answers?.[7]) {
          const mappedReason = BLUEPRINT_REASON_MAP[bp.answers[7]];
          if (mappedReason) {
            setReason(mappedReason);
            skip.add(2);
          }
        }

        if (bp.answers?.[1]) {
          const mappedStress = BLUEPRINT_STRESS_MAP[bp.answers[1]];
          if (mappedStress) {
            setStressResponse(mappedStress);
            skip.add(4);
          }
        }

        if (bp.domainRatings) {
          const mapped: Record<string, number> = {};
          for (const [domain, rating] of Object.entries(bp.domainRatings)) {
            mapped[domain] = BLUEPRINT_DOMAIN_MAP[rating as number] ?? 5;
          }
          setDomainScores((prev) => ({ ...prev, ...mapped } as Record<LifeDomainType, number>));
          skip.add(6);
        }

        setSkippedSteps(skip);
      } catch {}
    })();
  }, []);

  const nextStep = (from: number): Step => {
    let s = from + 1;
    while (s <= TOTAL_STEPS && skippedSteps.has(s)) s++;
    return Math.min(s, TOTAL_STEPS) as Step;
  };

  const prevStep = (from: number): Step => {
    let s = from - 1;
    while (s >= 1 && skippedSteps.has(s)) s--;
    return Math.max(s, 1) as Step;
  };

  const next = async () => {
    await hapticLight();
    if (step < TOTAL_STEPS) setStep(nextStep(step));
  };

  const prev = async () => {
    await hapticLight();
    if (step > 1) setStep(prevStep(step));
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

        if (wantsNotifications) registerPushToken().catch(() => {});
        await fetchProfile();
      }
      setOnboarded(true);
      track("onboarding_completed", { reason, companion_name: companionName });
      router.replace("/(tabs)/home");
    } catch {
      Alert.alert("Something went wrong", "We couldn't save your preferences. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const pathItems = getPersonalizedPath(reason, stressResponse);
  const visibleSteps = Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).filter((s) => !skippedSteps.has(s));
  const currentIndex = visibleSteps.indexOf(step);
  const progressPct = visibleSteps.length > 1 ? (currentIndex / (visibleSteps.length - 1)) * 100 : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg.primary }}>
      {/* Progress bar — hidden on step 1 */}
      {step > 1 && (
        <Animated.View entering={FadeIn.duration(300)} style={{ paddingHorizontal: 24, paddingTop: 8 }}>
          <View style={{ height: 4, borderRadius: 2, backgroundColor: c.bg.surface }}>
            <View
              style={{
                height: 4,
                borderRadius: 2,
                backgroundColor: c.brand.purple,
                width: `${progressPct}%`,
              }}
            />
          </View>
        </Animated.View>
      )}

      {step > 1 && (
        <Pressable onPress={prev} style={{ paddingHorizontal: 24, paddingTop: 8 }}>
          <Text style={{ fontSize: 14, color: c.text.tertiary }}>← Back</Text>
        </Pressable>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={{ paddingHorizontal: 24 }}
          >
            {/* Step 1: Emotional Hook — full screen */}
            {step === 1 && (
              <Animated.View entering={FadeIn.duration(800)} style={{ alignItems: "center" }}>
                <CompanionAvatar expression="warm" size="large" />
                <Animated.Text
                  entering={FadeInUp.delay(400).duration(600)}
                  style={{
                    fontSize: 26,
                    fontWeight: "700",
                    color: c.text.primary,
                    textAlign: "center",
                    marginTop: 40,
                    lineHeight: 36,
                    letterSpacing: -0.5,
                  }}
                >
                  Everyone deserves someone{"\n"}who gets them.
                </Animated.Text>
                <Animated.Text
                  entering={FadeInUp.delay(800).duration(600)}
                  style={{
                    fontSize: 16,
                    color: c.text.secondary,
                    textAlign: "center",
                    marginTop: 16,
                    lineHeight: 24,
                  }}
                >
                  No labels. No judgment.{"\n"}Just a space that's yours.
                </Animated.Text>
                <Animated.View entering={FadeInUp.delay(1200).duration(400)} style={{ width: "100%", marginTop: 48 }}>
                  <Pressable
                    onPress={next}
                    style={{
                      backgroundColor: c.brand.purple,
                      borderRadius: 16,
                      paddingVertical: 18,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 17, fontWeight: "600", color: "white" }}>
                      Meet your companion
                    </Text>
                  </Pressable>
                </Animated.View>
              </Animated.View>
            )}

            {/* Step 2: Reason — larger cards */}
            {step === 2 && (
              <Animated.View entering={SlideInRight.duration(300)} exiting={SlideOutLeft.duration(200)}>
                <Text style={{ fontSize: 24, fontWeight: "700", color: c.text.primary, marginBottom: 8 }}>
                  What brought you here?
                </Text>
                <Text style={{ fontSize: 15, color: c.text.secondary, marginBottom: 28 }}>
                  There's no wrong answer.
                </Text>
                {REASONS.map((r) => (
                  <Pressable
                    key={r.label}
                    onPress={async () => {
                      setReason(r.label);
                      await hapticLight();
                      next();
                    }}
                    style={{
                      marginBottom: 12,
                      borderRadius: 16,
                      padding: 18,
                      backgroundColor: reason === r.label ? `${c.brand.purple}15` : c.bg.surface,
                      borderWidth: 1,
                      borderColor: reason === r.label ? `${c.brand.purple}50` : c.bg.border,
                    }}
                    accessibilityLabel={r.label}
                    accessibilityRole="button"
                  >
                    <Text style={{ fontSize: 28, marginBottom: 6 }}>{r.emoji}</Text>
                    <Text style={{ fontSize: 16, fontWeight: "600", color: c.text.primary }}>{r.label}</Text>
                    <Text style={{ fontSize: 13, color: c.text.secondary, marginTop: 4 }}>{r.subtitle}</Text>
                  </Pressable>
                ))}
              </Animated.View>
            )}

            {/* Step 3: Breathing Exercise */}
            {step === 3 && (
              <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 22, fontWeight: "700", color: c.text.primary, textAlign: "center" }}>
                  Let's try something together.
                </Text>
                <Text style={{ fontSize: 15, color: c.text.secondary, textAlign: "center", marginTop: 8 }}>
                  Follow along for a few breaths.
                </Text>
                <BreathingCircle />
                <Pressable
                  onPress={async () => { await hapticSuccess(); next(); }}
                  style={{
                    width: "100%",
                    backgroundColor: c.brand.purple,
                    borderRadius: 16,
                    paddingVertical: 16,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: "600", color: "white" }}>That felt good</Text>
                </Pressable>
                <Pressable onPress={next} style={{ paddingVertical: 16 }}>
                  <Text style={{ fontSize: 15, color: c.text.tertiary }}>Skip for now</Text>
                </Pressable>
              </Animated.View>
            )}

            {/* Step 4: Stress Response */}
            {step === 4 && (
              <Animated.View entering={SlideInRight.duration(300)}>
                <Text style={{ fontSize: 22, fontWeight: "700", color: c.text.primary, marginBottom: 24 }}>
                  When stress hits, I usually...
                </Text>
                {STRESS_RESPONSES.map((r) => (
                  <Pressable
                    key={r.label}
                    onPress={async () => {
                      setStressResponse(r.label);
                      await hapticLight();
                      next();
                    }}
                    style={{
                      marginBottom: 12,
                      borderRadius: 16,
                      padding: 18,
                      backgroundColor: stressResponse === r.label ? `${c.brand.purple}15` : c.bg.surface,
                      borderWidth: 1,
                      borderColor: stressResponse === r.label ? `${c.brand.purple}50` : c.bg.border,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                    accessibilityLabel={r.label}
                    accessibilityRole="button"
                  >
                    <Text style={{ fontSize: 28, marginRight: 14 }}>{r.emoji}</Text>
                    <Text style={{ fontSize: 16, fontWeight: "500", color: c.text.primary }}>{r.label}</Text>
                  </Pressable>
                ))}
              </Animated.View>
            )}

            {/* Step 5: Name companion — with personality */}
            {step === 5 && (
              <Animated.View entering={SlideInRight.duration(300)} style={{ alignItems: "center" }}>
                <CompanionAvatar
                  expression={nameReaction ? "proud" : "curious"}
                  size="large"
                />
                {nameReaction ? (
                  <Animated.View entering={FadeInDown.duration(300)} style={{ marginTop: 12, backgroundColor: c.bg.surface, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10 }}>
                    <Text style={{ fontSize: 15, color: c.brand.purpleLight, fontWeight: "500", textAlign: "center" }}>
                      {nameReaction}
                    </Text>
                  </Animated.View>
                ) : null}
                <Text style={{ fontSize: 22, fontWeight: "700", color: c.text.primary, textAlign: "center", marginTop: 20 }}>
                  Give me a name
                </Text>
                <Text style={{ fontSize: 15, color: c.text.secondary, textAlign: "center", marginTop: 8 }}>
                  I'll be here whenever you need me.
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 24 }}>
                  {SUGGESTED_NAMES.map((name) => (
                    <Pressable
                      key={name}
                      onPress={async () => {
                        setCompanionName(name);
                        setNameReaction(`${name}... I like that!`);
                        await hapticLight();
                      }}
                      style={{
                        borderRadius: 24,
                        paddingHorizontal: 20,
                        paddingVertical: 10,
                        backgroundColor: companionName === name ? c.brand.purple : c.bg.surface,
                        borderWidth: 1,
                        borderColor: companionName === name ? c.brand.purple : c.bg.border,
                      }}
                    >
                      <Text style={{ fontSize: 15, fontWeight: "500", color: companionName === name ? "white" : c.text.primary }}>
                        {name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  style={{
                    marginTop: 16,
                    width: "100%",
                    borderRadius: 16,
                    backgroundColor: c.bg.surface,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    textAlign: "center",
                    fontSize: 16,
                    color: c.text.primary,
                  }}
                  placeholder="Or type your own..."
                  placeholderTextColor={c.text.tertiary}
                  value={companionName}
                  onChangeText={(t) => {
                    setCompanionName(t);
                    if (t.trim().length > 1 && !SUGGESTED_NAMES.includes(t)) {
                      setNameReaction(`${t}... that's perfect.`);
                    }
                  }}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  blurOnSubmit
                />
                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    if (!companionName.trim()) setCompanionName("Lumis");
                    next();
                  }}
                  style={{
                    marginTop: 32,
                    width: "100%",
                    backgroundColor: c.brand.purple,
                    borderRadius: 16,
                    paddingVertical: 16,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: "600", color: "white" }}>
                    Nice to meet you, {companionName || "Lumis"}!
                  </Text>
                </Pressable>
              </Animated.View>
            )}

            {/* Step 6: Personalized Path + Life Domains + Future Vision (merged) */}
            {step === 6 && (
              <Animated.View entering={SlideInRight.duration(300)}>
                <Text style={{ fontSize: 22, fontWeight: "700", color: c.text.primary, textAlign: "center", marginBottom: 8 }}>
                  Your personal path
                </Text>
                <Text style={{ fontSize: 14, color: c.text.secondary, textAlign: "center", marginBottom: 24 }}>
                  Based on what you shared, here's the plan.
                </Text>
                <View style={{ backgroundColor: c.bg.surface, borderRadius: 16, padding: 20, marginBottom: 24 }}>
                  {pathItems.map((item, i) => (
                    <Animated.View
                      key={i}
                      entering={FadeInDown.delay(200 + i * 150).duration(400)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: i < pathItems.length - 1 ? 16 : 0,
                      }}
                    >
                      <View style={{
                        width: 32, height: 32, borderRadius: 16,
                        backgroundColor: `${c.brand.teal}20`,
                        alignItems: "center", justifyContent: "center", marginRight: 12,
                      }}>
                        <Text style={{ fontSize: 16 }}>{item.emoji}</Text>
                      </View>
                      <Text style={{ flex: 1, fontSize: 15, color: c.text.primary, lineHeight: 22 }}>{item.text}</Text>
                      <Animated.View entering={FadeIn.delay(600 + i * 150).duration(300)}>
                        <Ionicons name="checkmark-circle" size={20} color={c.brand.teal} />
                      </Animated.View>
                    </Animated.View>
                  ))}
                </View>

                {/* Quick Life Check-in */}
                <Text style={{ fontSize: 16, fontWeight: "600", color: c.text.primary, marginBottom: 4 }}>
                  Quick life check-in
                </Text>
                <Text style={{ fontSize: 13, color: c.text.secondary, marginBottom: 16 }}>
                  Rate each area 1–10. Takes 20 seconds.
                </Text>
                {ALL_DOMAINS.map((domain) => {
                  const meta = DOMAIN_META[domain];
                  const score = domainScores[domain];
                  return (
                    <View key={domain} style={{ marginBottom: 14 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                        <Ionicons name={meta.icon as any} size={14} color={meta.color} style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 13, fontWeight: "600", color: c.text.primary }}>{meta.label}</Text>
                        <Text style={{ marginLeft: "auto", fontSize: 13, fontWeight: "700", color: meta.color }}>{score}</Text>
                      </View>
                      <View style={{ flexDirection: "row", gap: 3 }}>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
                          <Pressable
                            key={val}
                            onPress={() => { setDomainScores((prev) => ({ ...prev, [domain]: val })); hapticLight(); }}
                            style={{
                              flex: 1, height: 28, borderRadius: 6, alignItems: "center", justifyContent: "center",
                              backgroundColor: val <= score ? `${meta.color}30` : c.bg.surface,
                              borderWidth: 1,
                              borderColor: val <= score ? `${meta.color}50` : c.bg.border,
                            }}
                          >
                            <Text style={{ fontSize: 10, color: val <= score ? meta.color : c.text.tertiary, fontWeight: "600" }}>{val}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  );
                })}

                <Pressable
                  onPress={next}
                  style={{
                    marginTop: 20,
                    width: "100%",
                    backgroundColor: c.brand.purple,
                    borderRadius: 16,
                    paddingVertical: 16,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: "600", color: "white" }}>Continue</Text>
                </Pressable>
              </Animated.View>
            )}

            {/* Step 7: Future Vision + Notifications (final) */}
            {step === 7 && (
              <Animated.View entering={SlideInRight.duration(300)} style={{ alignItems: "center" }}>
                <LinearGradient
                  colors={[`${c.brand.purple}20`, `${c.brand.teal}10`, c.bg.primary]}
                  style={{
                    position: "absolute",
                    top: -100,
                    left: -40,
                    right: -40,
                    height: 300,
                    borderRadius: 200,
                  }}
                />
                <Text style={{ fontSize: 36, marginBottom: 12 }}>🔮</Text>
                <Text style={{ fontSize: 22, fontWeight: "700", color: c.text.primary, textAlign: "center" }}>
                  Imagine 6 months from now
                </Text>
                <Text style={{ fontSize: 15, color: c.text.secondary, textAlign: "center", marginTop: 8, lineHeight: 22 }}>
                  Everything is going well.{"\n"}What's different about your life?
                </Text>
                <TextInput
                  style={{
                    marginTop: 24,
                    width: "100%",
                    borderRadius: 16,
                    backgroundColor: c.bg.surface,
                    paddingHorizontal: 16,
                    paddingVertical: 16,
                    fontSize: 15,
                    color: c.text.primary,
                    minHeight: 100,
                    textAlignVertical: "top",
                    lineHeight: 22,
                  }}
                  placeholder="e.g., I'm sleeping better, less anxious, exercising 3x a week..."
                  placeholderTextColor={c.text.tertiary}
                  value={futureVision}
                  onChangeText={setFutureVision}
                  multiline
                />

                <Pressable
                  onPress={() => setHasConsented((v) => !v)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 24,
                    paddingVertical: 4,
                  }}
                >
                  <Ionicons
                    name={hasConsented ? "checkbox" : "square-outline"}
                    size={20}
                    color={hasConsented ? c.brand.purple : c.text.tertiary}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={{ flex: 1, fontSize: 13, color: c.text.secondary, lineHeight: 18 }}>
                    I agree to the{" "}
                    <Text
                      style={{ color: c.brand.purple, fontWeight: "600" }}
                      onPress={() => router.push("/privacy" as any)}
                    >
                      Privacy Policy
                    </Text>{" "}
                    and{" "}
                    <Text
                      style={{ color: c.brand.purple, fontWeight: "600" }}
                      onPress={() => router.push("/terms" as any)}
                    >
                      Terms of Service
                    </Text>
                  </Text>
                </Pressable>

                <View style={{ marginTop: 24, width: "100%", backgroundColor: c.bg.surface, borderRadius: 16, padding: 18 }}>
                  <CompanionAvatar expression="proud" size="small" />
                  <Text style={{ fontSize: 15, fontWeight: "600", color: c.text.primary, marginTop: 12 }}>
                    Can I check in with you tomorrow?
                  </Text>
                  <Text style={{ fontSize: 13, color: c.text.secondary, marginTop: 4 }}>
                    A gentle reminder — never guilt. You can change this anytime.
                  </Text>
                </View>

                <Pressable
                  onPress={() => { Keyboard.dismiss(); finishOnboarding(true); }}
                  disabled={isSaving || !hasConsented}
                  style={{
                    marginTop: 20,
                    width: "100%",
                    backgroundColor: isSaving || !hasConsented ? `${c.brand.purple}40` : c.brand.purple,
                    borderRadius: 16,
                    paddingVertical: 16,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: "600", color: "white" }}>
                    {isSaving ? "Setting up..." : "Yes, let's go!"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => { Keyboard.dismiss(); finishOnboarding(false); }}
                  disabled={isSaving}
                  style={{ paddingVertical: 16 }}
                >
                  <Text style={{ fontSize: 15, color: c.text.tertiary }}>Maybe later</Text>
                </Pressable>
              </Animated.View>
            )}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
