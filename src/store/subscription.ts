import { create } from "zustand";
import {
  initRevenueCat,
  getOfferings,
  purchasePackage,
  restorePurchases,
  getCustomerInfo,
  hasActiveEntitlement,
} from "@/lib/revenue";
import { track } from "@/lib/analytics";

interface SubscriptionState {
  isPro: boolean;
  isLoading: boolean;
  offerings: any | null;

  initialize: (userId?: string) => Promise<void>;
  checkStatus: () => Promise<void>;
  purchase: (pkg: any) => Promise<boolean>;
  restore: () => Promise<boolean>;
  fetchOfferings: () => Promise<void>;
}

const DEV_MODE = __DEV__;

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  isPro: DEV_MODE,
  isLoading: false,
  offerings: null,

  initialize: async (userId) => {
    if (DEV_MODE) { set({ isPro: true }); return; }
    await initRevenueCat(userId);
    const info = await getCustomerInfo();
    set({ isPro: hasActiveEntitlement(info) });
  },

  checkStatus: async () => {
    if (DEV_MODE) { set({ isPro: true }); return; }
    const info = await getCustomerInfo();
    set({ isPro: hasActiveEntitlement(info) });
  },

  purchase: async (pkg) => {
    set({ isLoading: true });
    track("purchase_started", { package_id: pkg?.identifier });
    try {
      const result = await purchasePackage(pkg);
      const active = hasActiveEntitlement(result.customerInfo);
      set({ isPro: active, isLoading: false });
      if (active) track("purchase_completed", { package_id: pkg?.identifier });
      return active;
    } catch (e: any) {
      set({ isLoading: false });
      if (e.userCancelled) return false;
      track("purchase_failed", { error: e.message });
      throw e;
    }
  },

  restore: async () => {
    set({ isLoading: true });
    track("restore_started");
    try {
      const info = await restorePurchases();
      const active = hasActiveEntitlement(info);
      set({ isPro: active, isLoading: false });
      track("restore_completed", { had_subscription: active });
      return active;
    } catch {
      set({ isLoading: false });
      return false;
    }
  },

  fetchOfferings: async () => {
    const current = await getOfferings();
    set({ offerings: current });
  },
}));
