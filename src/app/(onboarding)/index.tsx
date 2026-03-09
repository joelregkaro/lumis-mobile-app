import { useState, useEffect, useCallback, useRef } from "react";
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
  ActivityIndicator,
  Dimensions,
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
  withDelay,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import QuizCard from "@/components/blueprint/QuizCard";
import type { QuizOption } from "@/components/blueprint/QuizCard";
import DomainQuickRate from "@/components/blueprint/DomainQuickRate";
import type { DomainRating } from "@/components/blueprint/DomainQuickRate";
import ShareFooter from "@/components/share/ShareFooter";
import { useAuthStore } from "@/store/auth";
import { useOnboardingStore } from "@/store/onboarding";
import {
  hapticLight,
  hapticMedium,
  hapticSuccess,
  hapticMilestone,
  hapticSelection,
} from "@/lib/haptics";
import { registerPushToken } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/analytics";
import { colors } from "@/constants/theme";

const c = colors.dark;
const TOTAL_STEPS = 12;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

// --- Quiz Questions (same as life-blueprint) ---

interface QuizQuestion {
  id: number;
  question: string;
  subtitle?: string;
  options: QuizOption[];
}

const QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: "When life throws a curveball, you...",
    subtitle: "Be honest — no judgment here.",
    options: [
      { emoji: "💪", label: "Lean into it — challenge accepted", value: 1 },
      { emoji: "🧊", label: "Freeze first, then figure it out", value: 2 },
      { emoji: "🫠", label: "Pretend everything is fine", value: 3 },
      { emoji: "🌀", label: "Spiral first, recover later", value: 4 },
    ],
  },
  {
    id: 2,
    question: "Your ideal Saturday looks like...",
    options: [
      { emoji: "🏔️", label: "Adventure outdoors", value: 1 },
      { emoji: "🍕", label: "People and good food", value: 2 },
      { emoji: "🛋️", label: "Solo recharge", value: 3 },
      { emoji: "🎨", label: "Making something", value: 4 },
    ],
  },
  {
    id: 3,
    question: "At 2 AM, your mind is usually...",
    subtitle: "We've all been there.",
    options: [
      { emoji: "🌙", label: "Reflecting on the day", value: 1 },
      { emoji: "📋", label: "Planning tomorrow", value: 2 },
      { emoji: "😰", label: "Worrying about everything", value: 3 },
      { emoji: "😴", label: "Peaceful — I sleep like a rock", value: 4 },
    ],
  },
  {
    id: 4,
    question: "When someone gives you advice, you...",
    options: [
      { emoji: "🤔", label: "Take it in, decide later", value: 1 },
      { emoji: "🤨", label: "Depends who it's from", value: 2 },
      { emoji: "🛡️", label: "Get defensive at first", value: 3 },
      { emoji: "📝", label: "Love it — always learning", value: 4 },
    ],
  },
  {
    id: 5,
    question: "The thing people don't know about you...",
    subtitle: "The real you.",
    options: [
      { emoji: "🥀", label: "I'm more sensitive than I look", value: 1 },
      { emoji: "💜", label: "I care deeply but hide it", value: 2 },
      { emoji: "⚖️", label: "I'm harder on myself than anyone", value: 3 },
      { emoji: "👁️", label: "I notice everything", value: 4 },
    ],
  },
  {
    id: 6,
    question: "Your relationship with your phone is...",
    options: [
      { emoji: "🧘", label: "I control it", value: 1 },
      { emoji: "🤷", label: "It's fine... mostly", value: 2 },
      { emoji: "📱", label: "It controls me, honestly", value: 3 },
      { emoji: "🔧", label: "Working on it", value: 4 },
    ],
  },
  {
    id: 7,
    question: "When you think about next year, you feel...",
    options: [
      { emoji: "🔥", label: "Excited — big plans", value: 1 },
      { emoji: "🌤️", label: "Cautiously optimistic", value: 2 },
      { emoji: "😟", label: "Anxious about it", value: 3 },
      { emoji: "🤷", label: "Haven't really thought about it", value: 4 },
    ],
  },
];

const INITIAL_DOMAINS: DomainRating[] = [
  { domain: "health", label: "Health", icon: "heart-outline", color: "#F87171", value: 2 },
  { domain: "career", label: "Career", icon: "briefcase-outline", color: "#60A5FA", value: 2 },
  { domain: "relationships", label: "Relationships", icon: "people-outline", color: "#A78BFA", value: 2 },
  { domain: "personal_growth", label: "Growth", icon: "trending-up", color: "#2DD4BF", value: 2 },
  { domain: "rest_recovery", label: "Rest", icon: "bed-outline", color: "#FBBF24", value: 2 },
  { domain: "fun_creativity", label: "Fun", icon: "color-palette-outline", color: "#F472B6", value: 2 },
];

const REASONS = [
  { key: "overwhelmed", emoji: "😮‍💨", label: "Feeling overwhelmed and need a breather", subtitle: "Stressed, anxious, or burnt out" },
  { key: "understand", emoji: "🧠", label: "Want to actually understand myself", subtitle: "Build self-awareness and grow" },
  { key: "tough", emoji: "💙", label: "Going through something tough", subtitle: "Processing a difficult time" },
  { key: "exploring", emoji: "🔍", label: "Curious — just exploring", subtitle: "Seeing what this is about" },
];

