import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { Goal } from "@/types/database";

interface GoalState {
  goals: Goal[];
  isLoading: boolean;

  fetchGoals: () => Promise<void>;
  completedGoals: Goal[];
  createGoal: (title: string, description?: string, category?: string, targetDate?: string) => Promise<void>;
  updateStatus: (id: string, status: Goal["status"]) => Promise<void>;
  addProgressNote: (id: string, note: string, progressPct?: number) => Promise<void>;
  fetchCompletedGoals: () => Promise<void>;
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  completedGoals: [],
  isLoading: false,

  fetchGoals: async () => {
    set({ isLoading: true });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      set({ isLoading: false });
      return;
    }

    const { data } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["active", "paused"])
      .order("created_at", { ascending: false });

    set({ goals: (data as Goal[]) ?? [], isLoading: false });
  },

  createGoal: async (title, description, category, targetDate) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("goals")
      .insert({
        user_id: user.id,
        title,
        description: description ?? null,
        category: category ?? null,
        target_date: targetDate ?? null,
        status: "active",
      })
      .select()
      .single();

    if (data) {
      set((s) => ({ goals: [data as Goal, ...s.goals] }));
    }
  },

  updateStatus: async (id, status) => {
    const updates: Record<string, unknown> = { status };
    if (status === "completed") {
      updates.completed_at = new Date().toISOString();
    }

    await supabase.from("goals").update(updates).eq("id", id);
    set((s) => ({
      goals:
        status === "completed" || status === "archived"
          ? s.goals.filter((g) => g.id !== id)
          : s.goals.map((g) => (g.id === id ? { ...g, status } : g)),
    }));
  },

  addProgressNote: async (id, note, progressPct) => {
    const goal = get().goals.find((g) => g.id === id);
    if (!goal) return;

    const newNote = {
      date: new Date().toISOString(),
      note,
      progress_pct: progressPct ?? 0,
    };
    const progressNotes = [...(goal.progress_notes ?? []), newNote];

    await supabase
      .from("goals")
      .update({ progress_notes: progressNotes })
      .eq("id", id);

    set((s) => ({
      goals: s.goals.map((g) =>
        g.id === id ? { ...g, progress_notes: progressNotes } : g,
      ),
    }));
  },

  fetchCompletedGoals: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(10);

    set({ completedGoals: (data as Goal[]) ?? [] });
  },
}));
