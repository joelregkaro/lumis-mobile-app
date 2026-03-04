import { create } from "zustand";
import { Platform } from "react-native";

let AsyncStorage: any = null;
if (Platform.OS !== "web") {
  try {
    AsyncStorage = require("@react-native-async-storage/async-storage").default;
  } catch { /* not available */ }
}

const STORAGE_KEY = "lumis_celebrated_milestones";

interface MilestoneState {
  celebrated: Set<string>;
  pendingCelebration: string | null;

  loadCelebrated: () => Promise<void>;
  checkNewMilestones: (current: Record<string, boolean>) => void;
  markCelebrated: (key: string) => Promise<void>;
  dismissCelebration: () => void;
}

export const useMilestoneStore = create<MilestoneState>((set, get) => ({
  celebrated: new Set(),
  pendingCelebration: null,

  loadCelebrated: async () => {
    if (!AsyncStorage) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        set({ celebrated: new Set(JSON.parse(raw)) });
      }
    } catch { /* ignore */ }
  },

  checkNewMilestones: (current) => {
    const { celebrated } = get();
    for (const [key, done] of Object.entries(current)) {
      if (done && !celebrated.has(key)) {
        set({ pendingCelebration: key });
        return;
      }
    }
  },

  markCelebrated: async (key) => {
    const { celebrated } = get();
    const updated = new Set(celebrated);
    updated.add(key);
    set({ celebrated: updated, pendingCelebration: null });

    if (AsyncStorage) {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...updated]));
      } catch { /* ignore */ }
    }
  },

  dismissCelebration: () => set({ pendingCelebration: null }),
}));