const SUGGESTED_NAMES = ["Lumis", "Sol", "Nova", "Kai", "Sage"];

const ATTR_META: Record<string, { label: string; color: string }> = {
  awareness: { label: "Awareness", color: "#A78BFA" },
  resilience: { label: "Resilience", color: "#F87171" },
  discipline: { label: "Discipline", color: "#2DD4BF" },
  growth: { label: "Growth", color: "#FBBF24" },
  connection: { label: "Connection", color: "#60A5FA" },
  vitality: { label: "Vitality", color: "#34D399" },
};

const VALUE_RESPONSES: Record<string, { messages: string[]; exercise?: string }> = {
  overwhelmed: {
    messages: [
      "I hear you. That heaviness is real.",
      "Let's try something quick together — it only takes 15 seconds.",
      "Look around and tap below for each thing you can see...",
    ],
    exercise: "grounding",
  },
  understand: {
    messages: [
      "That's a powerful reason to be here.",
      "Here's something interesting: people who actively seek self-understanding tend to handle life's curveballs 40% better.",
      "You're already ahead of most people just by showing up.",
    ],
  },
  tough: {
    messages: [
      "Thank you for trusting me with that.",
      "You don't have to explain everything right now — or ever, really.",
      "I'm just here. Whenever you're ready.",
    ],
  },
  exploring: {
    messages: [
      "Love that energy.",
      "The fact that you're here says something good about you — most people just scroll past.",
      "Let me show you what I can do.",
    ],
  },
};

// --- Breathing Circle ---

function BreathingCircle() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.0, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.4, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, []);

  const breathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={{ alignItems: "center", marginVertical: 40 }}>
      <Animated.View style={breathStyle}>
        <LinearGradient
          colors={[`${c.brand.purple}60`, `${c.brand.teal}40`]}
          style={{
            width: 180,
            height: 180,
            borderRadius: 90,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: `${c.brand.purple}25`,
            }}
          />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

// --- Grounding Exercise ---

