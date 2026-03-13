import { useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "@/store/auth";

export default function IndexScreen() {
  const navigation = useNavigation();
  const { session, isLoading, isOnboarded } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;
    if (!session) {
      navigation.reset({ index: 0, routes: [{ name: "Auth" as never }] });
      return;
    }
    if (!isOnboarded) {
      navigation.reset({ index: 0, routes: [{ name: "Onboarding" as never }] });
      return;
    }
    navigation.reset({ index: 0, routes: [{ name: "Tabs" as never }] });
  }, [isLoading, session, isOnboarded, navigation]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0C1120" }}>
      <ActivityIndicator size="large" color="#7C3AED" />
      <Text style={{ color: "#8B92A8", fontSize: 16, marginTop: 16 }}>Lumis</Text>
    </View>
  );
}
