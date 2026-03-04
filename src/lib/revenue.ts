import { Platform } from "react-native";

let Purchases: typeof import("react-native-purchases").default | null = null;

if (Platform.OS !== "web") {
  try {
    Purchases = require("react-native-purchases").default;
  } catch {
    // RevenueCat not available (dev/web)
  }
}

const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? "",
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? "",
  default: "",
});

export async function initRevenueCat(userId?: string) {
  if (!Purchases || !API_KEY) return;
  try {
    Purchases.configure({ apiKey: API_KEY });
    if (userId) {
      await Purchases.logIn(userId);
    }
  } catch {
    // Silent fail — app should work without RevenueCat
  }
}

export async function getOfferings() {
  if (!Purchases) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch {
    return null;
  }
}

export async function purchasePackage(pkg: any) {
  if (!Purchases) throw new Error("Purchases not available");
  return Purchases.purchasePackage(pkg);
}

export async function restorePurchases() {
  if (!Purchases) throw new Error("Purchases not available");
  return Purchases.restorePurchases();
}

export async function getCustomerInfo() {
  if (!Purchases) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export function hasActiveEntitlement(customerInfo: any): boolean {
  if (!customerInfo) return false;
  return Object.keys(customerInfo.entitlements?.active ?? {}).length > 0;
}
