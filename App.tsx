import "./global.css";
import { useEffect, useRef, useState } from "react";
import { AppState, Linking, Platform, StatusBar, View, ActivityIndicator, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNavigationContainerRef } from "@react-navigation/native";
import * as Sentry from "@sentry/react-native";
import { useAuthStore } from "@/store/auth";
import { useSubscriptionStore } from "@/store/subscription";
import { useChatStore } from "@/store/chat";
import { registerPushToken, addNotificationResponseListener } from "@/lib/notifications";
import { useNetworkStatus } from "@/lib/offline";
import { initSentry } from "@/lib/sentry";
import { initAnalytics, identify } from "@/lib/analytics";
import RootNavigator from "@/navigation/RootNavigator";
import type { RootStackParamList } from "@/navigation/types";

initSentry();

const navigationRef = createNavigationContainerRef<RootStackParamList>();

if (Platform.OS !== "web") {
  try {
    const SplashScreen = require("expo-splash-screen").default;
    SplashScreen.preventAutoHideAsync?.();
  } catch (_) {}
}

function AppContent() {
  const { initialize, session, user } = useAuthStore();
  const initSubscription = useSubscriptionStore((s) => s.initialize);
  const isConnected = useNetworkStatus();
  const [appReady, setAppReady] = useState(false);
  const appStateRef = useRef(AppState.currentState);
  const backgroundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    initAnalytics();
    initialize().then(() => {
      if (Platform.OS !== "web") {
        try {
          const SplashScreen = require("expo-splash-screen").default;
          SplashScreen.hideAsync?.();
        } catch (_) {}
      }
      setAppReady(true);
    });
  }, [initialize]);

  useEffect(() => {
    if (session) {
      registerPushToken().catch(() => {});
      initSubscription(user?.id).catch(() => {});
      if (user?.id) identify(user.id, { email: user.email });
    }
  }, [session, user?.id, initSubscription]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (appStateRef.current === "active" && nextState.match(/inactive|background/)) {
        backgroundTimerRef.current = setTimeout(() => {
          const { currentSessionId, endSession } = useChatStore.getState();
          if (currentSessionId) {
            endSession().catch(() => {});
          }
        }, 5 * 60 * 1000);
      } else if (nextState === "active" && backgroundTimerRef.current) {
        clearTimeout(backgroundTimerRef.current);
        backgroundTimerRef.current = null;
      }
      appStateRef.current = nextState;
    });
    return () => {
      subscription.remove();
      if (backgroundTimerRef.current) clearTimeout(backgroundTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const sub = addNotificationResponseListener((response: any) => {
      if (!navigationRef.isReady()) return;
      const data = response?.notification?.request?.content?.data;
      if (!data?.type) {
        navigationRef.navigate("Tabs", { screen: "chat" });
        return;
      }
      switch (data.type) {
        case "check_in":
        case "echo_reminder":
        case "ai_reminder":
        case "morning_intention":
        case "habit_reminder":
        case "momentum_celebration":
        case "absence_detection":
          navigationRef.navigate("Tabs", { screen: "home" });
          break;
        case "evening_reflection":
          navigationRef.navigate("evening-reflection");
          break;
        case "commitment_followup":
          if (data.echo_id) {
            navigationRef.navigate("commitment-response", { echoId: data.echo_id });
          } else {
            navigationRef.navigate("Tabs", { screen: "home" });
          }
          break;
        case "habit_milestone":
          navigationRef.navigate("habits");
          break;
        case "pattern_checkin":
        case "goal_deadline":
          navigationRef.navigate("Tabs", { screen: "growth" });
          break;
        case "weekly_summary":
        case "journal_prompt":
          navigationRef.navigate("Tabs", { screen: "journal" });
          break;
        default:
          navigationRef.navigate("Tabs", { screen: "chat" });
      }
    });
    return () => sub?.remove?.();
  }, []);

  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      if (navigationRef.isReady() && url?.includes("life-blueprint")) {
        navigationRef.navigate("life-blueprint");
      }
    };
    const sub = Linking.addEventListener("url", handleUrl);
    Linking.getInitialURL().then((url) => {
      if (navigationRef.isReady() && url?.includes("life-blueprint")) {
        navigationRef.navigate("life-blueprint");
      }
    });
    return () => sub.remove();
  }, []);

  if (!appReady) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0C1120" }}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0C1120" />
      {!isConnected && (
        <View
          style={{
            backgroundColor: "#78350F",
            paddingVertical: 6,
            paddingHorizontal: 16,
            alignItems: "center",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
          }}
          accessibilityLabel="You are offline"
          accessibilityRole="alert"
        >
          <Text style={{ color: "#FDE68A", fontSize: 13, fontWeight: "500" }}>
            You're offline — SOS tools still work
          </Text>
        </View>
      )}
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
      </NavigationContainer>
    </>
  );
}

export default Sentry.wrap(AppContent);
