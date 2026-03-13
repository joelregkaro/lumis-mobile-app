import { useState, useCallback, useEffect } from "react";
import {
  View, Text, Pressable, ScrollView,
  ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Animated, {
  FadeIn, FadeInDown, FadeInUp,
  SlideInRight, SlideOutLeft,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import QuizCard from "@/components/blueprint/QuizCard";
import type { QuizOption } from "@/components/blueprint/QuizCard";
import DomainQuickRate from "@/components/blueprint/DomainQuickRate";
import type { DomainRating } from "@/components/blueprint/DomainQuickRate";
import BlueprintResultCard from "@/components/blueprint/BlueprintResultCard";
import type { BlueprintResult } from "@/components/blueprint/BlueprintResultCard";
import { supabase } from "@/lib/supabase";
import { hapticLight, hapticMedium, hapticSuccess } from "@/lib/haptics";
import { useAuthStore } from "@/store/auth";
import { track, screen } from "@/lib/analytics";
import { colors } from "@/constants/theme";

const c = colors.dark;

export const BLUEPRINT_STORAGE_KEY = "lumis_blueprint_data";

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
      { emoji: "🏔️", label: "Adventure outdoors", subtitle: "Hiking, sports, exploring", value: 1 },
      { emoji: "🍕", label: "People and good food", subtitle: "Friends, family, long meals", value: 2 },
      { emoji: "🛋️", label: "Solo recharge", subtitle: "Books, shows, naps — pure bliss", value: 3 },
      { emoji: "🎨", label: "Making something", subtitle: "Creative project, cooking, building", value: 4 },
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
      { emoji: "🧘", label: "I control it", subtitle: "Screen time? Under control.", value: 1 },
      { emoji: "🤷", label: "It's fine... mostly", subtitle: "Some mindless scrolling.", value: 2 },
      { emoji: "📱", label: "It controls me, honestly", subtitle: "I reach for it constantly.", value: 3 },
      { emoji: "🔧", label: "Working on it", subtitle: "Trying to set boundaries.", value: 4 },
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

type Phase = "quiz" | "loading" | "result";

export default function LifeBlueprintScreen() {
  const navigation = useNavigation();
  const { session } = useAuthStore();
  useEffect(() => { screen("life_blueprint"); }, []);

  const [phase, setPhase] = useState<Phase>("quiz");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [domains, setDomains] = useState<DomainRating[]>(INITIAL_DOMAINS);
  const [result, setResult] = useState<BlueprintResult | null>(null);

  const totalSteps = QUESTIONS.length + 1;
  const progress = (currentQ + 1) / totalSteps;

  const handleAnswer = useCallback(async (questionId: number, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    await hapticLight();
    setTimeout(() => setCurrentQ((prev) => prev + 1), 300);
  }, []);

  const handleDomainUpdate = useCallback((domain: string, value: number) => {
    setDomains((prev) => prev.map((d) => (d.domain === domain ? { ...d, value } : d)));
  }, []);

  const handleSubmit = useCallback(async () => {
    await hapticMedium();
    setPhase("loading");

    const domainRatings: Record<string, number> = {};
    for (const d of domains) domainRatings[d.domain] = d.value;

    try {
      const blueprintData = { answers, domainRatings, takenAt: new Date().toISOString() };
      await AsyncStorage.setItem(BLUEPRINT_STORAGE_KEY, JSON.stringify(blueprintData));

      const { data, error } = await supabase.functions.invoke("generate-life-blueprint", {
        body: { answers, domain_ratings: domainRatings },
      });

      if (error) throw error;
      if (!data?.archetype) throw new Error("Invalid response");

      setResult(data as BlueprintResult);
      await hapticSuccess();
      track("blueprint_completed", { archetype: data.archetype, score: data.composite_score });
      setPhase("result");
    } catch (e) {
      console.error("Blueprint generation failed:", e);
      Alert.alert("Oops", "Couldn't generate your blueprint. Please try again.");
      setPhase("quiz");
    }
  }, [answers, domains]);


  const handleRetake = useCallback(() => {
    setPhase("quiz");
    setCurrentQ(0);
    setAnswers({});
    setDomains(INITIAL_DOMAINS);
    setResult(null);
  }, []);

  const handleStartJourney = useCallback(() => {
    if (session) {
      navigation.reset({
        index: 0,
        routes: [{ name: "Tabs" as never, params: { screen: "home" as never } }],
      });
    } else {
      navigation.navigate("Auth" as never, { screen: "sign-up" });
    }
  }, [session, navigation]);

  const goBack = useCallback(async () => {
    await hapticLight();
    if (currentQ > 0) {
      setCurrentQ((prev) => prev - 1);
    } else {
      navigation.goBack();
    }
  }, [currentQ, navigation]);

  if (phase === "loading") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg.primary, justifyContent: "center", alignItems: "center" }}>
        <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: "center" }}>
          <LinearGradient
            colors={[`${c.brand.purple}40`, `${c.brand.teal}20`]}
            style={{
              width: 120, height: 120, borderRadius: 60,
              alignItems: "center", justifyContent: "center", marginBottom: 24,
            }}
          >
            <ActivityIndicator size="large" color={c.brand.purple} />
          </LinearGradient>
          <Text style={{ fontSize: 20, fontWeight: "700", color: c.text.primary, marginBottom: 8 }}>
            Analyzing your blueprint...
          </Text>
          <Text style={{ fontSize: 14, color: c.text.secondary, textAlign: "center", lineHeight: 22 }}>
            Our AI is finding your archetype{"\n"}and uncovering your patterns.
          </Text>
        </Animated.View>
      </SafeAreaView>
    );
  }

  if (phase === "result" && result) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg.primary }}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 20, alignItems: "center" }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.Text
            entering={FadeInUp.duration(400)}
            style={{
              fontSize: 14, fontWeight: "600", color: c.text.tertiary,
              letterSpacing: 1, textTransform: "uppercase", marginBottom: 16,
            }}
          >
            Your Life Blueprint
          </Animated.Text>
          <BlueprintResultCard
            result={result}
            onStartJourney={handleStartJourney}
            onRetake={handleRetake}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const isOnDomains = currentQ >= QUESTIONS.length;
  const currentQuestion = !isOnDomains ? QUESTIONS[currentQ] : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg.primary }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <Pressable onPress={goBack} style={{ padding: 4, marginRight: 12 }}>
            <Ionicons name="chevron-back" size={24} color={c.text.tertiary} />
          </Pressable>
          <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: c.bg.surface }}>
            <View
              style={{
                height: 4, borderRadius: 2, backgroundColor: c.brand.purple,
                width: `${progress * 100}%`,
              }}
            />
          </View>
          <Text style={{ marginLeft: 12, fontSize: 13, color: c.text.tertiary, fontWeight: "600" }}>
            {currentQ + 1}/{totalSteps}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {currentQuestion && (
          <Animated.View key={`q-${currentQ}`} entering={SlideInRight.duration(250)} exiting={SlideOutLeft.duration(200)}>
            <QuizCard
              question={currentQuestion.question}
              subtitle={currentQuestion.subtitle}
              options={currentQuestion.options}
              selectedValue={answers[currentQuestion.id] ?? null}
              onSelect={(val) => handleAnswer(currentQuestion.id, val)}
            />
          </Animated.View>
        )}

        {isOnDomains && (
          <Animated.View entering={SlideInRight.duration(250)}>
            <DomainQuickRate domains={domains} onUpdate={handleDomainUpdate} />
            <Pressable
              onPress={handleSubmit}
              style={{ marginTop: 24, borderRadius: 16, overflow: "hidden" }}
            >
              <LinearGradient
                colors={[c.brand.purple, c.brand.teal]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 18, alignItems: "center", borderRadius: 16 }}
              >
                <Text style={{ fontSize: 17, fontWeight: "700", color: "white" }}>
                  Reveal My Blueprint
                </Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
