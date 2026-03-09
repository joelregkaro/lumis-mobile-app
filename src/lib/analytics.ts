import { AppState } from "react-native";
import { supabase } from "@/lib/supabase";

type Event = {
  event_name: string;
  properties: Record<string, any>;
  screen?: string;
  session_id?: string;
  created_at: string;
};

let buffer: Event[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let userId: string | null = null;

const FLUSH_INTERVAL_MS = 5_000;
const FLUSH_THRESHOLD = 10;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flush, FLUSH_INTERVAL_MS);
}

async function flush() {
  flushTimer = null;
  if (!userId || buffer.length === 0) return;

  const batch = buffer.splice(0);
  const rows = batch.map((e) => ({ user_id: userId!, ...e }));

  try {
    await supabase.from("app_events").insert(rows);
  } catch {
    // Re-queue on failure (drop if buffer grows too large)
    if (buffer.length < 200) buffer.unshift(...batch);
  }
}

export function initAnalytics() {
  AppState.addEventListener("change", (state) => {
    if (state === "background" || state === "inactive") flush();
  });
}

export function identify(id: string, _properties?: Record<string, any>) {
  userId = id;
}

export function reset() {
  flush();
  userId = null;
}

export function track(event: string, properties: Record<string, any> = {}) {
  if (!userId) return;

  buffer.push({
    event_name: event,
    properties,
    screen: properties.screen,
    session_id: properties.session_id,
    created_at: new Date().toISOString(),
  });

  if (buffer.length >= FLUSH_THRESHOLD) {
    flush();
  } else {
    scheduleFlush();
  }
}

export function screen(name: string, properties: Record<string, any> = {}) {
  track("screen_viewed", { ...properties, screen: name });
}
