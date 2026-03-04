import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { LifeDomain, LifeDomainType } from "@/types/database";

interface LifeDomainsState {
  latestScores: LifeDomain[];
  isLoading: boolean;

  fetchLatestScores: () => Promise<void>;
  saveAssessment: (scores: { domain: LifeDomainType; score: number }[]) => Promise<void>;
}

export const DOMAIN_META: Record<LifeDomainType, { label: string; icon: string; color: string }> = {
  health: { label: "Health", icon: "heart-outline", color: "#F87171" },
  career: { label: "Career", icon: "briefcase-outline", color: "#60A5FA" },
  relationships: { label: "Relationships", icon: "people-outline", color: "#A78BFA" },
  personal_growth: { label: "Growth", icon: "trending-up", color: "#2DD4BF" },
  rest_recovery: { label: "Rest", icon: "bed-outline", color: "#FBBF24" },
  fun_creativity: { label: "Fun", icon: "color-palette-outline", color: "#F472B6" },
};

export const ALL_DOMAINS: LifeDomainType[] = [
  "health", "career", "relationships", "personal_growth", "rest_recovery", "fun_creativity",
];

export const useLifeDomainsStore = create<LifeDomainsState>((set) => ({
  latestScores: [],
  isLoading: false,

  fetchLatestScores: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    set({ isLoading: true });

    const results: LifeDomain[] = [];
    for (const domain of ALL_DOMAINS) {
      const { data } = await supabase
        .from("life_domains")
        .select("*")
        .eq("user_id", user.id)
        .eq("domain", domain)
        .order("assessed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) results.push(data as LifeDomain);
    }

    set({ latestScores: results, isLoading: false });
  },

  saveAssessment: async (scores) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const now = new Date().toISOString();
    const rows = scores.map((s) => ({
      user_id: user.id,
      domain: s.domain,
      score: s.score,
      assessed_at: now,
    }));

    await supabase.from("life_domains").insert(rows);

    const { data } = await supabase
      .from("life_domains")
      .select("*")
      .eq("user_id", user.id)
      .eq("assessed_at", now);

    if (data) set({ latestScores: data as LifeDomain[] });
  },
}));
