import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";

const c = colors.dark;

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  label: string;
  action?: { label: string; onPress: () => void };
  rightElement?: React.ReactNode;
  count?: string;
}

export default function SectionHeader({
  icon,
  iconColor = c.text.secondary,
  label,
  action,
  rightElement,
  count,
}: Props) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
        paddingVertical: 4,
      }}
    >
      <Ionicons name={icon} size={14} color={iconColor} style={{ marginRight: 6 }} />
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          color: c.text.secondary,
          letterSpacing: 1.5,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      {count != null && (
        <View style={{
          marginLeft: 8,
          backgroundColor: c.bg.elevated,
          borderRadius: 10,
          paddingHorizontal: 8,
          paddingVertical: 2,
        }}>
          <Text style={{ fontSize: 11, color: c.text.secondaryLight, fontWeight: "600" }}>
            {count}
          </Text>
        </View>
      )}
      {rightElement && <View style={{ marginLeft: "auto" }}>{rightElement}</View>}
      {action && (
        <Pressable
          onPress={action.onPress}
          style={{ marginLeft: "auto" }}
          hitSlop={8}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "500",
              color: c.brand.purpleLight,
            }}
          >
            {action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
