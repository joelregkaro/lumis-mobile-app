import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";
import Button from "./Button";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

export default function EmptyState({
  icon,
  iconColor = colors.dark.text.tertiary,
  title,
  subtitle,
  action,
}: Props) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 32, paddingHorizontal: 24 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: `${iconColor}15`,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <Ionicons name={icon} size={26} color={iconColor} />
      </View>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          color: colors.dark.text.primary,
          textAlign: "center",
          marginBottom: subtitle ? 6 : 0,
        }}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          style={{
            fontSize: 14,
            color: colors.dark.text.tertiary,
            textAlign: "center",
            lineHeight: 20,
          }}
        >
          {subtitle}
        </Text>
      )}
      {action && (
        <View style={{ marginTop: 20, width: "100%", maxWidth: 200 }}>
          <Button
            label={action.label}
            onPress={action.onPress}
            size="sm"
            fullWidth={false}
          />
        </View>
      )}
    </View>
  );
}
