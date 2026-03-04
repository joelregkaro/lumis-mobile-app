import { Platform } from "react-native";

const isNative = Platform.OS === "ios" || Platform.OS === "android";

let Haptics: typeof import("expo-haptics") | null = null;
if (isNative) {
  Haptics = require("expo-haptics");
}

export async function hapticLight() {
  if (!Haptics) return;
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export async function hapticMedium() {
  if (!Haptics) return;
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export async function hapticSuccess() {
  if (!Haptics) return;
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export async function hapticWarning() {
  if (!Haptics) return;
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}

export async function hapticSelection() {
  if (!Haptics) return;
  await Haptics.selectionAsync();
}

export async function hapticMilestone() {
  if (!Haptics) return;
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  setTimeout(() => Haptics!.impactAsync(Haptics!.ImpactFeedbackStyle.Medium), 150);
  setTimeout(() => Haptics!.impactAsync(Haptics!.ImpactFeedbackStyle.Heavy), 300);
}
