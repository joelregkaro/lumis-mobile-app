import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { Habit, HabitCompletion, HabitFrequency } from "@/types/database";

interface HabitState {
  habits: Habit[];
  todayCompletions: HabitCompletion[];
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
  }) => Promise<Habit | null>;
  completeToday: (habitId: string, notes?: string) => Promise<void>;
  uncompleteToday: (habitId: string) => Promise<void>;
  pauseHabit: (habitId: string) => Promise<void>;
  resumeHabit: (habitId: string) => Promise<void>;
  archiveHabit: (habitId: string) => Promise<void>;
  getCompletionRate: (habitId: string, days: number) => Promise<number>;
  isCompletedToday: (habitId: string) => boolean;
  todaysHabits: () => Habit[];
}

function isDueToday(habit: Habit): boolean {
  const dow = new Date().getDay(); // 0=Sun..6=Sat
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

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  todayCompletions: [],
  isLoading: false,

  fetchHabits: async () => {
    const { data: { user } } = await supabase.auth.getUser();
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("habit_completions")
      .select("*")
      .eq("user_id", user.id)
      .eq("completed_date", todayStr());

    set({ todayCompletions: (data as HabitCompletion[]) ?? [] });
  },

  createHabit: async (params) => {
    const { data: { user } } = await supabase.auth.getUser();
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
      })
      .select()
      .single();

    if (error || !data) return null;

    const habit = data as Habit;
    set((s) => ({ habits: [...s.habits, habit] }));
    return habit;
  },

  completeToday: async (habitId, notes) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = todayStr();
    const existing = get().todayCompletions.find(
      (c) => c.habit_id === habitId && c.completed_date === today,
    );
    if (existing) return;

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

    if (!data) return;

    const completion = data as HabitCompletion;
    set((s) => ({ todayCompletions: [...s.todayCompletions, completion] }));

    // Update streak via DB function
    const { data: streakData } = await supabase.rpc("update_habit_streak", {
      p_habit_id: habitId,
    });

    if (streakData) {
      set((s) => ({
        habits: s.habits.map((h) =>
          h.id === habitId
            ? {
                ...h,
                current_streak: streakData.streak,
                longest_streak: streakData.longest,
                total_completions: streakData.total,
              }
            : h,
        ),
      }));
    }
  },

  uncompleteToday: async (habitId) => {
    const { data: { user } } = await supabase.auth.getUser();
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
      set((s) => ({
        habits: s.habits.map((h) =>
          h.id === habitId
            ? {
                ...h,
                current_streak: streakData.streak,
                longest_streak: streakData.longest,
                total_completions: streakData.total,
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
}));

export { isDueToday };
