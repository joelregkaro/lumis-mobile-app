import { Tabs, useRouter } from "expo-router";
import { View, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { colors } from "@/constants/theme";
import { hapticLight } from "@/lib/haptics";

const c = colors.dark;

const TAB_ICONS: Record<string, { focused: keyof typeof Ionicons.glyphMap; default: keyof typeof Ionicons.glyphMap }> = {
  home: { focused: "today", default: "today-outline" },
  chat: { focused: "chatbubble-ellipses", default: "chatbubble-ellipses-outline" },
  journal: { focused: "book", default: "book-outline" },
  growth: { focused: "leaf", default: "leaf-outline" },
  me: { focused: "person", default: "person-outline" },
};

const TAB_LABELS: Record<string, string> = {
  home: "Today",
  chat: "Chat",
  journal: "Journal",
  growth: "Growth",
  me: "Me",
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color }) => {
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
                    backgroundColor: c.brand.purple,
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
          backgroundColor: c.bg.primary,
          borderTopColor: c.bg.surface,
          borderTopWidth: 0.5,
          height: Platform.OS === "ios" ? 88 : 64,
          paddingBottom: Platform.OS === "ios" ? 28 : 8,
          paddingTop: 4,
          elevation: 0,
        },
        tabBarActiveTintColor: c.brand.purple,
        tabBarInactiveTintColor: c.text.tertiary,
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
      <Tabs.Screen name="journal" />
      <Tabs.Screen name="growth" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
