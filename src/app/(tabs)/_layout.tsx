import { Tabs } from "expo-router";
import { View, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";

const TAB_ICONS: Record<string, { focused: keyof typeof Ionicons.glyphMap; default: keyof typeof Ionicons.glyphMap }> = {
  home: { focused: "home", default: "home-outline" },
  chat: { focused: "chatbubble-ellipses", default: "chatbubble-ellipses-outline" },
  growth: { focused: "stats-chart", default: "stats-chart-outline" },
  me: { focused: "person", default: "person-outline" },
};

const TAB_LABELS: Record<string, string> = {
  home: "Home",
  chat: "Talk",
  growth: "Progress",
  me: "Profile",
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name] ?? TAB_ICONS.home;
          return (
            <View style={{ alignItems: "center", paddingTop: 4 }}>
              {focused && (
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    width: 24,
                    height: 3,
                    borderRadius: 2,
                    backgroundColor: colors.dark.brand.purple,
                  }}
                />
              )}
              <Ionicons
                name={focused ? icons.focused : icons.default}
                size={22}
                color={color}
                style={{ marginTop: 4 }}
              />
            </View>
          );
        },
        tabBarLabel: TAB_LABELS[route.name] ?? route.name,
        tabBarStyle: {
          backgroundColor: "#0D0D12",
          borderTopColor: "#1E1E27",
          borderTopWidth: 0.5,
          height: Platform.OS === "ios" ? 88 : 64,
          paddingBottom: Platform.OS === "ios" ? 28 : 8,
          paddingTop: 4,
          elevation: 0,
        },
        tabBarActiveTintColor: colors.dark.brand.purple,
        tabBarInactiveTintColor: "#71717A",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
          marginTop: 2,
        },
        tabBarHideOnKeyboard: true,
      })}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="growth" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
