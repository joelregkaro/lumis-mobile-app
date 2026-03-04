import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

const isNative = Platform.OS === "ios" || Platform.OS === "android";

let Notifications: typeof import("expo-notifications") | null = null;
let Device: typeof import("expo-device") | null = null;

if (isNative) {
  Notifications = require("expo-notifications");
  Device = require("expo-device");

  Notifications!.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function registerPushToken(): Promise<string | null> {
  if (!isNative || !Notifications || !Device) return null;
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from("users")
      .update({ push_token: token })
      .eq("id", user.id);
  }

  return token;
}

const noopSubscription = { remove: () => {} };

export function addNotificationReceivedListener(
  callback: (notification: any) => void,
) {
  if (!isNative || !Notifications) return noopSubscription;
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseListener(
  callback: (response: any) => void,
) {
  if (!isNative || !Notifications) return noopSubscription;
  return Notifications.addNotificationResponseReceivedListener(callback);
}
