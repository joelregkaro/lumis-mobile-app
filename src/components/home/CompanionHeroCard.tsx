import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import HeroDroplet, { type CompanionExpression, type EvolutionTier } from "@/components/companion/HeroDroplet";
import { colors, bento, shadow } from "@/constants/theme";

const c = colors.dark;

interface Props {
  companionName: string;
  companionMessage: string;
  companionExpression: CompanionExpression;
  companionTier: EvolutionTier;
  isPro: boolean;
  onChat: () => void;
  onVoice: () => void;
}

export default function CompanionHeroCard({
  companionName,
  companionMessage,
  companionExpression,
  companionTier,
  isPro,
  onChat,
  onVoice,
}: Props) {
  return (
    <Animated.View entering={FadeInDown.duration(500)} style={{ marginBottom: 24 }}>
      <Pressable
        onPress={onChat}
        style={{
          backgroundColor: "transparent",
          borderRadius: bento.radius,
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 20,
          alignItems: "center",
          borderWidth: 0,
        }}
        accessibilityLabel={`Start a conversation with ${companionName}`}
        accessibilityRole="button"
      >
        <HeroDroplet
          expression={companionExpression}
          size="large"
          tier={companionTier}
          showTier
        />
        <Text
          style={{
            fontSize: 11,
            fontWeight: "700",
            color: c.text.secondary,
            letterSpacing: 2,
            textTransform: "uppercase",
            marginTop: 16,
          }}
        >
          {companionName}
        </Text>
        <Text
          style={{
            fontSize: 17,
            color: c.text.primary,
            textAlign: "center",
            marginTop: 10,
            lineHeight: 26,
            fontWeight: "500",
          }}
        >
          {companionMessage}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 24,
            backgroundColor: c.brand.purple,
            paddingHorizontal: 28,
            paddingVertical: 14,
            borderRadius: bento.radiusSm,
            ...shadow.hero,
          }}
        >
          <Ionicons name="chatbubble-outline" size={16} color="white" style={{ marginRight: 8 }} />
          <Text style={{ fontSize: 16, fontWeight: "600", color: "white" }}>
            Talk to {companionName}
          </Text>
        </View>
      </Pressable>
      <Pressable
        onPress={onVoice}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 10,
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: bento.radiusSm,
          backgroundColor: c.bg.surface,
          borderWidth: 1,
          borderColor: c.glass.border,
        }}
        accessibilityLabel={`Start a voice session with ${companionName}`}
        accessibilityRole="button"
      >
        <Ionicons name="mic-outline" size={16} color={c.brand.purpleLight} style={{ marginRight: 8 }} />
        <Text style={{ fontSize: 14, fontWeight: "500", color: c.brand.purpleLight }}>Voice Session</Text>
        {!isPro && (
          <View
            style={{
              marginLeft: 8,
              backgroundColor: `${c.brand.purple}20`,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: "700", color: c.brand.purpleLight, letterSpacing: 0.5 }}>PRO</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}
