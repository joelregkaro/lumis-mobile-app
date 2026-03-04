import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { colors } from "@/constants/theme";

const c = colors.dark;

interface Props {
  streak: number;
  humanScore: number | null;
  archetype: string;
  level: number;
  moodTrend: { text: string; color: string; icon: "trending-up" | "trending-down" | "remove-outline" } | null;
  onHumanScore: () => void;
  onGrowth: () => void;
}

export default function ProgressSnapshot({
  streak,
  humanScore,
  archetype,
  level,
  moodTrend,
  onHumanScore,
  onGrowth,
}: Props) {
  return (
    <Animated.View
      entering={FadeInDown.delay(200).duration(400)}
      style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}
    >
      {/* Streak */}
      <Pressable
        onPress={onGrowth}
        style={{
          flex: 1,
          backgroundColor: c.bg.surface,
          borderRadius: 16,
          padding: 14,
          alignItems: "center",
          borderWidth: 1,
          borderColor: streak >= 7 ? `${c.brand.gold}40` : c.bg.border,
        }}
      >
        <Ionicons
          name="flame"
          size={20}
          color={streak >= 7 ? c.brand.gold : c.status.crisis}
        />
        <Text style={{ fontSize: 20, fontWeight: "800", color: c.text.primary, marginTop: 4 }}>
          {streak}
        </Text>
        <Text style={{ fontSize: 11, color: c.text.tertiary, fontWeight: "500" }}>streak</Text>
      </Pressable>

      {/* Human Score */}
      <Pressable
        onPress={onHumanScore}
        style={{
          flex: 1,
          backgroundColor: c.bg.surface,
          borderRadius: 16,
          padding: 14,
          alignItems: "center",
          borderWidth: 1,
          borderColor: `${c.brand.purple}30`,
        }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: c.brand.purple,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: "800", color: c.text.primary }}>
            {humanScore ?? "?"}
          </Text>
        </View>
        <Text style={{ fontSize: 12, fontWeight: "600", color: c.brand.purpleLight, marginTop: 4 }}>
          {humanScore ? archetype : "Discover"}
        </Text>
        <Text style={{ fontSize: 11, color: c.text.tertiary, fontWeight: "500" }}>score</Text>
      </Pressable>

      {/* Mood Trend */}
      <Pressable
        onPress={onGrowth}
        style={{
          flex: 1,
          backgroundColor: c.bg.surface,
          borderRadius: 16,
          padding: 14,
          alignItems: "center",
          borderWidth: 1,
          borderColor: c.bg.border,
        }}
      >
        <Ionicons
          name={moodTrend?.icon ?? "pulse-outline"}
          size={20}
          color={moodTrend?.color ?? c.text.tertiary}
        />
        <Text style={{ fontSize: 12, fontWeight: "600", color: moodTrend?.color ?? c.text.tertiary, marginTop: 4 }}>
          {moodTrend
            ? moodTrend.icon === "trending-up"
              ? "Up"
              : moodTrend.icon === "trending-down"
                ? "Down"
                : "Steady"
            : "—"}
        </Text>
        <Text style={{ fontSize: 11, color: c.text.tertiary, fontWeight: "500" }}>mood</Text>
      </Pressable>
    </Animated.View>
  );
}
