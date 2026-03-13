export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  created_at?: string;
  isStreaming?: boolean;
  crisisScore?: number;
  quickReplies?: string[];
  exerciseCard?: ExerciseCard;
  error?: boolean;
}

export interface ExerciseCard {
  type: "breathing" | "grounding" | "reframe" | "journal" | "thought_record" | "body_scan" | "muscle_relaxation" | "gratitude" | "self_compassion" | "values";
  title: string;
  description: string;
  steps?: string[];
}

export interface StreamChunk {
  type: "text_delta" | "message_start" | "message_stop" | "error";
  text?: string;
  messageId?: string;
  error?: string;
}

export type SOSMode = "panic" | "overwhelm" | "distress";

export interface SOSConfig {
  mode: SOSMode;
  title: string;
  subtitle: string;
  color: string;
  technique: string;
}

export const SOS_CONFIGS: Record<SOSMode, SOSConfig> = {
  panic: {
    mode: "panic",
    title: "You're safe",
    subtitle: "Let's breathe together",
    color: "#2DD4BF",
    technique: "breathing",
  },
  overwhelm: {
    mode: "overwhelm",
    title: "One thing at a time",
    subtitle: "Let's slow everything down",
    color: "#A78BFA",
    technique: "grounding",
  },
  distress: {
    mode: "distress",
    title: "I'm here with you",
    subtitle: "You don't have to do this alone",
    color: "#7C3AED",
    technique: "presence",
  },
};
