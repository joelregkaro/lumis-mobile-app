import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { OnboardingStackParamList } from "@/navigation/types";
import OnboardingIndexScreen from "@/app/(onboarding)/index";

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        contentStyle: { backgroundColor: "#0C1120" },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" component={OnboardingIndexScreen} />
    </Stack.Navigator>
  );
}
