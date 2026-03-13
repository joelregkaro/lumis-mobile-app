import { Platform } from "react-native";

let posthogClient: any = null;

const API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? "";
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

export async function initPostHog(): Promise<void> {
  if (Platform.OS === "web" || !API_KEY) return;
  try {
    const PostHog = require("posthog-react-native").PostHog;
    posthogClient = new PostHog(API_KEY, { host: HOST });
  } catch {
    // PostHog not available
  }
}

export function identifyPostHog(
  userId: string,
  properties?: Record<string, any>,
): void {
  if (!posthogClient) return;
  try {
    posthogClient.identify(userId, properties);
  } catch {}
}

export function capturePostHog(
  event: string,
  properties?: Record<string, any>,
): void {
  if (!posthogClient) return;
  try {
    posthogClient.capture(event, properties);
  } catch {}
}

export function resetPostHog(): void {
  if (!posthogClient) return;
  try {
    posthogClient.reset();
  } catch {}
}

export function setPostHogPersonProperties(
  properties: Record<string, any>,
): void {
  if (!posthogClient) return;
  try {
    posthogClient.identify(undefined, properties);
  } catch {}
}