function GroundingExercise({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState(0);
  const items = ["something blue", "a texture", "a light source", "something small", "your own hands"];

  return (
    <View style={{ marginTop: 16 }}>
      {count < 5 ? (
        <Pressable
          onPress={async () => {
            await hapticSelection();
            setCount((c) => c + 1);
          }}
          style={{
            backgroundColor: c.bg.surface,
            borderRadius: 16,
            padding: 20,
            alignItems: "center",
            borderWidth: 1,
            borderColor: `${c.brand.teal}30`,
          }}
        >
          <Text style={{ fontSize: 15, color: c.text.secondary, marginBottom: 8 }}>
            {count + 1} of 5 — find {items[count]}
          </Text>
          <Text style={{ fontSize: 18, fontWeight: "700", color: c.brand.teal }}>Tap when you see it</Text>
          <View style={{ flexDirection: "row", marginTop: 12, gap: 6 }}>
            {Array.from({ length: 5 }, (_, i) => (
              <View
                key={i}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: i < count ? c.brand.teal : `${c.text.tertiary}30`,
                }}
              />
            ))}
          </View>
        </Pressable>
      ) : (
        <Animated.View entering={FadeIn.duration(500)}>
          <View style={{ alignItems: "center", padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: c.brand.teal, marginBottom: 8 }}>
              You're here. You're grounded.
            </Text>
            <Pressable
              onPress={onComplete}
              style={{
                marginTop: 16,
                backgroundColor: c.brand.purple,
                borderRadius: 14,
                paddingHorizontal: 32,
                paddingVertical: 14,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "600", color: "white" }}>Continue</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

// --- Chat Message Bubble ---

function AiBubble({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(400)}
      style={{
        alignSelf: "flex-start",
        backgroundColor: c.bubble.ai,
        borderRadius: 16,
        borderTopLeftRadius: 4,
        padding: 14,
        maxWidth: "85%",
        marginBottom: 10,
      }}
    >
      <Text style={{ fontSize: 15, color: c.text.primary, lineHeight: 22 }}>{text}</Text>
    </Animated.View>
  );
}

// --- Main Onboarding Screen ---

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, setOnboarded, fetchProfile } = useAuthStore();
  const ob = useOnboardingStore();

  const [step, setStep] = useState(ob.currentStep);
  const [quizIndex, setQuizIndex] = useState(0);
  const [domains, setDomains] = useState<DomainRating[]>(INITIAL_DOMAINS);
  const [companionName, setCompanionName] = useState(ob.companionName);
  const [nameReaction, setNameReaction] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showBreathButton, setShowBreathButton] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);
  const archetypeShareRef = useRef<ViewShot>(null);

  // Step 1: delay the CTA
  useEffect(() => {
    if (step === 1) {
      const timer = setTimeout(() => setShowBreathButton(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const goTo = useCallback(
    (s: number) => {
      setStep(s);
      ob.setStep(s);
      track("onboarding_step", { step: s });
    },
    [ob],
  );

  const next = useCallback(() => goTo(step + 1), [step, goTo]);
  const prev = useCallback(() => {
    if (step > 1) goTo(step - 1);
  }, [step, goTo]);

  // Step 10: auto-advance when returning from auth with an active session
  useEffect(() => {
    if (step === 10 && user && !ob.guestMode) {
      goTo(11);
    }
  }, [step, user, ob.guestMode, goTo]);

  // Step 7: fetch archetype from backend
  const fetchArchetype = useCallback(async () => {
    setIsLoading(true);
    const domainRatings: Record<string, number> = {};
    for (const d of domains) domainRatings[d.domain] = d.value;

    try {
      const { data, error } = await supabase.functions.invoke("generate-life-blueprint", {
        body: { answers: ob.quizAnswers, domain_ratings: domainRatings, onboarding_reason: ob.reason },
      });
      if (error) throw error;
      if (!data?.archetype) throw new Error("Invalid response");

      ob.setArchetypeResult({
        archetype: data.archetype,
        archetypeEmoji: data.archetype_emoji,
        compositeScore: data.composite_score,
        dimensions: data.dimensions,
        superpower: data.superpower,
        blindSpot: data.blind_spot,
      });

      await hapticMilestone();
      track("onboarding_archetype", { archetype: data.archetype, score: data.composite_score });
    } catch (e) {
      console.error("Archetype generation failed:", e);
      Alert.alert("Oops", "Couldn't generate your profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [ob, domains]);

  // Step 9: fetch commitment letter
  const fetchCommitmentLetter = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-commitment-letter", {
        body: {
          reason: ob.reason,
          archetype: ob.archetype,
          archetype_emoji: ob.archetypeEmoji,
          companion_name: companionName,
          display_name: user?.user_metadata?.full_name || "friend",
        },
      });
      if (error) throw error;
      if (data?.letter) ob.setCommitmentLetter(data.letter);
    } catch (e) {
      ob.setCommitmentLetter(
        `Dear friend, You showed up today because something inside you said "it's time." That matters more than you know. ${companionName} and I will be right here as you figure out the rest.`,
      );
    }
  }, [ob, companionName, user]);

  // Step 9: trigger commitment letter fetch when entering the step
  const commitmentFetched = useRef(false);
  useEffect(() => {
    if (step === 9 && !commitmentFetched.current && !ob.commitmentLetter) {
      commitmentFetched.current = true;
      fetchCommitmentLetter();
    }
  }, [step, ob.commitmentLetter, fetchCommitmentLetter]);

  // Final step: save everything and transition
  const finishOnboarding = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    await hapticSuccess();

    try {
      if (user) {
        const { data: existing } = await supabase
          .from("users")
          .select("preferences")
          .eq("id", user.id)
          .single();

        const mergedPrefs = {
          ...(existing?.preferences ?? {}),
          notification_preference: ob.notificationPreference,
        };

        await supabase.from("users").upsert(
          {
            id: user.id,
            email: user.email,
            companion_name: companionName,
            onboarding_reason: ob.reason,
            onboarding_archetype: ob.archetype,
            onboarding_dimensions: ob.dimensions,
            onboarding_superpower: ob.superpower,
            onboarding_blind_spot: ob.blindSpot,
            onboarding_commitment_text: ob.commitmentLetter,
            guest_mode: ob.guestMode,
            preferences: mergedPrefs,
            onboarding_completed_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );

        if (ob.notificationPreference !== "none") {
          registerPushToken().catch(() => {});
        }
        await fetchProfile();
      }

      const trackData = { reason: ob.reason, archetype: ob.archetype, companion_name: companionName };
      setOnboarded(true);
      ob.reset();
      track("onboarding_completed", trackData);
      router.replace("/(tabs)/chat");
    } catch (err: any) {
      console.error("[Onboarding] finish failed:", err?.message ?? err);
      Alert.alert("Something went wrong", "Couldn't save your preferences. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, user, companionName, ob, fetchProfile, setOnboarded, router]);

  const handleShareArchetype = useCallback(async () => {
    if (!archetypeShareRef.current?.capture) return;
    try {
      const uri = await archetypeShareRef.current.capture();
      await hapticSuccess();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "image/png", UTI: "public.png" });
      }
    } catch (e) {
      console.warn("Share failed:", e);
    }
  }, []);

  // Progress bar
  const progressPct = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg.primary }}>
      {/* Progress bar — hidden on steps 1-2 and 12 */}
      {step > 2 && step < 12 && (
        <Animated.View entering={FadeIn.duration(300)} style={{ paddingHorizontal: 24, paddingTop: 8 }}>
          <View style={{ height: 3, borderRadius: 2, backgroundColor: c.bg.surface }}>
            <Animated.View
              style={{
                height: 3,
                borderRadius: 2,
                backgroundColor: c.brand.purple,
                width: `${progressPct}%`,
              }}
            />
          </View>
        </Animated.View>
      )}

      {/* Back button */}
      {step > 1 && step < 12 && (
        <Pressable
          onPress={async () => {
            await hapticLight();
            if (step === 5 && quizIndex > 0) {
              setQuizIndex((q) => q - 1);
            } else {
              prev();
            }
          }}
          style={{ paddingHorizontal: 24, paddingTop: 8 }}
        >
          <Text style={{ fontSize: 14, color: c.text.tertiary }}>← Back</Text>
        </Pressable>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingVertical: 16 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={{ paddingHorizontal: 24 }}
          >
            {/* ═══════════════════════════════════════════
                STEP 1: Breathing Moment
            ═══════════════════════════════════════════ */}
            {step === 1 && (
              <Animated.View entering={FadeIn.duration(1000)} style={{ alignItems: "center" }}>
                <BreathingCircle />
                <Animated.Text
                  entering={FadeInUp.delay(500).duration(600)}
                  style={{
                    fontSize: 28,
                    fontWeight: "700",
                    color: c.text.primary,
                    textAlign: "center",
                    lineHeight: 36,
                  }}
                >
                  Take a breath with me.
                </Animated.Text>

                {showBreathButton && (
                  <Animated.View entering={FadeIn.duration(800)} style={{ width: "100%", marginTop: 48 }}>
                    <Pressable
                      onPress={async () => {
                        await hapticLight();
                        next();
                      }}
                      style={{
                        backgroundColor: c.brand.purple,
                        borderRadius: 16,
                        paddingVertical: 18,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontSize: 17, fontWeight: "600", color: "white" }}>I'm ready</Text>
                    </Pressable>
                  </Animated.View>
                )}
              </Animated.View>
            )}

            {/* ═══════════════════════════════════════════
                STEP 2: Social Proof + Trust
            ═══════════════════════════════════════════ */}
            {step === 2 && (
              <Animated.View entering={FadeIn.duration(500)} style={{ alignItems: "center" }}>
                <Animated.Text
                  entering={FadeInDown.duration(400)}
                  style={{
                    fontSize: 26,
                    fontWeight: "700",
                    color: c.text.primary,
                    textAlign: "center",
                    lineHeight: 34,
                    marginBottom: 32,
                  }}
                >
                  You're not alone in this.
                </Animated.Text>

                {[
                  { icon: "shield-checkmark" as const, text: "Built on techniques used by real therapists" },
                  { icon: "lock-closed" as const, text: "Your conversations are always private & encrypted" },
                  { icon: "flask" as const, text: "Grounded in CBT, DBT, and ACT research" },
                ].map((item, i) => (
                  <Animated.View
                    key={item.text}
                    entering={FadeInDown.delay(200 + i * 150).duration(400)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: c.bg.surface,
                      borderRadius: 14,
                      padding: 16,
                      marginBottom: 12,
                      width: "100%",
                    }}
                  >
                    <Ionicons name={item.icon} size={22} color={c.brand.teal} style={{ marginRight: 14 }} />
                    <Text style={{ flex: 1, fontSize: 15, color: c.text.primary, lineHeight: 21 }}>
                      {item.text}
                    </Text>
                  </Animated.View>
                ))}

                <Animated.View entering={FadeInDown.delay(700).duration(400)} style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 13, color: c.text.tertiary, textAlign: "center", fontStyle: "italic", lineHeight: 20 }}>
                    "The first app that actually remembered what I said last week."
                  </Text>
                </Animated.View>

                <Animated.View entering={FadeIn.delay(1000).duration(500)} style={{ width: "100%", marginTop: 36 }}>
                  <Pressable
                    onPress={async () => { await hapticLight(); next(); }}
                    style={{
                      backgroundColor: c.brand.purple,
                      borderRadius: 16,
                      paddingVertical: 18,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 17, fontWeight: "600", color: "white" }}>Continue</Text>
                  </Pressable>
                </Animated.View>
              </Animated.View>
            )}

            {/* ═══════════════════════════════════════════
                STEP 3: Emotional Hook
            ═══════════════════════════════════════════ */}
            {step === 3 && (
              <Animated.View entering={SlideInRight.duration(300)} exiting={SlideOutLeft.duration(200)}>
                <Text
                  style={{ fontSize: 26, fontWeight: "700", color: c.text.primary, marginBottom: 8, lineHeight: 34 }}
                >
                  What brought you here today?
                </Text>
                <Text style={{ fontSize: 15, color: c.text.secondary, marginBottom: 28 }}>
                  There's no wrong answer.
                </Text>
                {REASONS.map((r) => (
                  <Pressable
                    key={r.key}
                    onPress={async () => {
                      ob.setReason(r.key);
                      await hapticLight();
                      next();
                    }}
                    style={{
                      marginBottom: 12,
                      borderRadius: 16,
                      padding: 18,
                      backgroundColor: ob.reason === r.key ? `${c.brand.purple}15` : c.bg.surface,
                      borderWidth: 1.5,
                      borderColor: ob.reason === r.key ? `${c.brand.purple}50` : c.bg.border,
                    }}
                  >
                    <Text style={{ fontSize: 28, marginBottom: 6 }}>{r.emoji}</Text>
                    <Text style={{ fontSize: 16, fontWeight: "600", color: c.text.primary }}>{r.label}</Text>
                    <Text style={{ fontSize: 13, color: c.text.secondary, marginTop: 4 }}>{r.subtitle}</Text>
                  </Pressable>
                ))}
              </Animated.View>
            )}

            {/* ═══════════════════════════════════════════
                STEP 4: AI Value Delivery
            ═══════════════════════════════════════════ */}
            {step === 4 && (
              <Animated.View entering={FadeIn.duration(400)}>
                {VALUE_RESPONSES[ob.reason]?.messages.map((msg, i) => (
                  <AiBubble key={i} text={msg} delay={i * 800} />
                ))}

                {ob.reason === "overwhelmed" ? (
                  <Animated.View entering={FadeIn.delay(2400).duration(500)}>
                    <GroundingExercise
                      onComplete={async () => {
                        ob.setValueDelivered(true);
                        await hapticSuccess();
                        next();
                      }}
                    />
                  </Animated.View>
                ) : (
                  <Animated.View entering={FadeIn.delay(2400).duration(500)} style={{ marginTop: 24 }}>
                    <Pressable
                      onPress={async () => {
                        ob.setValueDelivered(true);
                        await hapticLight();
                        next();
                      }}
                      style={{
                        backgroundColor: c.brand.purple,
                        borderRadius: 16,
                        paddingVertical: 16,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontSize: 16, fontWeight: "600", color: "white" }}>Tell me more about myself</Text>
                    </Pressable>
                  </Animated.View>
                )}
              </Animated.View>
            )}

            {/* ═══════════════════════════════════════════
                STEP 5: Life Blueprint Quiz (7 questions)
            ═══════════════════════════════════════════ */}
            {step === 5 && (
              <Animated.View entering={SlideInRight.duration(300)} exiting={SlideOutLeft.duration(200)}>
                {quizIndex === 0 && (
                  <Animated.Text
                    entering={FadeInDown.duration(300)}
                    style={{
                      fontSize: 14,
                      color: c.text.secondary,
                      marginBottom: 20,
                      lineHeight: 20,
                    }}
                  >
                    7 quick questions — no right answers.
                  </Animated.Text>
                )}
                <QuizCard
                  question={QUESTIONS[quizIndex].question}
                  subtitle={QUESTIONS[quizIndex].subtitle}
                  options={QUESTIONS[quizIndex].options}
                  selectedValue={ob.quizAnswers[QUESTIONS[quizIndex].id] ?? null}
                  onSelect={(value) => {
                    ob.setQuizAnswer(QUESTIONS[quizIndex].id, value);
                    if (quizIndex < QUESTIONS.length - 1) {
                      setTimeout(() => setQuizIndex((q) => q + 1), 300);
                    } else {
                      setTimeout(() => next(), 300);
                    }
                  }}
                />
                <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 20, gap: 6 }}>
                  {QUESTIONS.map((_, i) => (
                    <View
                      key={i}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: i <= quizIndex ? c.brand.purple : `${c.text.tertiary}30`,
                      }}
                    />
                  ))}
                </View>
              </Animated.View>
            )}

            {/* ═══════════════════════════════════════════
                STEP 6: Domain Quick-Rate
            ═══════════════════════════════════════════ */}
            {step === 6 && (
              <Animated.View entering={SlideInRight.duration(300)}>
                <DomainQuickRate
                  domains={domains}
                  onUpdate={(domain, value) => {
                    setDomains((prev) => prev.map((d) => (d.domain === domain ? { ...d, value } : d)));
                    ob.setDomainRating(domain, value);
                  }}
                />
                <Pressable
                  onPress={async () => {
                    await hapticMedium();
                    next();
                    fetchArchetype();
                  }}
                  style={{
                    marginTop: 24,
                    backgroundColor: c.brand.purple,
                    borderRadius: 16,
                    paddingVertical: 16,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: "600", color: "white" }}>Reveal my profile</Text>
                </Pressable>
              </Animated.View>
            )}

            {/* ═══════════════════════════════════════════
                STEP 7: Archetype Reveal
            ═══════════════════════════════════════════ */}
            {step === 7 && (
              <Animated.View entering={FadeIn.duration(600)} style={{ alignItems: "center", width: "100%" }}>
                {isLoading ? (
                  <View style={{ alignItems: "center", paddingVertical: 60 }}>
                    <ActivityIndicator size="large" color={c.brand.purple} />
                    <Text style={{ fontSize: 15, color: c.text.secondary, marginTop: 16 }}>
                      Building your profile...
                    </Text>
                  </View>
                ) : ob.archetype ? (
                  <>
                    <ViewShot ref={archetypeShareRef} options={{ format: "png", quality: 1.0, result: "tmpfile" }}>
                      <View style={{ width: SCREEN_WIDTH - 48, borderRadius: 24, overflow: "hidden" }}>
                        <LinearGradient
                          colors={["#1A1040", "#0C1120"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 0, y: 1 }}
                          style={{ padding: 24, alignItems: "center" }}
                        >
                          {/* Archetype identity */}
                          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={{ alignItems: "center" }}>
                            <Text style={{ fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.35)", letterSpacing: 3, marginBottom: 12 }}>
                              YOUR ARCHETYPE
                            </Text>
                            <View style={{
                              width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center",
                              backgroundColor: "rgba(124,58,237,0.15)", borderWidth: 1.5, borderColor: "rgba(124,58,237,0.3)",
                            }}>
                              <Text style={{ fontSize: 36 }}>{ob.archetypeEmoji}</Text>
                            </View>
                            <Text style={{ fontSize: 22, fontWeight: "900", color: "white", textAlign: "center", marginTop: 10, letterSpacing: -0.3 }}>
                              {ob.archetype}
                            </Text>
                            <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 4, marginBottom: 18 }}>
                              <Text style={{ fontSize: 32, fontWeight: "900", color: "#7C3AED" }}>{ob.compositeScore}</Text>
                              <Text style={{ fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.3)", marginLeft: 3 }}>/100</Text>
                            </View>
                          </Animated.View>

                          {/* Dimension bars */}
                          <Animated.View entering={FadeInDown.delay(300).duration(500)} style={{
                            width: "100%", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 14,
                            borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", marginBottom: 14,
                          }}>
                            {Object.entries(ATTR_META).map(([key, meta], i) => {
                              const val = ob.dimensions[key as keyof typeof ob.dimensions] ?? 50;
                              return (
                                <View key={key} style={{ marginBottom: i < 5 ? 10 : 0 }}>
                                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                                    <Text style={{ fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.5)" }}>{meta.label}</Text>
                                    <Text style={{ fontSize: 11, fontWeight: "800", color: meta.color }}>{val}</Text>
                                  </View>
                                  <View style={{ height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.08)" }}>
                                    <Animated.View
                                      entering={FadeIn.delay(400 + i * 60).duration(400)}
                                      style={{ height: 5, borderRadius: 3, backgroundColor: meta.color, width: `${val}%` }}
                                    />
                                  </View>
                                </View>
                              );
                            })}
                          </Animated.View>

                          {/* Superpower & Blind Spot */}
                          <Animated.View entering={FadeInDown.delay(500).duration(500)} style={{ width: "100%", gap: 8 }}>
                            <View style={{
                              backgroundColor: "rgba(45,212,191,0.08)", borderRadius: 14, padding: 14,
                              borderWidth: 1, borderColor: "rgba(45,212,191,0.12)",
                            }}>
                              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                                <Text style={{ fontSize: 13, marginRight: 6 }}>⚡</Text>
                                <Text style={{ fontSize: 11, fontWeight: "700", color: "#2DD4BF", letterSpacing: 0.5 }}>SUPERPOWER</Text>
                              </View>
                              <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 19 }}>{ob.superpower}</Text>
                            </View>

                            <View style={{
                              backgroundColor: "rgba(167,139,250,0.08)", borderRadius: 14, padding: 14,
                              borderWidth: 1, borderColor: "rgba(167,139,250,0.12)",
                            }}>
                              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                                <Text style={{ fontSize: 13, marginRight: 6 }}>🔮</Text>
                                <Text style={{ fontSize: 11, fontWeight: "700", color: "#A78BFA", letterSpacing: 0.5 }}>BLIND SPOT</Text>
                              </View>
                              <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 19 }}>{ob.blindSpot}</Text>
                            </View>
                          </Animated.View>

                          <ShareFooter variant="dark" />
                        </LinearGradient>
                      </View>
                    </ViewShot>

                    {/* Action buttons */}
                    <View style={{ flexDirection: "row", gap: 12, marginTop: 16, width: "100%" }}>
                      <Pressable
                        onPress={handleShareArchetype}
                        style={{
                          flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
                          backgroundColor: c.bg.surface, borderRadius: 16, paddingVertical: 14,
                          borderWidth: 1, borderColor: c.bg.border,
                        }}
                      >
                        <Ionicons name="share-social" size={18} color={c.text.primary} style={{ marginRight: 8 }} />
                        <Text style={{ fontSize: 15, fontWeight: "600", color: c.text.primary }}>Share</Text>
                      </Pressable>
                      <Pressable
                        onPress={async () => { await hapticLight(); next(); }}
                        style={{ flex: 2, borderRadius: 16, overflow: "hidden" }}
                      >
                        <LinearGradient
                          colors={[c.gradient.start, c.gradient.end]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={{ paddingVertical: 14, alignItems: "center", borderRadius: 16 }}
                        >
                          <Text style={{ fontSize: 15, fontWeight: "700", color: "white" }}>Continue</Text>
                        </LinearGradient>
                      </Pressable>
                    </View>
                  </>
                ) : null}
              </Animated.View>
            )}

            {/* ═══════════════════════════════════════════
                STEP 8: Companion Birth + Naming
            ═══════════════════════════════════════════ */}
            {step === 8 && (
              <Animated.View entering={FadeIn.duration(500)} style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 15, color: c.text.secondary, marginBottom: 16 }}>
                  Your companion is taking shape...
                </Text>

                {/* Companion "birth" glow */}
                <Animated.View
                  entering={FadeIn.delay(300).duration(1000)}
                  style={{ marginBottom: 24 }}
                >
                  <LinearGradient
                    colors={[`${c.brand.purple}40`, `${c.brand.teal}30`]}
                    style={{
                      width: 140,
                      height: 140,
                      borderRadius: 70,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 100,
                        height: 100,
                        borderRadius: 50,
                        backgroundColor: `${c.brand.purple}20`,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 40 }}>✨</Text>
                    </View>
                  </LinearGradient>
                </Animated.View>

                {nameReaction ? (
                  <Animated.View entering={FadeInDown.duration(300)} style={{ backgroundColor: c.bg.surface, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 16 }}>
                    <Text style={{ fontSize: 15, color: c.brand.purpleLight, fontWeight: "500", textAlign: "center" }}>
                      {nameReaction}
                    </Text>
                  </Animated.View>
                ) : null}

                <Animated.Text
                  entering={FadeInDown.delay(800).duration(500)}
                  style={{ fontSize: 22, fontWeight: "700", color: c.text.primary, textAlign: "center", marginBottom: 8 }}
                >
                  What would you like to call me?
                </Animated.Text>

                <Animated.View entering={FadeInDown.delay(1000).duration(400)} style={{ width: "100%" }}>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 16 }}>
                    {SUGGESTED_NAMES.map((name) => (
                      <Pressable
                        key={name}
                        onPress={async () => {
                          setCompanionName(name);
                          ob.setCompanionName(name);
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
                      marginTop: 12,
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
                      ob.setCompanionName(t);
                      if (t.trim().length > 1 && !SUGGESTED_NAMES.includes(t)) {
                        setNameReaction(`${t}... that's perfect.`);
                      }
                    }}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                    blurOnSubmit
                  />
                  <Pressable
                    onPress={async () => {
                      Keyboard.dismiss();
                      if (!companionName.trim()) {
                        setCompanionName("Lumis");
                        ob.setCompanionName("Lumis");
                      }
                      await hapticMedium();
                      next();
                    }}
                    style={{
                      marginTop: 28,
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
              </Animated.View>
            )}

            {/* ═══════════════════════════════════════════
                STEP 9: Commitment Ritual
            ═══════════════════════════════════════════ */}
            {step === 9 && (
              <Animated.View entering={FadeIn.duration(500)} style={{ alignItems: "center" }}>
                {!ob.commitmentLetter ? (
                  <View style={{ paddingVertical: 40, alignItems: "center" }}>
                    <ActivityIndicator size="small" color={c.brand.purple} />
                    <Text style={{ fontSize: 14, color: c.text.secondary, marginTop: 12 }}>
                      Writing you a letter...
                    </Text>
                  </View>
                ) : (
                  <>
                    <Animated.View
                      entering={FadeInDown.duration(600)}
                      style={{
                        backgroundColor: c.bg.surface,
                        borderRadius: 20,
                        padding: 28,
                        width: "100%",
                        borderWidth: 1,
                        borderColor: `${c.brand.purple}30`,
                      }}
                    >
                      <Text style={{ fontSize: 16, color: c.text.primary, lineHeight: 26 }}>
                        {ob.commitmentLetter}
                      </Text>
                      <Text style={{ fontSize: 14, color: c.text.tertiary, marginTop: 16, fontStyle: "italic" }}>
                        — Your Future Self
                      </Text>
                    </Animated.View>

                    <Animated.View entering={FadeIn.delay(800).duration(500)} style={{ width: "100%", marginTop: 32 }}>
                      <Pressable
                        onPress={async () => {
                          await hapticMilestone();
                          next();
                        }}
                        style={{ overflow: "hidden", borderRadius: 16 }}
                      >
                        <LinearGradient
                          colors={[c.gradient.start, c.gradient.end]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={{ paddingVertical: 18, alignItems: "center", borderRadius: 16 }}
                        >
                          <Text style={{ fontSize: 17, fontWeight: "700", color: "white" }}>I'm in ✍️</Text>
                        </LinearGradient>
                      </Pressable>
                    </Animated.View>
                  </>
                )}
              </Animated.View>
            )}

            {/* ═══════════════════════════════════════════
                STEP 10: Account Creation
            ═══════════════════════════════════════════ */}
            {step === 10 && (
              <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 24, fontWeight: "700", color: c.text.primary, textAlign: "center", marginBottom: 8 }}>
                  Save your journey
                </Text>
                <Text style={{ fontSize: 15, color: c.text.secondary, textAlign: "center", marginBottom: 32, lineHeight: 22 }}>
                  Create an account to keep your archetype, your companion, and everything ahead.
                </Text>

                <Pressable
                  onPress={() => router.push("/(auth)/sign-up")}
                  style={{
                    width: "100%",
                    backgroundColor: c.brand.purple,
                    borderRadius: 16,
                    paddingVertical: 16,
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: "600", color: "white" }}>Create Account</Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push("/(auth)/sign-in")}
                  style={{
                    width: "100%",
                    backgroundColor: c.bg.surface,
                    borderRadius: 16,
                    paddingVertical: 16,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: c.bg.border,
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: "600", color: c.text.primary }}>I already have an account</Text>
                </Pressable>

                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                  <Ionicons name="lock-closed" size={14} color={c.text.tertiary} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 13, color: c.text.tertiary }}>Your conversations are encrypted and never shared</Text>
                </View>

                <Pressable
                  onPress={async () => {
                    ob.setGuestMode(true);
                    await hapticLight();
                    next();
                  }}
                  style={{ paddingVertical: 20 }}
                >
                  <Text style={{ fontSize: 14, color: c.text.tertiary }}>Continue as guest</Text>
                </Pressable>
              </Animated.View>
            )}

            {/* ═══════════════════════════════════════════
                STEP 11: Notification Permission
            ═══════════════════════════════════════════ */}
            {step === 11 && (
              <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: "center" }}>
                <LinearGradient
                  colors={[`${c.brand.purple}15`, `${c.brand.teal}08`]}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 24,
                  }}
                >
                  <Text style={{ fontSize: 36 }}>🔔</Text>
                </LinearGradient>

                <Text style={{ fontSize: 22, fontWeight: "700", color: c.text.primary, textAlign: "center", marginBottom: 8 }}>
                  {companionName} would like to check in
                </Text>
                <Text style={{ fontSize: 15, color: c.text.secondary, textAlign: "center", marginBottom: 32, lineHeight: 22 }}>
                  A gentle reminder — never guilt.{"\n"}You can change this anytime.
                </Text>

                <Pressable
                  onPress={() => setHasConsented((v) => !v)}
                  style={{ flexDirection: "row", alignItems: "center", marginBottom: 24, paddingVertical: 4 }}
                >
                  <Ionicons
                    name={hasConsented ? "checkbox" : "square-outline"}
                    size={20}
                    color={hasConsented ? c.brand.purple : c.text.tertiary}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={{ flex: 1, fontSize: 13, color: c.text.secondary, lineHeight: 18 }}>
                    I agree to the{" "}
                    <Text style={{ color: c.brand.purple, fontWeight: "600" }} onPress={() => router.push("/privacy" as any)}>
                      Privacy Policy
                    </Text>{" "}
                    and{" "}
                    <Text style={{ color: c.brand.purple, fontWeight: "600" }} onPress={() => router.push("/terms" as any)}>
                      Terms of Service
                    </Text>
                  </Text>
                </Pressable>

                {(["morning", "evening", "both", "none"] as const).map((pref) => {
                  const labels: Record<string, { icon: string; label: string }> = {
                    morning: { icon: "☀️", label: "Morning check-ins" },
                    evening: { icon: "🌙", label: "Evening reflections" },
                    both: { icon: "✨", label: "Both morning & evening" },
                    none: { icon: "🔕", label: "Not now" },
                  };
                  const { icon, label } = labels[pref];
                  const isSelected = ob.notificationPreference === pref;

                  return (
                    <Pressable
                      key={pref}
                      onPress={async () => {
                        ob.setNotificationPreference(pref);
                        await hapticLight();
                      }}
                      style={{
                        width: "100%",
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: isSelected ? `${c.brand.purple}15` : c.bg.surface,
                        borderRadius: 14,
                        padding: 16,
                        marginBottom: 10,
                        borderWidth: 1.5,
                        borderColor: isSelected ? `${c.brand.purple}50` : c.bg.border,
                      }}
                    >
                      <Text style={{ fontSize: 22, marginRight: 12 }}>{icon}</Text>
                      <Text style={{ flex: 1, fontSize: 15, fontWeight: "500", color: c.text.primary }}>{label}</Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={22} color={c.brand.purple} />
                      )}
                    </Pressable>
                  );
                })}

                <Pressable
                  onPress={async () => {
                    if (!hasConsented) {
                      Alert.alert("One more thing", "Please accept the Privacy Policy and Terms to continue.");
                      return;
                    }
                    await hapticMedium();
                    next();
                  }}
                  disabled={!hasConsented}
                  style={{
                    marginTop: 20,
                    width: "100%",
                    backgroundColor: hasConsented ? c.brand.purple : `${c.brand.purple}40`,
                    borderRadius: 16,
                    paddingVertical: 16,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: "600", color: "white" }}>Let's go!</Text>
                </Pressable>
              </Animated.View>
            )}

            {/* ═══════════════════════════════════════════
                STEP 12: Seamless Transition to First Chat
            ═══════════════════════════════════════════ */}
            {step === 12 && (
              <Animated.View entering={FadeIn.duration(600)} style={{ alignItems: "center" }}>
                <LinearGradient
                  colors={[`${c.brand.purple}30`, `${c.brand.teal}20`]}
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 24,
                  }}
                >
                  <Text style={{ fontSize: 48 }}>✨</Text>
                </LinearGradient>

                <Animated.Text
                  entering={FadeInDown.delay(300).duration(500)}
                  style={{ fontSize: 24, fontWeight: "700", color: c.text.primary, textAlign: "center", marginBottom: 12 }}
                >
                  Ready when you are, {ob.archetype || "explorer"}.
                </Animated.Text>

                <Animated.Text
                  entering={FadeInDown.delay(600).duration(500)}
                  style={{ fontSize: 15, color: c.text.secondary, textAlign: "center", lineHeight: 22, marginBottom: 40 }}
                >
                  I already know a few things about you.{"\n"}Let's pick up where we left off.
                </Animated.Text>

                <Animated.View entering={FadeIn.delay(1000).duration(500)} style={{ width: "100%" }}>
                  <Pressable
                    onPress={finishOnboarding}
                    disabled={isSaving}
                    style={{ overflow: "hidden", borderRadius: 16 }}
                  >
                    <LinearGradient
                      colors={[c.gradient.start, c.gradient.end]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ paddingVertical: 18, alignItems: "center", borderRadius: 16 }}
                    >
                      <Text style={{ fontSize: 17, fontWeight: "700", color: "white" }}>
                        {isSaving ? "Setting up..." : `Start talking to ${companionName}`}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                </Animated.View>
              </Animated.View>
            )}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
