import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface OnboardingDimensions {
  awareness: number;
  resilience: number;
  discipline: number;
  growth: number;
  connection: number;
  vitality: number;
}

export interface OnboardingState {
  currentStep: number;

  // Step 3
  reason: string;

  // Step 4 — value delivery completed
  valueDelivered: boolean;

  // Step 5 — Life Blueprint quiz answers (Q1-Q7, each 1-4)
  quizAnswers: Record<number, number>;

  // Step 6 — Domain quick-rate (1=Struggling, 2=Okay, 3=Thriving)
  domainRatings: Record<string, number>;

  // Step 7 — Archetype reveal (from backend)
  archetype: string;
  archetypeEmoji: string;
  compositeScore: number;
  dimensions: OnboardingDimensions;
  superpower: string;
  blindSpot: string;

  // Step 8
  companionName: string;

  // Step 9
  commitmentLetter: string;

  // Step 10
  guestMode: boolean;

  // Step 11
  notificationPreference: "morning" | "evening" | "both" | "none";

  // Actions
  setStep: (step: number) => void;
  setReason: (reason: string) => void;
  setValueDelivered: (v: boolean) => void;
  setQuizAnswer: (question: number, answer: number) => void;
  setDomainRating: (domain: string, rating: number) => void;
  setArchetypeResult: (result: {
    archetype: string;
    archetypeEmoji: string;
    compositeScore: number;
    dimensions: OnboardingDimensions;
    superpower: string;
    blindSpot: string;
  }) => void;
  setCompanionName: (name: string) => void;
  setCommitmentLetter: (letter: string) => void;
  setGuestMode: (v: boolean) => void;
  setNotificationPreference: (pref: "morning" | "evening" | "both" | "none") => void;
  reset: () => void;
}

const initialState = {
  currentStep: 1,
  reason: "",
  valueDelivered: false,
  quizAnswers: {} as Record<number, number>,
  domainRatings: {} as Record<string, number>,
  archetype: "",
  archetypeEmoji: "",
  compositeScore: 0,
  dimensions: { awareness: 50, resilience: 50, discipline: 50, growth: 50, connection: 50, vitality: 50 },
  superpower: "",
  blindSpot: "",
  companionName: "Lumis",
  commitmentLetter: "",
  guestMode: false,
  notificationPreference: "morning" as const,
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initialState,

      setStep: (step) => set({ currentStep: step }),
      setReason: (reason) => set({ reason }),
      setValueDelivered: (v) => set({ valueDelivered: v }),
      setQuizAnswer: (question, answer) =>
        set((s) => ({ quizAnswers: { ...s.quizAnswers, [question]: answer } })),
      setDomainRating: (domain, rating) =>
        set((s) => ({ domainRatings: { ...s.domainRatings, [domain]: rating } })),
      setArchetypeResult: (result) =>
        set({
          archetype: result.archetype,
          archetypeEmoji: result.archetypeEmoji,
          compositeScore: result.compositeScore,
          dimensions: result.dimensions,
          superpower: result.superpower,
          blindSpot: result.blindSpot,
        }),
      setCompanionName: (name) => set({ companionName: name }),
      setCommitmentLetter: (letter) => set({ commitmentLetter: letter }),
      setGuestMode: (v) => set({ guestMode: v }),
      setNotificationPreference: (pref) => set({ notificationPreference: pref }),
      reset: () => set(initialState),
    }),
    {
      name: "lumis-onboarding",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
