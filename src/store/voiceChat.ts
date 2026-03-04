import { create } from "zustand";
import { supabase } from "@/lib/supabase";

export interface VoiceTranscriptMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export type VoiceSessionStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "speaking"
  | "error";

interface VoiceChatState {
  status: VoiceSessionStatus;
  sessionId: string | null;
  sessionNumber: number;
  companionName: string;
  transcriptMessages: VoiceTranscriptMessage[];
  elapsed: number;
  isMuted: boolean;
  error: string | null;

  startSession: () => Promise<{ token: string; sessionId: string; systemPrompt: string }>;
  endSession: () => Promise<void>;
  addTranscript: (role: "user" | "assistant", content: string) => void;
  updateLastTranscript: (role: "user" | "assistant", content: string) => void;
  setStatus: (status: VoiceSessionStatus) => void;
  setMuted: (muted: boolean) => void;
  setElapsed: (elapsed: number) => void;
  reset: () => void;
}

export const useVoiceChatStore = create<VoiceChatState>((set, get) => ({
  status: "idle",
  sessionId: null,
  sessionNumber: 1,
  companionName: "Lumis",
  transcriptMessages: [],
  elapsed: 0,
  isMuted: false,
  error: null,

  startSession: async () => {
    set({ status: "connecting", error: null });

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      set({ status: "error", error: "Not authenticated" });
      throw new Error("Not authenticated");
    }

    const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/voice-session-token`;
    console.log("[VoiceStore] Fetching token from:", url);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("[VoiceStore] Token fetch failed:", res.status, errBody);
      set({ status: "error", error: errBody });
      throw new Error(errBody);
    }

    const data = await res.json();
    console.log("[VoiceStore] Token received, sessionId:", data.sessionId);

    set({
      sessionId: data.sessionId,
      sessionNumber: data.sessionNumber,
      companionName: data.companionName ?? "Lumis",
      transcriptMessages: [],
      elapsed: 0,
      status: "connecting",
    });

    return { token: data.token, sessionId: data.sessionId, systemPrompt: data.systemPrompt ?? "" };
  },

  endSession: async () => {
    const { sessionId, transcriptMessages } = get();
    if (!sessionId) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const transcript = transcriptMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/voice-session-end`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ session_id: sessionId, transcript }),
      });
      if (!res.ok) {
        console.error("[VoiceStore] Failed to save session:", res.status);
      }
    } catch (e) {
      console.error("[VoiceStore] Failed to save session:", e);
    }

    set({
      status: "idle",
      sessionId: null,
      transcriptMessages: [],
      elapsed: 0,
      isMuted: false,
      error: null,
    });
  },

  addTranscript: (role, content) => {
    if (!content.trim()) return;
    set((state) => ({
      transcriptMessages: [
        ...state.transcriptMessages,
        { role, content, timestamp: Date.now() },
      ],
    }));
  },

  updateLastTranscript: (role, content) => {
    if (!content.trim()) return;
    set((state) => {
      const msgs = [...state.transcriptMessages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === role) {
          msgs[i] = { ...msgs[i], content: content.trim() };
          return { transcriptMessages: msgs };
        }
      }
      return { transcriptMessages: [...msgs, { role, content: content.trim(), timestamp: Date.now() }] };
    });
  },

  setStatus: (status) => set({ status }),

  setMuted: (isMuted) => set({ isMuted }),

  setElapsed: (elapsed) => set({ elapsed }),

  reset: () =>
    set({
      status: "idle",
      sessionId: null,
      sessionNumber: 1,
      companionName: "Lumis",
      transcriptMessages: [],
      elapsed: 0,
      isMuted: false,
      error: null,
    }),
}));
