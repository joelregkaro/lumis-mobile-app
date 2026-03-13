import { Tabs } from "expo-router";
import { View, Text, Pressable, Platform, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";
import { hapticLight } from "@/lib/haptics";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

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

function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomPadding }]}>
      <View style={styles.pill}>
        {Platform.OS === "ios" ? (
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill}>
            <View style={[StyleSheet.absoluteFill, styles.blurOverlay]} />
          </BlurView>
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.androidFallback]} />
        )}

        <View style={styles.tabRow}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const icons = TAB_ICONS[route.name] ?? TAB_ICONS.home;
            const label = TAB_LABELS[route.name] ?? route.name;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                hapticLight();
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({ type: "tabLongPress", target: route.key });
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                onLongPress={onLongPress}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={label}
                style={styles.tab}
              >
                <View style={styles.iconContainer}>
                  {isFocused && <View style={styles.activeGlow} />}
                  <Ionicons
                    name={isFocused ? icons.focused : icons.default}
                    size={22}
                    color={isFocused ? c.brand.purpleLight : c.tab.inactive}
                  />
                </View>
                <Text
                  style={[
                    styles.label,
                    { color: isFocused ? c.brand.purpleLight : c.tab.inactive },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const PILL_RADIUS = 28;

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  pill: {
    width: "100%",
    borderRadius: PILL_RADIUS,
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.18)",
    overflow: "hidden",
  },
  blurOverlay: {
    backgroundColor: "rgba(14, 12, 36, 0.55)",
  },
  androidFallback: {
    backgroundColor: "rgba(14, 12, 36, 0.85)",
    borderRadius: PILL_RADIUS,
  },
  tabRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 10,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  activeGlow: {
    position: "absolute",
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(167, 139, 250, 0.25)",
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 1,
    letterSpacing: 0.3,
  },
});

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="journal" />
      <Tabs.Screen name="growth" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
