import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { JournalEntry, JournalSearchResult, InsightCard } from "@/types/database";

interface JournalState {
  entries: JournalEntry[];
  digests: InsightCard[];
  searchResults: JournalSearchResult[];
  searchQuery: string;
  isLoading: boolean;
  isSearching: boolean;
  isLoadingMore: boolean;
  page: number;
  hasMore: boolean;

  loadTimeline: () => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
}

export const useJournalStore = create<JournalState>((set, get) => ({
  entries: [],
  digests: [],
  searchResults: [],
  searchQuery: "",
  isLoading: false,
  isSearching: false,
  isLoadingMore: false,
  page: 1,
  hasMore: true,

  loadTimeline: async () => {
    set({ isLoading: true });
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/journal-timeline?page=1&page_size=20`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!res.ok) throw new Error("Failed to load timeline");

      const data = await res.json();
      set({
        entries: data.entries ?? [],
        digests: data.digests ?? [],
        hasMore: data.has_more ?? false,
        page: 1,
      });
    } catch (err) {
      console.error("Journal timeline error:", err);
      set({ entries: [], hasMore: false });
    } finally {
      set({ isLoading: false });
    }
  },

  loadMore: async () => {
    const { hasMore, isLoadingMore, page } = get();
    if (!hasMore || isLoadingMore) return;

    set({ isLoadingMore: true });
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const nextPage = page + 1;
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/journal-timeline?page=${nextPage}&page_size=20`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!res.ok) throw new Error("Failed to load more");

      const data = await res.json();
      set((state) => ({
        entries: [...state.entries, ...(data.entries ?? [])],
        hasMore: data.has_more ?? false,
        page: nextPage,
      }));
    } catch (err) {
      console.error("Journal load more error:", err);
      set({ hasMore: false });
    } finally {
      set({ isLoadingMore: false });
    }
  },

  refresh: async () => {
    await get().loadTimeline();
  },

  search: async (query: string) => {
    if (!query.trim()) {
      set({ searchResults: [], searchQuery: "" });
      return;
    }

    set({ isSearching: true, searchQuery: query });
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/memory-search`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query, top_k: 10 }),
        },
      );

      if (!res.ok) throw new Error("Search failed");

      const data = await res.json();
      set({ searchResults: data.results ?? [] });
    } catch (err) {
      console.error("Journal search error:", err);
      set({ searchResults: [] });
    } finally {
      set({ isSearching: false });
    }
  },

  clearSearch: () => {
    set({ searchResults: [], searchQuery: "", isSearching: false });
  },
}));
