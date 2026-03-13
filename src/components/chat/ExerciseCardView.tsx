import { Pressable, View, Text } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { hapticLight } from "@/lib/haptics";
import { colors } from "@/constants/theme";
import { track } from "@/lib/analytics";
import type { ExerciseCard } from "@/types/chat";

const c = colors.dark;

const TYPE_META: Record<string, { icon: string; color: string }> = {
  breathing: { icon: "leaf-outline", color: c.brand.teal },
  grounding: { icon: "earth-outline", color: "#A78BFA" },
  reframe: { icon: "swap-horizontal-outline", color: c.brand.gold },
  thought_record: { icon: "document-text-outline", color: c.brand.purple },
  self_compassion: { icon: "heart-outline", color: "#E07373" },
  gratitude: { icon: "sunny-outline", color: "#22C55E" },
  body_scan: { icon: "body-outline", color: c.brand.teal },
  muscle_relaxation: { icon: "fitness-outline", color: "#A78BFA" },
  journal: { icon: "journal-outline", color: c.brand.purpleLight },
  values: { icon: "compass-outline", color: c.brand.gold },
};

interface Props {
  card: ExerciseCard;
}

export default function ExerciseCardView({ card }: Props) {
  const router = useRouter();
  const meta = TYPE_META[card.type] ?? { icon: "fitness-outline", color: c.brand.purple };

  const handlePress = async () => {
    await hapticLight();
    track("exercise_card_tapped", { type: card.type, source: "chat" });
    router.push({
      pathname: "/exercise",
      params: {
        type: card.type,
        title: card.title,
        steps: card.steps ? JSON.stringify(card.steps) : undefined,
      },
    });
  };

  return (
    <Animated.View entering={FadeInDown.delay(100).duration(300)}>
      <Pressable
        onPress={handlePress}
        style={{
          marginTop: 10,
          backgroundColor: `${meta.color}10`,
          borderRadius: 14,
          padding: 14,
          borderWidth: 1,
          borderColor: `${meta.color}30`,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: `${meta.color}20`,
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Ionicons name={meta.icon as any} size={16} color={meta.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: c.text.primary }}>{card.title}</Text>
          </View>
          <Ionicons name="arrow-forward-circle" size={22} color={meta.color} />
        </View>
        <Text style={{ fontSize: 13, color: c.text.secondary, lineHeight: 18 }}>
          {card.description}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
          <Ionicons name="play-circle-outline" size={14} color={meta.color} />
          <Text style={{ fontSize: 12, fontWeight: "600", color: meta.color }}>Try this exercise</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
