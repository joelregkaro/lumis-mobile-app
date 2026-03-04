import { create } from "zustand";
import { supabase } from "@/lib/supabase";

interface ReferralSent {
  status: "pending" | "activated" | "rewarded";
  created_at: string;
}

interface ReferralState {
  code: string | null;
  sentReferrals: ReferralSent[];
  receivedStatus: string | null;
  isLoading: boolean;

  fetchReferralStatus: () => Promise<void>;
  applyReferralCode: (code: string) => Promise<{ success: boolean; error?: string }>;
}

export const useReferralStore = create<ReferralState>((set) => ({
  code: null,
  sentReferrals: [],
  receivedStatus: null,
  isLoading: false,

  fetchReferralStatus: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.functions.invoke("redeem-referral", {
        body: { action: "get_status" },
      });
      if (!error && data) {
        set({
          code: data.code ?? null,
          sentReferrals: data.sent ?? [],
          receivedStatus: data.received?.status ?? null,
        });
      }
    } catch {}
    set({ isLoading: false });
  },

  applyReferralCode: async (code) => {
    try {
      const { data, error } = await supabase.functions.invoke("redeem-referral", {
        body: { action: "apply", code },
      });
      if (error || data?.error) {
        return { success: false, error: data?.error || "Failed to apply code" };
      }
      return { success: true };
    } catch {
      return { success: false, error: "Network error" };
    }
  },
}));
