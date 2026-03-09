import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { withRetry } from "@/lib/retry";
import { isOnline } from "@/lib/offline";
import { track } from "@/lib/analytics";
import type { ChatMessage, SOSMode } from "@/types/chat";

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const FREE_SESSION_LIMIT = 3;

export interface CompletedSessionSummary {
  sessionNumber: number;
  summary: string | null;
  keyThemes: string[];
  moodBefore: number | null;
  echoes: { action_item: string }[];
}

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  currentSessionId: string | null;
  sessionNumber: number;
  sosMode: SOSMode | null;
  completedSession: CompletedSessionSummary | null;
  showPaywall: boolean;

  sendMessage: (content: string, options?: { sessionType?: "journal" }) => Promise<void>;
  startNewSession: () => Promise<void>;
  loadLatestSession: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  endSession: () => Promise<void>;
  setSosMode: (mode: SOSMode | null) => void;
  appendStreamChunk: (text: string) => void;
  clearMessages: () => void;
  dismissCoolDown: () => void;
  dismissPaywall: () => void;
  shouldShowPaywall: (isPro: boolean) => boolean;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isStreaming: false,
  currentSessionId: null,
  sessionNumber: 1,
  sosMode: null,
  completedSession: null,
  showPaywall: false,

  sendMessage: async (content: string, options?: { sessionType?: "journal" }) => {
    const connected = await isOnline();
    if (!connected) {
      const offlineMsg: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: "user",
        content,
        timestamp: Date.now(),
      };
      const offlineReply: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: "assistant",
        content: "You're currently offline. Your message will be sent when you reconnect. In the meantime, SOS tools are always available.",
        timestamp: Date.now() + 1,
      };
      set((state) => ({
        messages: [...state.messages, offlineMsg, offlineReply],
      }));
      return;
    }

    const { currentSessionId, messages } = get();

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content,
      timestamp: Date.now(),
    };

    const assistantPlaceholder: ChatMessage = {
      id: `msg_${Date.now() + 1}`,
      role: "assistant",
      content: "",
      timestamp: Date.now() + 1,
      isStreaming: true,
    };

    set({
      messages: [...messages, userMessage, assistantPlaceholder],
      isStreaming: true,
    });

    try {
      const response = await withRetry(async () => {
        const res = await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            },
            body: JSON.stringify({
              message: content,
              session_id: currentSessionId,
              ...(options?.sessionType && !currentSessionId
                ? { session_type: options.sessionType }
                : {}),
            }),
          },
        );
        if (!res.ok) throw new Error("Chat request failed");
        return res;
      }, 2);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "text_delta" && parsed.text) {
              fullText += parsed.text;
              get().appendStreamChunk(fullText);
            }
            if (parsed.type === "session_id") {
              set({ currentSessionId: parsed.session_id });
            }
            if (parsed.type === "session_number") {
              set({ sessionNumber: parsed.session_number });
            }
            if (parsed.type === "quick_replies") {
              set((state) => {
                const msgs = [...state.messages];
                const last = msgs[msgs.length - 1];
                if (last?.role === "assistant") {
                  msgs[msgs.length - 1] = { ...last, quickReplies: parsed.replies };
                }
                return { messages: msgs };
              });
            }
            if (parsed.type === "exercise_card" && parsed.card) {
              set((state) => {
                const msgs = [...state.messages];
                const last = msgs[msgs.length - 1];
                if (last?.role === "assistant") {
                  msgs[msgs.length - 1] = { ...last, exerciseCard: parsed.card };
                }
                return { messages: msgs };
              });
            }
          } catch {
            // Skip malformed SSE chunks
          }
        }
      }

      set((state) => {
        const msgs = [...state.messages];
        const last = msgs[msgs.length - 1];
        if (last?.role === "assistant") {
          msgs[msgs.length - 1] = { ...last, content: fullText, isStreaming: false };
        }
        return { messages: msgs, isStreaming: false };
      });

      track("message_sent", { session_number: get().sessionNumber, message_length: content.length, session_id: get().currentSessionId ?? undefined });
    } catch (error) {
      set((state) => {
        const msgs = state.messages.filter((m) => m.id !== assistantPlaceholder.id);
        return { messages: msgs, isStreaming: false };
      });
      throw error;
    }
  },

  startNewSession: async () => {
    const { currentSessionId } = get();
    if (currentSessionId) {
      get().endSession().catch(() => {});
    }
    track("chat_session_started", { session_number: get().sessionNumber + 1 });
    set({ messages: [], currentSessionId: null, isStreaming: false });
  },

  loadLatestSession: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: latest } = await supabase
      .from("sessions")
      .select("id, session_number, started_at, ended_at")
      .eq("user_id", user.id)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .single();

    if (latest) {
      const sessionAge = Date.now() - new Date(latest.started_at).getTime();
      if (sessionAge < FOUR_HOURS_MS) {
        await get().loadSession(latest.id);
        set({ sessionNumber: latest.session_number });
        return;
      }
      // Session is stale — trigger post-session processing
      try {
        const authSession = await supabase.auth.getSession();
        const token = authSession.data.session?.access_token;
        await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/process-session`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ session_id: latest.id }),
          },
        );

        // Load the processed session summary for the cool-down card
        const { data: processed } = await supabase
          .from("sessions")
          .select("session_number, summary, key_themes, mood_before")
          .eq("id", latest.id)
          .single();

        const { data: echoes } = await supabase
          .from("session_echoes")
          .select("action_item")
          .eq("session_id", latest.id)
          .eq("status", "pending");

        if (processed) {
          set({
            completedSession: {
              sessionNumber: processed.session_number ?? latest.session_number,
              summary: processed.summary,
              keyThemes: processed.key_themes ?? [],
              moodBefore: processed.mood_before,
              echoes: echoes ?? [],
            },
          });
        }
      } catch { /* fire-and-forget */ }
    }

    set({ messages: [], currentSessionId: null });
  },

  endSession: async () => {
    const { currentSessionId } = get();
    if (!currentSessionId) return;

    try {
      const session = await supabase.auth.getSession();
      await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/process-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data.session?.access_token}`,
          },
          body: JSON.stringify({ session_id: currentSessionId }),
        },
      );
    } catch { /* fire-and-forget */ }

    track("session_ended", { session_number: get().sessionNumber, message_count: get().messages.length, session_id: currentSessionId });
    set({ currentSessionId: null });
  },

  loadSession: async (sessionId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (data) {
      const messages: ChatMessage[] = data
        .filter((m) => m.role !== "system")
        .map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: new Date(m.created_at).getTime(),
          crisisScore: m.crisis_score ?? undefined,
        }));
      set({ messages, currentSessionId: sessionId });
    }
  },

  setSosMode: (mode) => set({ sosMode: mode }),

  appendStreamChunk: (fullText: string) => {
    set((state) => {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last?.role === "assistant" && last.isStreaming) {
        msgs[msgs.length - 1] = { ...last, content: fullText };
      }
      return { messages: msgs };
    });
  },

  clearMessages: () => set({ messages: [], currentSessionId: null }),

  dismissCoolDown: () => set({ completedSession: null }),

  dismissPaywall: () => set({ showPaywall: false }),

  shouldShowPaywall: (isPro: boolean) => {
    if (isPro) return false;
    const { sessionNumber } = get();
    return sessionNumber > FREE_SESSION_LIMIT;
  },
}));
