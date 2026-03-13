import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import IndexScreen from "@/navigation/IndexScreen";
import TabNavigator from "@/navigation/TabNavigator";
import AuthStack from "@/navigation/AuthStack";
import OnboardingStack from "@/navigation/OnboardingStack";
import SosScreen from "@/app/sos";
import WarmUpScreen from "@/app/warm-up";
import WindDownScreen from "@/app/wind-down";
import PaywallScreen from "@/app/paywall";
import WrappedScreen from "@/app/wrapped";
import EmotionalTypeScreen from "@/app/emotional-type";
import RelationshipsScreen from "@/app/relationships";
import EveningReflectionScreen from "@/app/evening-reflection";
import CommitmentResponseScreen from "@/app/commitment-response";
import LifeWheelScreen from "@/app/life-wheel";
import HumanScoreScreen from "@/app/human-score";
import HumanScoreShareScreen from "@/app/human-score-share";
import LifeBlueprintScreen from "@/app/life-blueprint";
import HabitsScreen from "@/app/habits";
import VoiceChatScreen from "@/app/voice-chat";
import PrivacyScreen from "@/app/privacy";
import TermsScreen from "@/app/terms";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Index"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0C1120" },
        animation: "fade",
      }}
    >
      <Stack.Screen name="Index" component={IndexScreen} />
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen
        name="Auth"
        component={AuthStack}
        options={{ animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="Onboarding"
        component={OnboardingStack}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="sos"
        component={SosScreen}
        options={{ animation: "fade", presentation: "modal", gestureEnabled: true }}
      />
      <Stack.Screen
        name="warm-up"
        component={WarmUpScreen}
        options={{ animation: "slide_from_bottom", presentation: "modal", gestureEnabled: true }}
      />
      <Stack.Screen
        name="wind-down"
        component={WindDownScreen}
        options={{ animation: "fade", presentation: "modal", gestureEnabled: true }}
      />
      <Stack.Screen
        name="paywall"
        component={PaywallScreen}
        options={{ animation: "slide_from_bottom", presentation: "modal", gestureEnabled: true }}
      />
      <Stack.Screen
        name="wrapped"
        component={WrappedScreen}
        options={{ animation: "slide_from_bottom", presentation: "modal", gestureEnabled: true }}
      />
      <Stack.Screen
        name="emotional-type"
        component={EmotionalTypeScreen}
        options={{ animation: "slide_from_bottom", presentation: "modal", gestureEnabled: true }}
      />
      <Stack.Screen
        name="relationships"
        component={RelationshipsScreen}
        options={{ animation: "slide_from_bottom", presentation: "modal", gestureEnabled: true }}
      />
      <Stack.Screen
        name="evening-reflection"
        component={EveningReflectionScreen}
        options={{ animation: "slide_from_bottom", presentation: "modal", gestureEnabled: true }}
      />
      <Stack.Screen
        name="commitment-response"
        component={CommitmentResponseScreen}
        options={{ animation: "slide_from_bottom", presentation: "modal", gestureEnabled: true }}
      />
      <Stack.Screen
        name="life-wheel"
        component={LifeWheelScreen}
        options={{ animation: "slide_from_bottom", presentation: "modal", gestureEnabled: true }}
      />
      <Stack.Screen
        name="human-score"
        component={HumanScoreScreen}
        options={{ animation: "slide_from_bottom", presentation: "modal", gestureEnabled: true }}
      />
      <Stack.Screen
        name="human-score-share"
        component={HumanScoreShareScreen}
        options={{ animation: "slide_from_bottom", presentation: "modal", gestureEnabled: true }}
      />
      <Stack.Screen
        name="life-blueprint"
        component={LifeBlueprintScreen}
        options={{
          animation: "slide_from_bottom",
          presentation: "fullScreenModal",
          gestureEnabled: true,
        }}
      />
      <Stack.Screen name="habits" component={HabitsScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen
        name="voice-chat"
        component={VoiceChatScreen}
        options={{ animation: "slide_from_bottom", presentation: "fullScreenModal" }}
      />
      <Stack.Screen name="privacy" component={PrivacyScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="terms" component={TermsScreen} options={{ animation: "slide_from_right" }} />
    </Stack.Navigator>
  );
}
