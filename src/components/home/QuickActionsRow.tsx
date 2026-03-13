import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import VoiceNoteButton from "@/components/voice/VoiceNoteButton";
import { SectionHeader } from "@/components/ui";
import { colors, bento, shadow } from "@/constants/theme";

const c = colors.dark;

interface Props {
  onBreathe: () => void;
  onWindDown: () => void;
}

export default function QuickActionsRow({ onBreathe, onWindDown }: Props) {
  return (
    <Animated.View entering={FadeInDown.delay(400).duration(400)}>
      <SectionHeader icon="flash-outline" iconColor={c.text.secondary} label="Quick Actions" />
      <View style={{ flexDirection: "row", gap: bento.gap }}>
        <Pressable
          onPress={onBreathe}
          style={{
            flex: 1,
            backgroundColor: c.bg.surface,
            borderRadius: bento.radiusSm,
            paddingVertical: 20,
            alignItems: "center",
            borderWidth: 1,
            borderColor: c.glass.border,
            ...shadow.card,
          }}
          accessibilityLabel="Breathing exercise"
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: bento.radiusSm,
              backgroundColor: `${c.brand.teal}15`,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 8,
            }}
          >
            <Ionicons name="leaf-outline" size={22} color={c.brand.teal} />
          </View>
          <Text style={{ fontSize: 13, color: c.text.secondaryLight, fontWeight: "500" }}>Breathe</Text>
        </Pressable>

        <View
          style={{
            flex: 1,
            backgroundColor: c.bg.surface,
            borderRadius: bento.radiusSm,
            paddingVertical: 20,
            alignItems: "center",
            borderWidth: 1,
            borderColor: c.glass.border,
            ...shadow.card,
          }}
        >
          <VoiceNoteButton />
        </View>

        <Pressable
          onPress={onWindDown}
          style={{
            flex: 1,
            backgroundColor: c.bg.surface,
            borderRadius: bento.radiusSm,
            paddingVertical: 20,
            alignItems: "center",
            borderWidth: 1,
            borderColor: c.glass.border,
            ...shadow.card,
          }}
          accessibilityLabel="Wind down routine"
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: bento.radiusSm,
              backgroundColor: `${c.brand.purple}15`,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 8,
            }}
          >
            <Ionicons name="moon-outline" size={22} color={c.brand.purpleLight} />
          </View>
          <Text style={{ fontSize: 13, color: c.text.secondaryLight, fontWeight: "500" }}>Wind Down</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}
