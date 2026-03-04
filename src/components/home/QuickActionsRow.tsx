import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import VoiceNoteButton from "@/components/voice/VoiceNoteButton";
import { SectionHeader } from "@/components/ui";
import { colors } from "@/constants/theme";

const c = colors.dark;

interface Props {
  onBreathe: () => void;
  onWindDown: () => void;
}

export default function QuickActionsRow({ onBreathe, onWindDown }: Props) {
  return (
    <Animated.View entering={FadeInDown.delay(400).duration(400)}>
      <SectionHeader icon="flash-outline" iconColor={c.text.secondary} label="Quick Actions" />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable
          onPress={onBreathe}
          style={{
            flex: 1,
            backgroundColor: c.bg.surface,
            borderRadius: 16,
            paddingVertical: 20,
            alignItems: "center",
            borderWidth: 1,
            borderColor: c.bg.border,
          }}
          accessibilityLabel="Breathing exercise"
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: `${c.brand.teal}15`,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 8,
            }}
          >
            <Ionicons name="leaf-outline" size={22} color={c.brand.teal} />
          </View>
          <Text style={{ fontSize: 13, color: c.text.secondary, fontWeight: "500" }}>Breathe</Text>
        </Pressable>

        <View
          style={{
            flex: 1,
            backgroundColor: c.bg.surface,
            borderRadius: 16,
            paddingVertical: 20,
            alignItems: "center",
            borderWidth: 1,
            borderColor: c.bg.border,
          }}
        >
          <VoiceNoteButton />
        </View>

        <Pressable
          onPress={onWindDown}
          style={{
            flex: 1,
            backgroundColor: c.bg.surface,
            borderRadius: 16,
            paddingVertical: 20,
            alignItems: "center",
            borderWidth: 1,
            borderColor: c.bg.border,
          }}
          accessibilityLabel="Wind down routine"
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: `${c.brand.purple}15`,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 8,
            }}
          >
            <Ionicons name="moon-outline" size={22} color={c.brand.purpleLight} />
          </View>
          <Text style={{ fontSize: 13, color: c.text.secondary, fontWeight: "500" }}>Wind Down</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}
