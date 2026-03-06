import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, NativeModules } from "react-native";

const WIDGET_DATA_KEY = "widget_data";
const APP_GROUP_ID = "group.com.lumis.ios";

interface WidgetData {
  streak: number;
  lastMood: number | null;
  lastMoodDate: string | null;
  companionName: string;
  message: string;
  tier: string;
}

export async function updateWidgetData(data: Partial<WidgetData>) {
  try {
    const existing = await getWidgetData();
    const updated = { ...existing, ...data };

    await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(updated));

    if (Platform.OS === "ios") {
      try {
        const SharedUserDefaults = NativeModules.SharedUserDefaults;
        if (SharedUserDefaults?.setData) {
          SharedUserDefaults.setData(JSON.stringify(updated), APP_GROUP_ID);
        }
      } catch {
        // Native module not available yet — widget extension not installed
      }
    }
  } catch (e) {
    console.warn("Failed to update widget data:", e);
  }
}

export async function getWidgetData(): Promise<WidgetData> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    streak: 0,
    lastMood: null,
    lastMoodDate: null,
    companionName: "Lumis",
    message: "How are you feeling today?",
    tier: "seedling",
  };
}

export function getWidgetMessage(streak: number, lastMoodDate: string | null): string {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (!lastMoodDate) return `${greeting}! Ready to check in?`;

  const today = new Date().toISOString().slice(0, 10);
  if (lastMoodDate === today) {
    if (streak >= 7) return `${streak} days strong. You're building something.`;
    return "Already checked in today. Nice.";
  }

  if (streak >= 30) return `${greeting}! ${streak}-day streak — don't stop now.`;
  if (streak >= 7) return `${greeting}! Keep the streak alive.`;
  return `${greeting}! How are you feeling?`;
}
