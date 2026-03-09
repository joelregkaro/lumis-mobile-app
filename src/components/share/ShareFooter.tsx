import { View, Text } from "react-native";

interface Props {
  variant?: "light" | "dark";
}

export default function ShareFooter({ variant = "light" }: Props) {
  const isLight = variant === "light";
  const textColor = isLight ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.35)";
  const subtleColor = isLight ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.2)";
  const dividerColor = isLight ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.08)";

  return (
    <View style={{ alignItems: "center", marginTop: 20, paddingTop: 16, borderTopWidth: 0.5, borderTopColor: dividerColor, width: "100%" }}>
      <Text style={{ fontSize: 13, fontWeight: "800", color: textColor, letterSpacing: 1.5 }}>
        LUMIS
      </Text>
      <Text style={{ fontSize: 11, color: subtleColor, marginTop: 3 }}>
        Your AI life coach
      </Text>
      <Text style={{ fontSize: 10, color: subtleColor, marginTop: 6, letterSpacing: 0.3 }}>
        Download free at lumis.app
      </Text>
    </View>
  );
}
