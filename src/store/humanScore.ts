import { create } from "zustand";
import { supabase } from "@/lib/supabase";

export interface HumanScore {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  awareness: number;
  resilience: number;
  discipline: number;
  growth: number;
  connection: number;
  vitality: number;
  composite_score: number;
  archetype: string;
  xp_earned_this_period: number;
  score_breakdown: Record<string, Record<string, number>>;
  computed_at: string;
}

export interface LeagueStanding {
  user_id: string;
  league: string;
  week_start: string;
  xp_earned: number;
  rank: number | null;
  promoted: boolean;
  demoted: boolean;
}

export const TIERS = [
  { name: "Seedling", min: 1, max: 5, subtitle: "Just getting started" },
  { name: "Sprout", min: 6, max: 15, subtitle: "Building awareness" },
  { name: "Bloom", min: 16, max: 25, subtitle: "Finding rhythm" },
  { name: "Tree", min: 26, max: 40, subtitle: "Deep roots" },
  { name: "Forest", min: 41, max: 60, subtitle: "Expanding influence" },
  { name: "Mountain", min: 61, max: 80, subtitle: "Unshakeable" },
  { name: "Sky", min: 81, max: 100, subtitle: "Transcendent" },
] as const;

export function getTier(level: number) {
  return TIERS.find(t => level >= t.min && level <= t.max) ?? TIERS[0];
}

export function xpForLevel(level: number): number {
  return 10 * level * level;
}

export function levelFromXp(totalXp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(totalXp / 10)));
}

interface HumanScoreState {
  latestScore: HumanScore | null;
  previousScore: HumanScore | null;
  scoreHistory: HumanScore[];
  leagueStanding: LeagueStanding | null;
  leaguePeers: LeagueStanding[];
  totalXp: number;
  level: number;
  archetype: string;
  leagueOptedIn: boolean;
  isLoading: boolean;

  fetchLatestScore: () => Promise<void>;
  fetchScoreHistory: (weeks?: number) => Promise<void>;
  fetchLeagueStanding: () => Promise<void>;
  fetchLeaguePeers: () => Promise<void>;
  toggleLeague: (optIn: boolean) => Promise<void>;
  triggerCompute: () => Promise<void>;
}

export const useHumanScoreStore = create<HumanScoreState>((set, get) => ({
  latestScore: null,
  previousScore: null,
  scoreHistory: [],
  leagueStanding: null,
  leaguePeers: [],
  totalXp: 0,
  level: 1,
  archetype: "The Explorer",
  leagueOptedIn: false,
  isLoading: false,

  fetchLatestScore: async () => {
    set({ isLoading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { set({ isLoading: false }); return; }

      const { data: userRow, error: userErr } = await supabase
        .from("users")
        .select("total_xp, level, archetype, league_opted_in")
        .eq("id", user.id)
        .single();

      if (userErr) console.warn("[HumanScore] users query error:", userErr.message);

      const { data: scores, error: scoresErr } = await supabase
        .from("human_scores")
        .select("*")
        .eq("user_id", user.id)
        .order("period_start", { ascending: false })
        .limit(2);

      if (scoresErr) console.warn("[HumanScore] scores query error:", scoresErr.message);

      set({
        latestScore: scores?.[0] ?? null,
        previousScore: scores?.[1] ?? null,
        totalXp: userRow?.total_xp ?? 0,
        level: userRow?.level ?? 1,
        archetype: userRow?.archetype ?? "The Explorer",
        leagueOptedIn: userRow?.league_opted_in ?? false,
        isLoading: false,
      });
    } catch (e) {
      console.warn("[HumanScore] fetchLatestScore failed:", e);
      set({ isLoading: false });
    }
  },

  fetchScoreHistory: async (weeks = 12) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);

    const { data } = await supabase
      .from("human_scores")
      .select("*")
      .eq("user_id", user.id)
      .gte("period_start", since.toISOString().slice(0, 10))
      .order("period_start", { ascending: true });

    set({ scoreHistory: data ?? [] });
  },

  fetchLeagueStanding: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("league_standings")
      .select("*")
      .eq("user_id", user.id)
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    set({ leagueStanding: data });
  },

  fetchLeaguePeers: async () => {
    const standing = get().leagueStanding;
    if (!standing) return;

    const { data } = await supabase
      .from("league_standings")
      .select("user_id, league, week_start, xp_earned, rank, promoted, demoted")
      .eq("league", standing.league)
      .eq("week_start", standing.week_start)
      .order("xp_earned", { ascending: false })
      .limit(30);

    set({ leaguePeers: data ?? [] });
  },

  toggleLeague: async (optIn: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("users").update({
      league_opted_in: optIn,
      league: optIn ? "Bronze" : null,
    }).eq("id", user.id);

    set({ leagueOptedIn: optIn });
  },

  triggerCompute: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const session = await supabase.auth.getSession();
    await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/compute-human-score`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.data.session?.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: user.id }),
      },
    );

    await get().fetchLatestScore();
  },
}));
