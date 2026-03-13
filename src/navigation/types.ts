import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type RootStackParamList = {
  Index: undefined;
  Tabs: { screen: keyof TabsParamList } | undefined;
  Auth: { screen: keyof AuthStackParamList } | undefined;
  Onboarding: undefined;
  sos: undefined;
  "warm-up": undefined;
  "wind-down": undefined;
  paywall: undefined;
  wrapped: undefined;
  "emotional-type": undefined;
  relationships: undefined;
  "evening-reflection": undefined;
  "commitment-response": { echoId: string };
  "life-wheel": undefined;
  "human-score": undefined;
  "human-score-share": undefined;
  "life-blueprint": undefined;
  habits: undefined;
  "voice-chat": undefined;
  privacy: undefined;
  terms: undefined;
};

export type TabsParamList = {
  home: undefined;
  chat: { topic?: string; journalMode?: string } | undefined;
  journal: undefined;
  growth: undefined;
  me: undefined;
};

export type AuthStackParamList = {
  "sign-in": undefined;
  "sign-up": undefined;
  "forgot-password": undefined;
};

export type OnboardingStackParamList = {
  index: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
