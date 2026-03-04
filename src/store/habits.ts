import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type {
  Habit,
  HabitCompletion,
  HabitReflection,
  HabitFrequency,
  HabitDifficulty,
  HabitPhase,
  HabitCueType,
} from "@/types/database";

interface StreakResult {
  streak: number;
  longest: number;
  total: number;
  freeze_used: boolean;
  lapsed: boolean;
  lapse_count: number;
  freezes_remaining: number;
}

interface HabitState {
  habits: Habit[];
  todayCompletions: HabitCompletion[];
  habitHistory: Record<string, HabitCompletion[]>;
  habitReflections: Record<string, HabitReflection[]>;
  isLoading: boolean;

  fetchHabits: () => Promise<void>;
  fetchTodayCompletions: () => Promise<void>;
  createHabit: (params: {
    title: string;
    description?: string;
    frequency: HabitFrequency;
    custom_days?: number[];
    preferred_time?: "morning" | "afternoon" | "evening";
    source_echo_id?: string;
    anchor_behavior?: string;
    tiny_version?: string;
    difficulty?: HabitDifficulty;
    cue_type?: HabitCueType;
    category?: string;
    identity_statement?: string;
    celebration?: string;
    ai_suggestion?: boolean;
  }) => Promise<Habit | null>;
  updateHabit: (
    habitId: string,
    updates: Partial<
      Pick<
        Habit,
        | "title"
        | "description"
        | "frequency"
        | "custom_days"
        | "preferred_time"
        | "anchor_behavior"
        | "tiny_version"
        | "difficulty"
        | "cue_type"
        | "category"
        | "identity_statement"
        | "celebration"
      >
    >,
  ) => Promise<void>;
  completeToday: (habitId: string, notes?: string) => Promise<StreakResult | null>;
  uncompleteToday: (habitId: string) => Promise<void>;
  pauseHabit: (habitId: string) => Promise<void>;
  resumeHabit: (habitId: string) => Promise<void>;
  archiveHabit: (habitId: string) => Promise<void>;
  getCompletionRate: (habitId: string, days: number) => Promise<number>;
  isCompletedToday: (habitId: string) => boolean;
  todaysHabits: () => Habit[];
  fetchHabitHistory: (habitId: string, days: number) => Promise<HabitCompletion[]>;
  fetchHabitReflections: (habitId: string) => Promise<HabitReflection[]>;
  addReflection: (params: {
    habitId: string;
    reflectionType: "completion" | "lapse" | "milestone";
    whatWorked?: string;
    whatBlocked?: string;
  }) => Promise<void>;
  getHabitPhase: (habit: Habit) => HabitPhase;
  suggestDifficultyUpgrade: (habitId: string) => Promise<boolean>;
}

