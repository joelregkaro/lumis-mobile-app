export interface User {
  id: string;
  email: string;
  display_name: string | null;
  timezone: string;
  preferences: UserPreferences;
  crisis_contact_phone: string | null;
  companion_name: string | null;
  push_token: string | null;
  onboarding_completed_at: string | null;
  current_streak: number;
  longest_streak: number;
  streak_updated_at: string | null;
  streak_freezes_remaining: number;
  referral_code_used: string | null;
  future_self_vision: string | null;
  onboarding_reason: string | null;
  onboarding_archetype: string | null;
  onboarding_dimensions: Record<string, number> | null;
  onboarding_superpower: string | null;
  onboarding_blind_spot: string | null;
  onboarding_commitment_text: string | null;
  guest_mode: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  haptics?: "off" | "subtle" | "full";
  theme?: "dark" | "light" | "system";
  notifications_enabled?: boolean;
  sound_enabled?: boolean;
  onboarding_reason?: string;
  stress_response?: string;
  assessment_results?: Record<string, string>;
}

export interface SessionInsight {
  depth_score: number;
  openness_score: number;
  breakthrough: string | null;
  themes: string[];
}

export interface Session {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  session_type: "chat" | "voice" | "check_in" | "journal";
  session_number: number;
  summary: string | null;
  raw_log: string | null;
  key_themes: string[];
  mood_before: number | null;
  mood_after: number | null;
  techniques_used: string[];
  crisis_flag: boolean;
  token_count: number | null;
  session_insight: SessionInsight | null;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  type: "chat" | "voice" | "journal";
  session_number: number;
  summary: string | null;
  key_themes: string[];
  mood_before: number | null;
  mood_after: number | null;
  mood_shift: number | null;
  insight: { depth_score: number; breakthrough: string | null } | null;
  echoes: { action_item: string; status: string }[];
  duration_minutes: number | null;
  crisis_flag: boolean;
}

export interface JournalSearchResult {
  chunk_text: string;
  session_id: string;
  combined_score: number;
}

export interface Message {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  token_count: number | null;
  crisis_score: number | null;
  created_at: string;
}

export type MemoryCategory =
  | "goal"
  | "trigger"
  | "coping_strategy"
  | "life_event"
  | "relationship"
  | "insight"
  | "preference"
  | "pattern"
  | "value"
  | "strength";

export interface UserMemory {
  id: string;
  user_id: string;
  category: MemoryCategory;
  content: string;
  source_session_id: string | null;
  confidence: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MoodEntry {
  id: string;
  user_id: string;
  mood_score: number;
  energy_level: number | null;
  anxiety_level: number | null;
  sleep_quality: number | null;
  notes: string | null;
  tags: string[];
  logged_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: "active" | "completed" | "paused" | "archived";
  target_date: string | null;
  progress_notes: GoalProgress[];
  created_at: string;
  completed_at: string | null;
}

export interface GoalProgress {
  date: string;
  note: string;
  progress_pct: number;
}

export interface GoalMilestone {
  id: string;
  goal_id: string;
  user_id: string;
  title: string;
  is_completed: boolean;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
}

export interface Pattern {
  id: string;
  user_id: string;
  pattern_type: "mood_trend" | "trigger_correlation" | "improvement" | "recurring_theme";
  description: string;
  evidence: Record<string, unknown> | null;
  detected_at: string;
  acknowledged_by_user: boolean;
}

export interface SessionEcho {
  id: string;
  user_id: string;
  session_id: string;
  action_item: string;
  context: string | null;
  status: "pending" | "checked_in" | "completed" | "skipped";
  check_in_at: string | null;
  committed_for: string | null;
  follow_up_response: string | null;
  outcome: "done" | "partially" | "not_done" | "rescheduled" | null;
  created_at: string;
}

export type LifeDomainType =
  | "health"
  | "career"
  | "relationships"
  | "personal_growth"
  | "rest_recovery"
  | "fun_creativity";

export interface LifeDomain {
  id: string;
  user_id: string;
  domain: LifeDomainType;
  score: number;
  notes: string | null;
  assessed_at: string;
}

export interface DailyCheckin {
  id: string;
  user_id: string;
  checkin_date: string;
  morning_intention: string | null;
  focus_domain: string | null;
  energy_level: number | null;
  evening_reflection: string | null;
  intention_completed: boolean | null;
  wins: string[] | null;
  day_rating: number | null;
  created_at: string;
  updated_at: string;
}

export interface InsightCard {
  id: string;
  user_id: string;
  title: string;
  body: string;
  stat_value: string | null;
  stat_label: string | null;
  card_type: "weekly" | "monthly_wrapped" | "pattern" | "milestone" | "emotional_type" | "weekly_insight";
  is_shareable: boolean;
  shared_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Relationship {
  id: string;
  user_id: string;
  name: string;
  relation_type: string | null;
  notes: string | null;
  sentiment_trend: number | null;
  mentioned_count: number;
  emotional_impact: string | null;
  topics: string[] | null;
  mood_correlation: number | null;
  last_mentioned_at: string | null;
  first_mentioned_at: string;
  updated_at: string;
}

export interface UserMemoryDoc {
  id: string;
  user_id: string;
  content: string;
  version: number;
  updated_at: string;
  created_at: string;
}

export type HabitFrequency = "daily" | "weekdays" | "weekends" | "weekly" | "custom";
export type HabitDifficulty = "tiny" | "small" | "medium" | "full";
export type HabitCueType = "time" | "anchor" | "location" | "emotional";
export type HabitPhase = "new" | "building" | "forming" | "established" | "lapsed";

export interface Habit {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  frequency: HabitFrequency;
  custom_days: number[] | null;
  preferred_time: "morning" | "afternoon" | "evening" | null;
  current_streak: number;
  longest_streak: number;
  total_completions: number;
  source_echo_id: string | null;
  status: "active" | "paused" | "archived";
  anchor_behavior: string | null;
  tiny_version: string | null;
  difficulty: HabitDifficulty;
  cue_type: HabitCueType | null;
  category: string | null;
  identity_statement: string | null;
  celebration: string | null;
  ai_suggestion: boolean;
  lapse_count: number;
  last_lapse_date: string | null;
  streak_freezes_remaining: number;
  streak_freeze_used_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface HabitCompletion {
  id: string;
  habit_id: string;
  user_id: string;
  completed_date: string;
  notes: string | null;
  created_at: string;
}

export interface HabitReflection {
  id: string;
  habit_id: string;
  user_id: string;
  reflection_date: string;
  reflection_type: "completion" | "lapse" | "milestone";
  what_worked: string | null;
  what_blocked: string | null;
  ai_coaching_note: string | null;
  difficulty_at_time: string | null;
  created_at: string;
}
