import { View, Text, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { hapticLight } from "@/lib/haptics";
import { colors } from "@/constants/theme";

const c = colors.dark;

const TIERS = [
  { label: "Struggling", value: 1, color: "#F87171" },
  { label: "Okay", value: 2, color: "#FBBF24" },
  { label: "Thriving", value: 3, color: "#2DD4BF" },
] as const;

export interface DomainRating {
  domain: string;
  label: string;
  icon: string;
  color: string;
  value: number;
}

interface Props {
  domains: DomainRating[];
  onUpdate: (domain: string, value: number) => void;
}

export default function DomainQuickRate({ domains, onUpdate }: Props) {
  return (
    <View>
      <Animated.Text
        entering={FadeInDown.duration(300)}
        style={{ fontSize: 24, fontWeight: "700", color: c.text.primary, marginBottom: 6 }}
      >
        Rate your life right now
      </Animated.Text>
      <Animated.Text
        entering={FadeInDown.delay(100).duration(300)}
        style={{ fontSize: 15, color: c.text.secondary, marginBottom: 24, lineHeight: 22 }}
      >
        Quick gut check — no overthinking.
      </Animated.Text>
      {domains.map((d, i) => (
        <Animated.View
          key={d.domain}
          entering={FadeInDown.delay(150 + i * 60).duration(300)}
          style={{ marginBottom: 16 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Ionicons name={d.icon as any} size={16} color={d.color} style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 14, fontWeight: "600", color: c.text.primary }}>{d.label}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {TIERS.map((tier) => {
              const isSelected = d.value === tier.value;
              return (
                <Pressable
                  key={tier.value}
                  onPress={async () => {
                    await hapticLight();
                    onUpdate(d.domain, tier.value);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    alignItems: "center",
                    backgroundColor: isSelected ? `${tier.color}20` : c.bg.surface,
                    borderWidth: 1.5,
                    borderColor: isSelected ? `${tier.color}60` : c.bg.border,
                  }}
                >
                  <Text style={{
                    fontSize: 13,
                    fontWeight: isSelected ? "700" : "500",
                    color: isSelected ? tier.color : c.text.tertiary,
                  }}>
                    {tier.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      ))}
    </View>
  );
}
