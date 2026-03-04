import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";

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
  iconColor = colors.dark.text.secondary,
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
      }}
    >
      <Ionicons name={icon} size={16} color={iconColor} style={{ marginRight: 6 }} />
      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: colors.dark.text.secondary,
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      {count != null && (
        <Text
          style={{
            fontSize: 12,
            color: colors.dark.text.tertiary,
            marginLeft: 8,
          }}
        >
          {count}
        </Text>
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
              color: colors.dark.brand.purpleLight,
            }}
          >
            {action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
