import { View, Text, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { useAuthStore } from "@/store/auth";

export default function IndexRedirect() {
  const { session, isLoading, isOnboarded } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0C1120" }}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={{ color: "#8B92A8", fontSize: 16, marginTop: 16 }}>Lumis</Text>
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!isOnboarded) {
    return <Redirect href="/(onboarding)" />;
  }

  return <Redirect href="/(tabs)/home" />;
}
