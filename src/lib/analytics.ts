import PostHog from "posthog-react-native";

let posthog: PostHog | null = null;

export async function initAnalytics() {
  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  if (!apiKey || __DEV__) return;

  try {
    posthog = new PostHog(apiKey, {
      host: process.env.EXPO_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      enableSessionReplay: false,
    });
  } catch {}
}

export function identify(userId: string, properties?: Record<string, any>) {
  posthog?.identify(userId, properties);
}

export function track(event: string, properties?: Record<string, any>) {
  posthog?.capture(event, properties);
}

export function screen(name: string, properties?: Record<string, any>) {
  posthog?.screen(name, properties);
}

export function reset() {
  posthog?.reset();
}
