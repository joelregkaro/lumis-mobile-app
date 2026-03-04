import "../../global.css";
import { useEffect, useRef } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppState, Platform, View, ActivityIndicator, Text } from "react-native";
import { useAuthStore } from "@/store/auth";
import { useSubscriptionStore } from "@/store/subscription";
import { useChatStore } from "@/store/chat";
import { registerPushToken, addNotificationResponseListener } from "@/lib/notifications";
import { useNetworkStatus } from "@/lib/offline";

if (Platform.OS !== "web") {
  const SplashScreen = require("expo-splash-screen");
  SplashScreen.preventAutoHideAsync();
}

export default function RootLayout() {
  const { isLoading, initialize, session, user } = useAuthStore();
  const initSubscription = useSubscriptionStore((s) => s.initialize);
  const isConnected = useNetworkStatus();
  const router = useRouter();

  useEffect(() => {
    initialize().then(() => {
      if (Platform.OS !== "web") {
        const SplashScreen = require("expo-splash-screen");
        SplashScreen.hideAsync();
      }
    });
  }, []);

  useEffect(() => {
    if (session) {
      registerPushToken().catch(() => {});
      initSubscription(user?.id).catch(() => {});
    }
  }, [session]);

  // Process active chat session when app goes to background (5-min grace period)
  const appStateRef = useRef(AppState.currentState);
  const backgroundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      const data = response?.notification?.request?.content?.data;
      if (!data?.type) {
        router.push("/(tabs)/chat");
        return;
      }

      switch (data.type) {
        case "check_in":
        case "echo_reminder":
        case "ai_reminder":
          router.push("/(tabs)/home");
          break;
        case "morning_intention":
          router.push("/(tabs)/home");
          break;
        case "evening_reflection":
          router.push("/evening-reflection");
          break;
        case "commitment_followup":
          if (data.echo_id) {
            router.push({ pathname: "/commitment-response", params: { echoId: data.echo_id } });
          } else {
            router.push("/(tabs)/home");
          }
          break;
        case "habit_reminder":
        case "momentum_celebration":
        case "absence_detection":
          router.push("/(tabs)/home");
          break;
        case "pattern_checkin":
        case "goal_deadline":
          router.push("/(tabs)/growth");
          break;
        default:
          router.push("/(tabs)/chat");
      }
    });
    return () => sub?.remove?.();
  }, [router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0C1120" }}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={{ color: "#8B92A8", marginTop: 16, fontSize: 16 }}>Loading Lumis...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
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
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#0C1120" },
          animation: "fade",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="(onboarding)" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="sos" options={{ animation: "fade", presentation: "modal", gestureEnabled: true }} />
        <Stack.Screen name="warm-up" options={{ animation: "slide_from_bottom", presentation: "modal", gestureEnabled: true }} />
        <Stack.Screen name="wind-down" options={{ animation: "fade", presentation: "modal", gestureEnabled: true }} />
        <Stack.Screen name="paywall" options={{ animation: "slide_from_bottom", presentation: "modal", gestureEnabled: true }} />
        <Stack.Screen name="wrapped" options={{ animation: "slide_from_bottom", presentation: "modal", gestureEnabled: true }} />
        <Stack.Screen name="emotional-type" options={{ animation: "slide_from_bottom", presentation: "modal", gestureEnabled: true }} />
        <Stack.Screen name="relationships" options={{ animation: "slide_from_bottom", presentation: "modal", gestureEnabled: true }} />
        <Stack.Screen name="evening-reflection" options={{ animation: "slide_from_bottom", presentation: "modal", gestureEnabled: true }} />
        <Stack.Screen name="commitment-response" options={{ animation: "slide_from_bottom", presentation: "modal", gestureEnabled: true }} />
        <Stack.Screen name="life-wheel" options={{ animation: "slide_from_bottom", presentation: "modal", gestureEnabled: true }} />
        <Stack.Screen name="voice-chat" options={{ animation: "slide_from_bottom", presentation: "fullScreenModal" }} />
      </Stack>
    </>
  );
}
