import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { hapticLight } from "@/lib/haptics";
import type { ExerciseCard } from "@/types/chat";

const TYPE_CONFIG: Record<ExerciseCard["type"], { icon: string; color: string; bgColor: string }> = {
  breathing: { icon: "🫁", color: "#2DD4BF", bgColor: "rgba(45,212,191,0.12)" },
  grounding: { icon: "🌿", color: "#A78BFA", bgColor: "rgba(167,139,250,0.12)" },
  reframe: { icon: "🔄", color: "#F59E0B", bgColor: "rgba(245,158,11,0.12)" },
  journal: { icon: "📝", color: "#7DD3C0", bgColor: "rgba(125,211,192,0.12)" },
};

interface Props {
  card: ExerciseCard;
}

export default function ExerciseCardView({ card }: Props) {
  const navigation = useNavigation();
  const [expanded, setExpanded] = useState(false);
  const config = TYPE_CONFIG[card.type];

  const handleTryIt = async () => {
    await hapticLight();
    if (card.type === "breathing" || card.type === "grounding") {
      navigation.navigate("sos" as never);
    }
  };

  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <Pressable
        onPress={() => {
          setExpanded(!expanded);
          hapticLight();
        }}
        style={{ backgroundColor: config.bgColor, borderColor: config.color, borderWidth: 1 }}
        className="mt-sm rounded-xl p-md"
      >
        <View className="flex-row items-center">
          <Text className="mr-sm text-lg">{config.icon}</Text>
          <View className="flex-1">
            <Text className="text-body font-inter-semibold" style={{ color: config.color }}>
              {card.title}
            </Text>
            <Text className="mt-xs text-small text-text-secondary">{card.description}</Text>
          </View>
          {card.steps && card.steps.length > 0 && (
            <Text className="text-text-tertiary">{expanded ? "▲" : "▼"}</Text>
          )}
        </View>

        {expanded && card.steps && card.steps.length > 0 && (
          <Animated.View entering={FadeInDown.duration(200)} className="mt-sm border-t pt-sm" style={{ borderColor: `${config.color}30` }}>
            {card.steps.map((step, i) => (
              <View key={i} className="mb-xs flex-row">
                <Text className="mr-sm text-small" style={{ color: config.color }}>{i + 1}.</Text>
                <Text className="flex-1 text-small text-text-primary">{step}</Text>
              </View>
            ))}

            {(card.type === "breathing" || card.type === "grounding") && (
              <Pressable
                onPress={handleTryIt}
                className="mt-sm items-center rounded-lg py-2"
                style={{ backgroundColor: `${config.color}20` }}
              >
                <Text className="text-small font-inter-semibold" style={{ color: config.color }}>
                  Try it now →
                </Text>
              </Pressable>
            )}
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
}
