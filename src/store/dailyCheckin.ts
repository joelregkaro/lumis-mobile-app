import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { DailyCheckin } from "@/types/database";

function todayDateStr(): string {
  return new Date().toISOString().split("T")[0];
}

interface DailyCheckinState {
  todaysCheckin: DailyCheckin | null;
  weekHistory: DailyCheckin[];
  isLoading: boolean;

  fetchToday: () => Promise<void>;
  fetchWeekHistory: () => Promise<void>;
  setMorningIntention: (intention: string, domain: string | null, energy: number) => Promise<void>;
  setEveningReflection: (reflection: string, completed: boolean | null, wins: string[], rating: number) => Promise<void>;
}

export const useDailyCheckinStore = create<DailyCheckinState>((set) => ({
  todaysCheckin: null,
  weekHistory: [],
  isLoading: false,

  fetchToday: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("daily_checkins")
      .select("*")
      .eq("user_id", user.id)
      .eq("checkin_date", todayDateStr())
      .maybeSingle();

    set({ todaysCheckin: data as DailyCheckin | null });
  },

  fetchWeekHistory: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const cutoff = weekAgo.toISOString().split("T")[0];

    const { data } = await supabase
      .from("daily_checkins")
      .select("*")
      .eq("user_id", user.id)
      .gte("checkin_date", cutoff)
      .order("checkin_date", { ascending: true });

    set({ weekHistory: (data as DailyCheckin[]) ?? [] });
  },

  setMorningIntention: async (intention, domain, energy) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = todayDateStr();

    const { data } = await supabase
      .from("daily_checkins")
      .upsert(
        {
          user_id: user.id,
          checkin_date: today,
          morning_intention: intention,
          focus_domain: domain,
          energy_level: energy,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,checkin_date" },
      )
      .select()
      .single();

    if (data) set({ todaysCheckin: data as DailyCheckin });
  },

  setEveningReflection: async (reflection, completed, wins, rating) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = todayDateStr();

    const { data } = await supabase
      .from("daily_checkins")
      .upsert(
        {
          user_id: user.id,
          checkin_date: today,
          evening_reflection: reflection,
          intention_completed: completed,
          wins,
          day_rating: rating,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,checkin_date" },
      )
      .select()
      .single();

    if (data) set({ todaysCheckin: data as DailyCheckin });
  },
}));
