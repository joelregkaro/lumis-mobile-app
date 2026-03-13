import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/analytics";
import { syncDailyProgressFromStores } from "@/lib/liveActivity";

export type CheckInType =
  | "commitment_followup"
  | "morning_briefing"
  | "pattern_checkin"
  | "general";

export type CommitmentOutcome = "done" | "partially" | "not_done" | "rescheduled";

export interface PendingCheckIn {
  type: CheckInType;
  id: string | null;
  title: string;
  subtitle: string;
  data: Record<string, unknown>;
}

interface CheckInState {
  pending: PendingCheckIn | null;
  isLoadingPending: boolean;

  type: CheckInType | null;
  referenceId: string | null;
  referenceData: Record<string, unknown>;

  moodScore: number | null;
  note: string;
  commitmentOutcome: CommitmentOutcome | null;
  patternAcknowledged: boolean | null;
  intentionText: string;

  isSubmitting: boolean;
  isComplete: boolean;
  error: string | null;

  fetchPending: () => Promise<void>;
  initFromParams: (type: CheckInType, id: string | null, data?: Record<string, unknown>) => void;
  setMood: (score: number) => void;
  setNote: (text: string) => void;
  setCommitmentOutcome: (outcome: CommitmentOutcome) => void;
  setPatternAcknowledged: (value: boolean) => void;
  setIntention: (text: string) => void;
  submit: () => Promise<void>;
  reset: () => void;
}

function todayDateStr(): string {
  return new Date().toISOString().split("T")[0];
}

export const useCheckInStore = create<CheckInState>((set, get) => ({
  pending: null,
  isLoadingPending: false,

  type: null,
  referenceId: null,
  referenceData: {},

  moodScore: null,
  note: "",
  commitmentOutcome: null,
  patternAcknowledged: null,
  intentionText: "",

  isSubmitting: false,
  isComplete: false,
  error: null,

  fetchPending: async () => {
    set({ isLoadingPending: true });
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        set({ isLoadingPending: false });
        return;
      }

      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/get-pending-checkin?tz=${encodeURIComponent(tz)}`;
      const resp = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
        },
      });

      if (!resp.ok) {
        set({ pending: null, isLoadingPending: false });
        return;
      }

      const payload = await resp.json();
      set({ pending: payload as PendingCheckIn | null, isLoadingPending: false });
    } catch {
      set({ pending: null, isLoadingPending: false });
    }
  },

  initFromParams: (type, id, data) => {
    set({
      type,
      referenceId: id,
      referenceData: data ?? {},
      moodScore: null,
      note: "",
      commitmentOutcome: null,
      patternAcknowledged: null,
      intentionText: "",
      isSubmitting: false,
      isComplete: false,
      error: null,
    });
  },

  setMood: (score) => set({ moodScore: score }),
  setNote: (text) => set({ note: text }),
  setCommitmentOutcome: (outcome) => set({ commitmentOutcome: outcome }),
  setPatternAcknowledged: (value) => set({ patternAcknowledged: value }),
  setIntention: (text) => set({ intentionText: text }),

  submit: async () => {
    const state = get();
    if (state.isSubmitting) return;
    set({ isSubmitting: true, error: null });

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const promises: Promise<unknown>[] = [];

      // Always log mood if provided
      if (state.moodScore != null) {
        promises.push(
          supabase
            .from("mood_entries")
            .insert({
              user_id: user.id,
              mood_score: state.moodScore,
              notes: state.note || null,
            })
            .then(() => {
              syncDailyProgressFromStores();
            }),
        );
      }

      // Type-specific persistence
      switch (state.type) {
        case "commitment_followup": {
          const echoId = state.referenceId;
          const outcome = state.commitmentOutcome;
          if (echoId && outcome) {
            if (outcome === "rescheduled") {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              tomorrow.setHours(9, 0, 0, 0);
              promises.push(
                supabase
                  .from("session_echoes")
                  .update({
                    outcome: null,
                    follow_up_response: state.note || null,
                    status: "pending",
                    committed_for: tomorrow.toISOString(),
                    check_in_at: new Date().toISOString(),
                  })
                  .eq("id", echoId),
              );
            } else {
              const status =
                outcome === "done"
                  ? "completed"
                  : outcome === "not_done"
                    ? "skipped"
                    : "checked_in";
              promises.push(
                supabase
                  .from("session_echoes")
                  .update({
                    outcome,
                    follow_up_response: state.note || null,
                    status,
                    check_in_at: new Date().toISOString(),
                  })
                  .eq("id", echoId),
              );
            }
          }
          break;
        }

        case "morning_briefing": {
          if (state.intentionText.trim()) {
            const today = todayDateStr();
            promises.push(
              supabase
                .from("daily_checkins")
                .upsert(
                  {
                    user_id: user.id,
                    checkin_date: today,
                    morning_intention: state.intentionText.trim(),
                    energy_level: state.moodScore ?? null,
                    updated_at: new Date().toISOString(),
                  },
                  { onConflict: "user_id,checkin_date" },
                ),
            );
          }
          break;
        }

        case "pattern_checkin": {
          const patternId = state.referenceId;
          if (patternId && state.patternAcknowledged != null) {
            promises.push(
              supabase
                .from("patterns")
                .update({ acknowledged_by_user: true })
                .eq("id", patternId),
            );
          }
          break;
        }
      }

      await Promise.all(promises);

      track("checkin_completed", {
        type: state.type,
        mood_score: state.moodScore,
        has_note: !!state.note,
        commitment_outcome: state.commitmentOutcome,
      });

      set({ isComplete: true, isSubmitting: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      set({ error: message, isSubmitting: false });
    }
  },

  reset: () => {
    set({
      type: null,
      referenceId: null,
      referenceData: {},
      moodScore: null,
      note: "",
      commitmentOutcome: null,
      patternAcknowledged: null,
      intentionText: "",
      isSubmitting: false,
      isComplete: false,
      error: null,
    });
  },
}));
