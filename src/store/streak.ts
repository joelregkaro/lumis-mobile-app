import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { updateWidgetData, getWidgetMessage } from "@/lib/widget";

interface StreakState {
  currentStreak: number;
  longestStreak: number;
  freezesRemaining: number;
  streakUpdatedAt: string | null;
  isLoading: boolean;

  fetchStreak: () => Promise<void>;
  updateStreak: () => Promise<void>;
}

export const useStreakStore = create<StreakState>((set) => ({
  currentStreak: 0,
  longestStreak: 0,
  freezesRemaining: 1,
  streakUpdatedAt: null,
  isLoading: false,

  fetchStreak: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("users")
      .select("current_streak, longest_streak, streak_freezes_remaining, streak_updated_at")
      .eq("id", user.id)
      .single();

    if (data) {
      set({
        currentStreak: data.current_streak ?? 0,
        longestStreak: data.longest_streak ?? 0,
        freezesRemaining: data.streak_freezes_remaining ?? 1,
        streakUpdatedAt: data.streak_updated_at,
      });
    }
  },

  updateStreak: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase.rpc("update_user_streak", {
      p_user_id: user.id,
    });

    if (!error && data) {
      const newStreak = data.streak ?? 0;
      const today = new Date().toISOString().slice(0, 10);
      set({
        currentStreak: newStreak,
        longestStreak: data.longest ?? 0,
        freezesRemaining: data.freezes ?? 1,
        streakUpdatedAt: today,
      });
      updateWidgetData({
        streak: newStreak,
        lastMoodDate: today,
        message: getWidgetMessage(newStreak, today),
      });
    }
  },
}));
