import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { SessionEcho } from "@/types/database";

type CommitmentOutcome = "done" | "partially" | "not_done" | "rescheduled";

interface EchoState {
  pendingEchoes: SessionEcho[];
  isLoading: boolean;

  fetchPendingEchoes: () => Promise<void>;
  markCompleted: (id: string) => Promise<void>;
  markSkipped: (id: string) => Promise<void>;
  checkIn: (id: string) => Promise<void>;
  respondToCommitment: (id: string, outcome: CommitmentOutcome, note: string | null, rescheduleDate?: string) => Promise<void>;
}

export const useEchoStore = create<EchoState>((set, get) => ({
  pendingEchoes: [],
  isLoading: false,

  fetchPendingEchoes: async () => {
    set({ isLoading: true });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      set({ isLoading: false });
      return;
    }

    const { data } = await supabase
      .from("session_echoes")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["pending", "checked_in"])
      .order("created_at", { ascending: false })
      .limit(5);

    set({ pendingEchoes: (data as SessionEcho[]) ?? [], isLoading: false });
  },

  markCompleted: async (id: string) => {
    await supabase
      .from("session_echoes")
      .update({ status: "completed" })
      .eq("id", id);
    set((s) => ({
      pendingEchoes: s.pendingEchoes.filter((e) => e.id !== id),
    }));
  },

  markSkipped: async (id: string) => {
    await supabase
      .from("session_echoes")
      .update({ status: "skipped" })
      .eq("id", id);
    set((s) => ({
      pendingEchoes: s.pendingEchoes.filter((e) => e.id !== id),
    }));
  },

  checkIn: async (id: string) => {
    await supabase
      .from("session_echoes")
      .update({ status: "checked_in", check_in_at: new Date().toISOString() })
      .eq("id", id);
    set((s) => ({
      pendingEchoes: s.pendingEchoes.map((e) =>
        e.id === id ? { ...e, status: "checked_in" as const } : e,
      ),
    }));
  },

  respondToCommitment: async (id, outcome, note, rescheduleDate) => {
    if (outcome === "rescheduled" && rescheduleDate) {
      await supabase
        .from("session_echoes")
        .update({
          outcome: null,
          follow_up_response: note,
          status: "pending",
          committed_for: rescheduleDate,
          check_in_at: new Date().toISOString(),
        })
        .eq("id", id);
      set((s) => ({
        pendingEchoes: s.pendingEchoes.map((e) =>
          e.id === id
            ? { ...e, outcome: null, status: "pending" as const, committed_for: rescheduleDate }
            : e,
        ),
      }));
      return;
    }
    const status = outcome === "done" ? "completed" : outcome === "not_done" ? "skipped" : "checked_in";
    await supabase
      .from("session_echoes")
      .update({
        outcome,
        follow_up_response: note,
        status,
        check_in_at: new Date().toISOString(),
      })
      .eq("id", id);
    set((s) => ({
      pendingEchoes:
        outcome === "done" || outcome === "not_done"
          ? s.pendingEchoes.filter((e) => e.id !== id)
          : s.pendingEchoes.map((e) =>
              e.id === id ? { ...e, outcome, follow_up_response: note, status: status as any } : e,
            ),
    }));
  },
}));
