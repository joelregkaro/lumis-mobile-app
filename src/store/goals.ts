import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/analytics";
import type { Goal, GoalMilestone } from "@/types/database";

interface GoalState {
  goals: Goal[];
  completedGoals: Goal[];
  milestones: Record<string, GoalMilestone[]>;
  isLoading: boolean;

  fetchGoals: () => Promise<void>;
  fetchCompletedGoals: () => Promise<void>;
  createGoal: (title: string, description?: string, category?: string, targetDate?: string, milestones?: string[]) => Promise<string | null>;
  updateStatus: (id: string, status: Goal["status"]) => Promise<void>;
  addProgressNote: (id: string, note: string, progressPct?: number) => Promise<void>;
  fetchMilestones: (goalId: string) => Promise<void>;
  createMilestone: (goalId: string, title: string) => Promise<void>;
  toggleMilestone: (milestoneId: string, goalId: string) => Promise<void>;
  deleteMilestone: (milestoneId: string, goalId: string) => Promise<void>;
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  completedGoals: [],
  milestones: {},
  isLoading: false,

  fetchGoals: async () => {
    set({ isLoading: true });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { set({ isLoading: false }); return; }

    const { data } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["active", "paused"])
      .order("created_at", { ascending: false });

    const goals = (data as Goal[]) ?? [];
    set({ goals, isLoading: false });

    for (const goal of goals) {
      get().fetchMilestones(goal.id);
    }
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

  createGoal: async (title, description, category, targetDate, milestonesTitles) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

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

    if (!data) return null;
    const goal = data as Goal;

    if (milestonesTitles && milestonesTitles.length > 0) {
      const rows = milestonesTitles.map((t, i) => ({
        goal_id: goal.id,
        user_id: user.id,
        title: t,
        sort_order: i,
      }));
      const { data: ms } = await supabase.from("goal_milestones").insert(rows).select();
      if (ms) {
        set((s) => ({ milestones: { ...s.milestones, [goal.id]: ms as GoalMilestone[] } }));
      }
    }

    set((s) => ({ goals: [goal, ...s.goals] }));
    track("goal_created", { category });
    return goal.id;
  },

  updateStatus: async (id, status) => {
    const updates: Record<string, unknown> = { status };
    if (status === "completed") {
      updates.completed_at = new Date().toISOString();
    }
    await supabase.from("goals").update(updates).eq("id", id);
    set((s) => ({
      goals: status === "completed" || status === "archived"
        ? s.goals.filter((g) => g.id !== id)
        : s.goals.map((g) => (g.id === id ? { ...g, status } : g)),
    }));
    if (status === "completed") track("goal_completed", { goal_id: id });
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

    await supabase.from("goals").update({ progress_notes: progressNotes }).eq("id", id);
    set((s) => ({
      goals: s.goals.map((g) => g.id === id ? { ...g, progress_notes: progressNotes } : g),
    }));
  },

  fetchMilestones: async (goalId) => {
    const { data } = await supabase
      .from("goal_milestones")
      .select("*")
      .eq("goal_id", goalId)
      .order("sort_order", { ascending: true });

    if (data) {
      set((s) => ({ milestones: { ...s.milestones, [goalId]: data as GoalMilestone[] } }));
    }
  },

  createMilestone: async (goalId, title) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const existing = get().milestones[goalId] ?? [];
    const { data } = await supabase
      .from("goal_milestones")
      .insert({ goal_id: goalId, user_id: user.id, title, sort_order: existing.length })
      .select()
      .single();

    if (data) {
      set((s) => ({
        milestones: { ...s.milestones, [goalId]: [...(s.milestones[goalId] ?? []), data as GoalMilestone] },
      }));
    }
  },

  toggleMilestone: async (milestoneId, goalId) => {
    const ms = get().milestones[goalId]?.find((m) => m.id === milestoneId);
    if (!ms) return;

    const newCompleted = !ms.is_completed;
    const updates: Record<string, unknown> = {
      is_completed: newCompleted,
      completed_at: newCompleted ? new Date().toISOString() : null,
    };

    await supabase.from("goal_milestones").update(updates).eq("id", milestoneId);

    set((s) => ({
      milestones: {
        ...s.milestones,
        [goalId]: (s.milestones[goalId] ?? []).map((m) =>
          m.id === milestoneId ? { ...m, ...updates } as GoalMilestone : m
        ),
      },
    }));

    const allMs = get().milestones[goalId] ?? [];
    const completed = allMs.filter((m) => m.is_completed).length;
    const total = allMs.length;
    if (total > 0) {
      const pct = Math.round((completed / total) * 100);
      const noteText = newCompleted ? `Milestone completed: ${ms.title}` : `Milestone unchecked: ${ms.title}`;
      await get().addProgressNote(goalId, noteText, pct);
    }
  },

  deleteMilestone: async (milestoneId, goalId) => {
    await supabase.from("goal_milestones").delete().eq("id", milestoneId);
    set((s) => ({
      milestones: {
        ...s.milestones,
        [goalId]: (s.milestones[goalId] ?? []).filter((m) => m.id !== milestoneId),
      },
    }));
  },
}));
