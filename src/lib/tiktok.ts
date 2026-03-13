import { supabase } from "@/lib/supabase";

type TikTokEvent =
  | "CompleteRegistration"
  | "CompleteOnboarding"
  | "FirstSessionComplete"
  | "SessionComplete"
  | "Subscribe"
  | "Purchase"
  | "StartTrial"
  | "ViewContent";

export async function sendTikTokEvent(
  event: TikTokEvent,
  userId: string,
  email?: string,
  properties?: Record<string, any>,
): Promise<void> {
  try {
    await supabase.functions.invoke("tiktok-event", {
      body: { event, user_id: userId, email, properties },
    });
  } catch {
    // Non-fatal — never block the user experience for attribution
  }
}
