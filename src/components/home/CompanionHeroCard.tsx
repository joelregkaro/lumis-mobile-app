import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import CompanionAvatar, { type CompanionExpression, type EvolutionTier } from "@/components/companion/CompanionAvatar";
import { colors } from "@/constants/theme";

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
          backgroundColor: c.bg.surface,
          borderRadius: 24,
          padding: 28,
          alignItems: "center",
          borderWidth: 1,
          borderColor: `${c.brand.purple}20`,
        }}
        accessibilityLabel={`Start a conversation with ${companionName}`}
        accessibilityRole="button"
      >
        <CompanionAvatar
          expression={companionExpression}
          size="large"
          tier={companionTier}
          showTier
        />
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: c.text.secondary,
            letterSpacing: 0.5,
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
            borderRadius: 28,
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
          borderRadius: 28,
          borderWidth: 1,
          borderColor: `${c.brand.purple}40`,
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
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: "600", color: c.brand.purpleLight }}>PRO</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}
