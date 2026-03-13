import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { colors, bento, shadow } from "@/constants/theme";

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
      style={{ flexDirection: "row", gap: bento.gap, marginBottom: 24 }}
    >
      <Pressable
        onPress={onGrowth}
        style={{
          flex: 1,
          backgroundColor: c.bg.surface,
          borderRadius: bento.radiusSm,
          padding: bento.padding,
          alignItems: "center",
          borderWidth: 1,
          borderColor: streak >= 7 ? `${c.brand.gold}40` : c.glass.border,
          ...shadow.card,
        }}
      >
        <Ionicons
          name="flame"
          size={20}
          color={streak >= 7 ? c.brand.gold : c.status.crisis}
        />
        <Text style={{ fontSize: 22, fontWeight: "800", color: c.text.primary, marginTop: 6, letterSpacing: -0.5 }}>
          {streak}
        </Text>
        <Text style={{ fontSize: 10, color: c.text.tertiary, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>streak</Text>
      </Pressable>

      <Pressable
        onPress={onHumanScore}
        style={{
          flex: 1,
          backgroundColor: c.bg.surface,
          borderRadius: bento.radiusSm,
          padding: bento.padding,
          alignItems: "center",
          borderWidth: 1,
          borderColor: c.glass.border,
          ...shadow.card,
        }}
      >
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            borderWidth: 2.5,
            borderColor: c.brand.purple,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: "800", color: c.text.primary }}>
            {humanScore ?? "?"}
          </Text>
        </View>
        <Text style={{ fontSize: 12, fontWeight: "600", color: c.brand.purpleLight, marginTop: 6 }}>
          {humanScore ? archetype : "Discover"}
        </Text>
        <Text style={{ fontSize: 10, color: c.text.tertiary, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>score</Text>
      </Pressable>

      <Pressable
        onPress={onGrowth}
        style={{
          flex: 1,
          backgroundColor: c.bg.surface,
          borderRadius: bento.radiusSm,
          padding: bento.padding,
          alignItems: "center",
          borderWidth: 1,
          borderColor: c.glass.border,
          ...shadow.card,
        }}
      >
        <Ionicons
          name={moodTrend?.icon ?? "pulse-outline"}
          size={20}
          color={moodTrend?.color ?? c.text.tertiary}
        />
        <Text style={{ fontSize: 12, fontWeight: "600", color: moodTrend?.color ?? c.text.tertiary, marginTop: 6 }}>
          {moodTrend
            ? moodTrend.icon === "trending-up"
              ? "Up"
              : moodTrend.icon === "trending-down"
                ? "Down"
                : "Steady"
            : "—"}
        </Text>
        <Text style={{ fontSize: 10, color: c.text.tertiary, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>mood</Text>
      </Pressable>
    </Animated.View>
  );
}
