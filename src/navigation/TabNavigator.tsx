import { View, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";
import type { TabsParamList } from "@/navigation/types";
import HomeScreen from "@/app/(tabs)/home";
import ChatScreen from "@/app/(tabs)/chat";
import JournalScreen from "@/app/(tabs)/journal";
import GrowthScreen from "@/app/(tabs)/growth";
import MeScreen from "@/app/(tabs)/me";

const Tab = createBottomTabNavigator<TabsParamList>();
const c = colors.dark;

const TAB_ICONS: Record<
  string,
  { focused: keyof typeof Ionicons.glyphMap; default: keyof typeof Ionicons.glyphMap }
> = {
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

export default function TabNavigator() {
  return (
    <Tab.Navigator
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
      <Tab.Screen name="home" component={HomeScreen} />
      <Tab.Screen name="chat" component={ChatScreen} initialParams={undefined} />
      <Tab.Screen name="journal" component={JournalScreen} />
      <Tab.Screen name="growth" component={GrowthScreen} />
      <Tab.Screen name="me" component={MeScreen} />
    </Tab.Navigator>
  );
}
