import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { MoodEntry } from "@/types/database";

interface MoodState {
  todaysMood: MoodEntry | null;
  recentMoods: MoodEntry[];
  isLoading: boolean;

  logMood: (mood: {
    mood_score: number;
    energy_level?: number;
    anxiety_level?: number;
    notes?: string;
  }) => Promise<void>;
  fetchTodaysMood: () => Promise<void>;
  fetchRecentMoods: (days?: number) => Promise<void>;
}

export const useMoodStore = create<MoodState>((set) => ({
  todaysMood: null,
  recentMoods: [],
  isLoading: false,

  logMood: async (mood) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("mood_entries")
      .insert({
        user_id: user.id,
        mood_score: mood.mood_score,
        energy_level: mood.energy_level ?? null,
        anxiety_level: mood.anxiety_level ?? null,
        notes: mood.notes ?? null,
      })
      .select()
      .single();

    if (!error && data) {
      set({ todaysMood: data as MoodEntry });
    }
  },

  fetchTodaysMood: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from("mood_entries")
      .select("*")
      .eq("user_id", user.id)
      .gte("logged_at", today.toISOString())
      .order("logged_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    set({ todaysMood: (data as MoodEntry) ?? null });
  },

  fetchRecentMoods: async (days = 30) => {
    set({ isLoading: true });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      set({ isLoading: false });
      return;
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data } = await supabase
      .from("mood_entries")
      .select("*")
      .eq("user_id", user.id)
      .gte("logged_at", since.toISOString())
      .order("logged_at", { ascending: false });

    set({ recentMoods: (data as MoodEntry[]) ?? [], isLoading: false });
  },
}));
