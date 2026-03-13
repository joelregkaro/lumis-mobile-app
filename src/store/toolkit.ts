import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/analytics";

export type ExerciseType =
  | "breathing"
  | "grounding"
  | "reframe"
  | "thought_record"
  | "self_compassion"
  | "gratitude"
  | "body_scan"
  | "muscle_relaxation"
  | "values"
  | "journal";

export interface ExerciseDefinition {
  type: ExerciseType;
  title: string;
  subtitle: string;
  icon: string;
  durationMinutes: number;
  category: "calm" | "clarity" | "growth";
  color: string;
}

export interface ExerciseCompletion {
  id: string;
  exerciseType: ExerciseType;
  moodBefore: number | null;
  moodAfter: number | null;
  durationSeconds: number | null;
  completedDate: string;
  context: Record<string, unknown>;
}

export interface SuggestedExercise extends ExerciseDefinition {
  reason: string;
}

interface ToolkitState {
  recentCompletions: ExerciseCompletion[];
  suggested: SuggestedExercise[];
  isLoadingSuggested: boolean;
  isLoadingHistory: boolean;

  currentType: ExerciseType | null;
  currentSteps: string[];
  currentContext: Record<string, unknown>;
  moodBefore: number | null;
  moodAfter: number | null;
  startedAt: number | null;
  isSubmitting: boolean;
  isComplete: boolean;

  fetchSuggested: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  startExercise: (type: ExerciseType, steps?: string[], context?: Record<string, unknown>) => void;
  setMoodBefore: (score: number) => void;
  setMoodAfter: (score: number) => void;
  complete: (extraContext?: Record<string, unknown>) => Promise<void>;
  reset: () => void;
}

export const EXERCISE_CATALOG: ExerciseDefinition[] = [
  {
    type: "thought_record",
    title: "Thought Record",
    subtitle: "Challenge unhelpful thoughts",
    icon: "document-text-outline",
    durationMinutes: 5,
    category: "clarity",
    color: "#7C3AED",
  },
  {
    type: "breathing",
    title: "Breathing",
    subtitle: "Calm your nervous system",
    icon: "leaf-outline",
    durationMinutes: 3,
    category: "calm",
    color: "#2DD4BF",
  },
  {
    type: "grounding",
    title: "5-4-3-2-1 Grounding",
    subtitle: "Anchor to the present",
    icon: "earth-outline",
    durationMinutes: 3,
    category: "calm",
    color: "#A78BFA",
  },
  {
    type: "reframe",
    title: "Reframe",
    subtitle: "Find a new perspective",
    icon: "swap-horizontal-outline",
    durationMinutes: 4,
    category: "clarity",
    color: "#F5C542",
  },
  {
    type: "self_compassion",
    title: "Self-Compassion",
    subtitle: "Be kind to yourself",
    icon: "heart-outline",
    durationMinutes: 4,
    category: "growth",
    color: "#E07373",
  },
  {
    type: "gratitude",
    title: "Gratitude",
    subtitle: "Notice what's good",
    icon: "sunny-outline",
    durationMinutes: 3,
    category: "growth",
    color: "#22C55E",
  },
];

export const useToolkitStore = create<ToolkitState>((set, get) => ({
  recentCompletions: [],
  suggested: [],
  isLoadingSuggested: false,
  isLoadingHistory: false,

  currentType: null,
  currentSteps: [],
  currentContext: {},
  moodBefore: null,
  moodAfter: null,
  startedAt: null,
  isSubmitting: false,
  isComplete: false,

  fetchSuggested: async () => {
    set({ isLoadingSuggested: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { set({ isLoadingSuggested: false }); return; }

      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/get-suggested-exercises?tz=${encodeURIComponent(tz)}`;
      const resp = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
        },
      });

      if (!resp.ok) { set({ isLoadingSuggested: false }); return; }
      const payload = await resp.json();
      set({ suggested: payload ?? [], isLoadingSuggested: false });
    } catch {
      set({ isLoadingSuggested: false });
    }
  },

  fetchHistory: async () => {
    set({ isLoadingHistory: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { set({ isLoadingHistory: false }); return; }

      const { data } = await supabase
        .from("exercise_completions")
        .select("id, exercise_type, mood_before, mood_after, duration_seconds, completed_date, context")
        .eq("user_id", user.id)
        .order("completed_date", { ascending: false })
        .limit(20);

      const completions: ExerciseCompletion[] = (data ?? []).map((r: any) => ({
        id: r.id,
        exerciseType: r.exercise_type,
        moodBefore: r.mood_before,
        moodAfter: r.mood_after,
        durationSeconds: r.duration_seconds,
        completedDate: r.completed_date,
        context: r.context ?? {},
      }));

      set({ recentCompletions: completions, isLoadingHistory: false });
    } catch {
      set({ isLoadingHistory: false });
    }
  },

  startExercise: (type, steps, context) => {
    set({
      currentType: type,
      currentSteps: steps ?? [],
      currentContext: context ?? {},
      moodBefore: null,
      moodAfter: null,
      startedAt: Date.now(),
      isSubmitting: false,
      isComplete: false,
    });
  },

  setMoodBefore: (score) => set({ moodBefore: score }),
  setMoodAfter: (score) => set({ moodAfter: score }),

  complete: async (extraContext) => {
    const state = get();
    if (state.isSubmitting || !state.currentType) return;
    set({ isSubmitting: true });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const durationSeconds = state.startedAt
        ? Math.round((Date.now() - state.startedAt) / 1000)
        : null;

      const ctx = { ...state.currentContext, ...extraContext };

      await supabase.from("exercise_completions").insert({
        user_id: user.id,
        exercise_type: state.currentType,
        mood_before: state.moodBefore,
        mood_after: state.moodAfter,
        duration_seconds: durationSeconds,
        completed_date: new Date().toISOString().split("T")[0],
        context: ctx,
      });

      if (state.moodBefore != null) {
        await supabase.from("mood_entries").insert({
          user_id: user.id,
          mood_score: state.moodAfter ?? state.moodBefore,
          notes: `After ${state.currentType.replace(/_/g, " ")} exercise`,
        });
      }

      track("exercise_completed", {
        type: state.currentType,
        duration_seconds: durationSeconds,
        mood_before: state.moodBefore,
        mood_after: state.moodAfter,
        mood_delta: state.moodBefore != null && state.moodAfter != null
          ? state.moodAfter - state.moodBefore
          : null,
      });

      set({ isComplete: true, isSubmitting: false });
    } catch {
      set({ isSubmitting: false });
    }
  },

  reset: () => {
    set({
      currentType: null,
      currentSteps: [],
      currentContext: {},
      moodBefore: null,
      moodAfter: null,
      startedAt: null,
      isSubmitting: false,
      isComplete: false,
    });
  },
}));
