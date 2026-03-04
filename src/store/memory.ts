import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { UserMemory, Pattern, UserMemoryDoc, MemoryCategory, InsightCard } from "@/types/database";

interface MemoryState {
  memoryDoc: UserMemoryDoc | null;
  memories: UserMemory[];
  patterns: Pattern[];
  latestInsight: Pattern | null;
  wrappedCards: InsightCard[];
  weeklyInsightCards: InsightCard[];
  isLoading: boolean;

  fetchMemoryDoc: () => Promise<void>;
  fetchMemories: () => Promise<void>;
  fetchPatterns: () => Promise<void>;
  fetchLatestInsight: () => Promise<void>;
  fetchWrapped: () => Promise<void>;
  fetchWeeklyInsightCards: () => Promise<void>;
  markShared: (cardId: string) => Promise<void>;
  updateMemory: (id: string, content: string) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  getMemoriesByCategory: (category: MemoryCategory) => UserMemory[];
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  memoryDoc: null,
  memories: [],
  patterns: [],
  latestInsight: null,
  wrappedCards: [],
  weeklyInsightCards: [],
  isLoading: false,

  fetchMemoryDoc: async () => {
    set({ isLoading: true });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      set({ isLoading: false });
      return;
    }

    const { data } = await supabase
      .from("user_memory_doc")
      .select("*")
      .eq("user_id", user.id)
      .single();

    set({ memoryDoc: (data as UserMemoryDoc) ?? null, isLoading: false });
  },

  fetchMemories: async () => {
    set({ isLoading: true });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      set({ isLoading: false });
      return;
    }

    const { data } = await supabase
      .from("user_memories")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("category")
      .order("created_at", { ascending: false });

    set({ memories: (data as UserMemory[]) ?? [], isLoading: false });
  },

  fetchPatterns: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("patterns")
      .select("*")
      .eq("user_id", user.id)
      .order("detected_at", { ascending: false })
      .limit(10);

    set({ patterns: (data as Pattern[]) ?? [] });
  },

  fetchLatestInsight: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("patterns")
      .select("*")
      .eq("user_id", user.id)
      .order("detected_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    set({ latestInsight: (data as Pattern) ?? null });
  },

  fetchWrapped: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("insight_cards")
      .select("*")
      .eq("user_id", user.id)
      .eq("card_type", "monthly_wrapped")
      .order("created_at", { ascending: false })
      .limit(6);

    set({ wrappedCards: (data as InsightCard[]) ?? [] });
  },

  fetchWeeklyInsightCards: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data } = await supabase
      .from("insight_cards")
      .select("*")
      .eq("user_id", user.id)
      .eq("card_type", "weekly_insight")
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(5);

    set({ weeklyInsightCards: (data as InsightCard[]) ?? [] });
  },

  markShared: async (cardId) => {
    const now = new Date().toISOString();
    await supabase.from("insight_cards").update({ shared_at: now }).eq("id", cardId);
    set((state) => ({
      wrappedCards: state.wrappedCards.map((c) => (c.id === cardId ? { ...c, shared_at: now } : c)),
    }));
  },

  updateMemory: async (id, content) => {
    await supabase.from("user_memories").update({ content, updated_at: new Date().toISOString() }).eq("id", id);
    set((state) => ({
      memories: state.memories.map((m) => (m.id === id ? { ...m, content } : m)),
    }));
  },

  deleteMemory: async (id) => {
    await supabase.from("user_memories").update({ is_active: false }).eq("id", id);
    set((state) => ({
      memories: state.memories.filter((m) => m.id !== id),
    }));
  },

  getMemoriesByCategory: (category) => {
    return get().memories.filter((m) => m.category === category);
  },
}));