function isDueToday(habit: Habit): boolean {
  const dow = new Date().getDay();
  switch (habit.frequency) {
    case "daily":
      return true;
    case "weekdays":
      return dow >= 1 && dow <= 5;
    case "weekends":
      return dow === 0 || dow === 6;
    case "weekly": {
      const created = new Date(habit.created_at);
      return created.getDay() === dow;
    }
    case "custom":
      return habit.custom_days?.includes(dow) ?? false;
    default:
      return true;
  }
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

const NEXT_DIFFICULTY: Record<HabitDifficulty, HabitDifficulty | null> = {
  tiny: "small",
  small: "medium",
  medium: "full",
  full: null,
};

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  todayCompletions: [],
  habitHistory: {},
  habitReflections: {},
  isLoading: false,

  fetchHabits: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["active", "paused"])
      .order("created_at", { ascending: true });

    set({ habits: (data as Habit[]) ?? [] });
  },

  fetchTodayCompletions: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("habit_completions")
      .select("*")
      .eq("user_id", user.id)
      .eq("completed_date", todayStr());

    set({ todayCompletions: (data as HabitCompletion[]) ?? [] });
  },

  createHabit: async (params) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("habits")
      .insert({
        user_id: user.id,
        title: params.title,
        description: params.description ?? null,
        frequency: params.frequency,
        custom_days: params.custom_days ?? null,
        preferred_time: params.preferred_time ?? null,
        source_echo_id: params.source_echo_id ?? null,
        anchor_behavior: params.anchor_behavior ?? null,
        tiny_version: params.tiny_version ?? null,
        difficulty: params.difficulty ?? "tiny",
        cue_type: params.cue_type ?? null,
        category: params.category ?? null,
        identity_statement: params.identity_statement ?? null,
        celebration: params.celebration ?? null,
        ai_suggestion: params.ai_suggestion ?? false,
      })
      .select()
      .single();

    if (error || !data) return null;

    const habit = data as Habit;
    set((s) => ({ habits: [...s.habits, habit] }));
    return habit;
  },

  updateHabit: async (habitId, updates) => {
    const { error } = await supabase
      .from("habits")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", habitId);

    if (error) return;

    set((s) => ({
      habits: s.habits.map((h) =>
        h.id === habitId ? { ...h, ...updates, updated_at: new Date().toISOString() } : h,
      ),
    }));
  },

  completeToday: async (habitId, notes) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const today = todayStr();
    const existing = get().todayCompletions.find(
      (c) => c.habit_id === habitId && c.completed_date === today,
    );
    if (existing) return null;

    const { data } = await supabase
      .from("habit_completions")
      .insert({
        habit_id: habitId,
        user_id: user.id,
        completed_date: today,
        notes: notes ?? null,
      })
      .select()
      .single();

    if (!data) return null;

    const completion = data as HabitCompletion;
    set((s) => ({ todayCompletions: [...s.todayCompletions, completion] }));

    const { data: streakData } = await supabase.rpc("update_habit_streak", {
      p_habit_id: habitId,
    });

    if (streakData) {
      const result = streakData as StreakResult;
      set((s) => ({
        habits: s.habits.map((h) =>
          h.id === habitId
            ? {
                ...h,
                current_streak: result.streak,
                longest_streak: result.longest,
                total_completions: result.total,
                lapse_count: result.lapse_count,
                streak_freezes_remaining: result.freezes_remaining,
              }
            : h,
        ),
      }));
      return result;
    }
    return null;
  },

  uncompleteToday: async (habitId) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const today = todayStr();
    await supabase
      .from("habit_completions")
      .delete()
      .eq("habit_id", habitId)
      .eq("completed_date", today);

    set((s) => ({
      todayCompletions: s.todayCompletions.filter(
        (c) => !(c.habit_id === habitId && c.completed_date === today),
      ),
    }));

    const { data: streakData } = await supabase.rpc("update_habit_streak", {
      p_habit_id: habitId,
    });

    if (streakData) {
      const result = streakData as StreakResult;
      set((s) => ({
        habits: s.habits.map((h) =>
          h.id === habitId
            ? {
                ...h,
                current_streak: result.streak,
                longest_streak: result.longest,
                total_completions: result.total,
                lapse_count: result.lapse_count,
                streak_freezes_remaining: result.freezes_remaining,
              }
            : h,
        ),
      }));
    }
  },

  pauseHabit: async (habitId) => {
    await supabase
      .from("habits")
      .update({ status: "paused", updated_at: new Date().toISOString() })
      .eq("id", habitId);
    set((s) => ({
      habits: s.habits.map((h) =>
        h.id === habitId ? { ...h, status: "paused" as const } : h,
      ),
    }));
  },

  resumeHabit: async (habitId) => {
    await supabase
      .from("habits")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", habitId);
    set((s) => ({
      habits: s.habits.map((h) =>
        h.id === habitId ? { ...h, status: "active" as const } : h,
      ),
    }));
  },

  archiveHabit: async (habitId) => {
    await supabase
      .from("habits")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", habitId);
    set((s) => ({
      habits: s.habits.filter((h) => h.id !== habitId),
    }));
  },

  getCompletionRate: async (habitId, days) => {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const { count } = await supabase
      .from("habit_completions")
      .select("id", { count: "exact", head: true })
      .eq("habit_id", habitId)
      .gte("completed_date", since.toISOString().split("T")[0]);
    return Math.round(((count ?? 0) / days) * 100);
  },

  isCompletedToday: (habitId) => {
    const today = todayStr();
    return get().todayCompletions.some(
      (c) => c.habit_id === habitId && c.completed_date === today,
    );
  },

  todaysHabits: () => {
    return get().habits.filter((h) => h.status === "active" && isDueToday(h));
  },

  fetchHabitHistory: async (habitId, days) => {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const { data } = await supabase
      .from("habit_completions")
      .select("*")
      .eq("habit_id", habitId)
      .gte("completed_date", since.toISOString().split("T")[0])
      .order("completed_date", { ascending: true });

    const completions = (data as HabitCompletion[]) ?? [];
    set((s) => ({
      habitHistory: { ...s.habitHistory, [habitId]: completions },
    }));
    return completions;
  },

  fetchHabitReflections: async (habitId) => {
    const { data } = await supabase
      .from("habit_reflections")
      .select("*")
      .eq("habit_id", habitId)
      .order("reflection_date", { ascending: false })
      .limit(20);

    const reflections = (data as HabitReflection[]) ?? [];
    set((s) => ({
      habitReflections: { ...s.habitReflections, [habitId]: reflections },
    }));
    return reflections;
  },

  addReflection: async (params) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const habit = get().habits.find((h) => h.id === params.habitId);

    await supabase.from("habit_reflections").insert({
      habit_id: params.habitId,
      user_id: user.id,
      reflection_date: todayStr(),
      reflection_type: params.reflectionType,
      what_worked: params.whatWorked ?? null,
      what_blocked: params.whatBlocked ?? null,
      difficulty_at_time: habit?.difficulty ?? null,
    });
  },

  getHabitPhase: (habit) => {
    if (habit.current_streak === 0 && habit.total_completions > 0 && habit.lapse_count > 0) {
      return "lapsed";
    }
    const daysSinceCreated = Math.floor(
      (Date.now() - new Date(habit.created_at).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceCreated < 7) return "new";
    if (daysSinceCreated < 22) return "building";
    if (daysSinceCreated < 45) return "forming";
    return "established";
  },

  suggestDifficultyUpgrade: async (habitId) => {
    const habit = get().habits.find((h) => h.id === habitId);
    if (!habit || !NEXT_DIFFICULTY[habit.difficulty]) return false;

    const rate = await get().getCompletionRate(habitId, 14);
    return rate >= 80;
  },
}));

export { isDueToday };
