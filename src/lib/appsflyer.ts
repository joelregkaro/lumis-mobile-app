import { Platform } from "react-native";

let appsFlyer: typeof import("react-native-appsflyer").default | null = null;

if (Platform.OS !== "web") {
  try {
    appsFlyer = require("react-native-appsflyer").default;
  } catch {
    // AppsFlyer not available (dev/web)
  }
}

const DEV_KEY = process.env.EXPO_PUBLIC_APPSFLYER_DEV_KEY ?? "";
const APP_ID = process.env.EXPO_PUBLIC_APPSFLYER_APP_ID ?? "";

async function requestTrackingPermission(): Promise<void> {
  if (Platform.OS !== "ios") return;
  try {
    const { requestTrackingPermissionsAsync } = require("expo-tracking-transparency");
    await requestTrackingPermissionsAsync();
  } catch {}
}

export async function initAppsFlyer(): Promise<void> {
  if (!appsFlyer || !DEV_KEY) return;
  try {
    await requestTrackingPermission();
    appsFlyer.initSdk(
      {
        devKey: DEV_KEY,
        isDebug: __DEV__,
        appId: APP_ID,
        onInstallConversionDataListener: true,
        onDeepLinkListener: true,
        timeToWaitForATTUserAuthorization: 10,
      },
      (result) => {
        if (__DEV__) console.log("[AppsFlyer] init:", result);
      },
      (error) => {
        console.warn("[AppsFlyer] init error:", error);
      },
    );
  } catch {
    // Silent fail — app should work without AppsFlyer
  }
}

export function setAppsFlyerCustomerUserId(userId: string): void {
  if (!appsFlyer) return;
  try {
    appsFlyer.setCustomerUserId(userId);
  } catch {}
}

export function logAppsFlyerEvent(
  eventName: string,
  eventValues: Record<string, any> = {},
): void {
  if (!appsFlyer) return;
  try {
    appsFlyer.logEvent(eventName, eventValues, () => {}, () => {});
  } catch {}
}

// Pre-defined event helpers matching TikTok Events API mapping
export const AppsFlyerEvents = {
  completeRegistration: (method: string) =>
    logAppsFlyerEvent("af_complete_registration", { af_registration_method: method }),

  completeOnboarding: () =>
    logAppsFlyerEvent("af_tutorial_completion", { af_success: true }),

  firstSessionComplete: (sessionId: string) =>
    logAppsFlyerEvent("first_session_complete", { session_id: sessionId }),

  sessionComplete: (sessionId: string, sessionNumber: number) =>
    logAppsFlyerEvent("session_complete", {
      session_id: sessionId,
      session_number: sessionNumber,
    }),

  subscribe: (plan: string, price: number, currency: string = "USD") =>
    logAppsFlyerEvent("af_subscribe", {
      af_revenue: price,
      af_currency: currency,
      af_content_id: plan,
    }),

  purchase: (productId: string, price: number, currency: string = "USD") =>
    logAppsFlyerEvent("af_purchase", {
      af_revenue: price,
      af_currency: currency,
      af_content_id: productId,
    }),
};
