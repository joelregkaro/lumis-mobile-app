import { type ReactNode } from "react";
import { View, Platform, type ViewStyle, type StyleProp } from "react-native";
import { BlurView } from "expo-blur";

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  blurIntensity?: number;
}

export default function GlassCard({ children, style, blurIntensity = 20 }: Props) {
  const cardStyle: ViewStyle = {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.15)",
    overflow: "hidden",
  };

  if (Platform.OS === "ios") {
    return (
      <View style={[cardStyle, style]}>
        <BlurView intensity={blurIntensity} tint="dark" style={{ flex: 1 }}>
          <View style={{ backgroundColor: "rgba(18, 16, 40, 0.35)", flex: 1 }}>
            {children}
          </View>
        </BlurView>
      </View>
    );
  }

  return (
    <View
      style={[
        cardStyle,
        { backgroundColor: "rgba(18, 16, 40, 0.75)" },
        style,
      ]}
    >
      {children}
    </View>
  );
}
