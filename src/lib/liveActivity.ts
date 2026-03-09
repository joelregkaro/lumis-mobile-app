export type VoiceSessionActivityProps = {
  companionName: string;
  elapsed: number;
  isMuted: boolean;
  isListening: boolean;
};

export type DailyProgressActivityProps = {
  completedHabits: number;
  totalHabits: number;
  currentStreak: number;
  morningIntentionDone: boolean;
  moodLoggedToday: boolean;
  eveningReflectionDone: boolean;
  companionName: string;
};

export function startVoiceSessionActivity(_props: VoiceSessionActivityProps): void {}
export function updateVoiceSessionActivity(_props: VoiceSessionActivityProps): void {}
export function endVoiceSessionActivity(): void {}
export function startDailyProgressActivity(_props: DailyProgressActivityProps): void {}
export function updateDailyProgressActivity(_props: DailyProgressActivityProps): void {}
export function endDailyProgressActivity(): void {}
export function restoreExistingActivities(): void {}
export function syncDailyProgressFromStores(): void {}
