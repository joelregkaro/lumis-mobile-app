import { View, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors, bento, shadow } from "@/constants/theme";

const c = colors.dark;

type CardVariant = "default" | "accent" | "gradient" | "interactive";

interface Props {
  children: React.ReactNode;
  variant?: CardVariant;
  accentColor?: string;
  gradientColors?: readonly [string, string];
  onPress?: () => void;
  style?: object;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function Card({
  children,
  variant = "default",
  accentColor = c.brand.purple,
  gradientColors,
  onPress,
  style,
}: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const baseStyle = {
    borderRadius: bento.radiusSm,
    overflow: "hidden" as const,
  };

  const content = (
    <View
      style={[
        {
          padding: bento.padding,
          backgroundColor: c.bg.surface,
          borderRadius: bento.radiusSm,
          borderWidth: 1,
          borderColor: variant === "accent" ? "transparent" : c.glass.border,
          borderLeftWidth: variant === "accent" ? 3 : 1,
          borderLeftColor: variant === "accent" ? accentColor : c.glass.border,
          ...shadow.card,
        },
        style,
      ]}
    >
      {variant === "interactive" ? (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1 }}>{children}</View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={c.text.tertiary}
            style={{ marginLeft: 8 }}
          />
        </View>
      ) : (
        children
      )}
    </View>
  );

  if (variant === "gradient" && gradientColors) {
    const inner = (
      <LinearGradient
        colors={[`${gradientColors[0]}25`, `${gradientColors[1]}15`, c.bg.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          padding: bento.padding,
          borderRadius: bento.radiusSm,
          borderWidth: 1,
          borderColor: `${gradientColors[0]}30`,
        }}
      >
        {children}
      </LinearGradient>
    );

    if (onPress) {
      return (
        <AnimatedPressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[animatedStyle, baseStyle]}
          accessibilityRole="button"
        >
          {inner}
        </AnimatedPressable>
      );
    }
    return <View style={baseStyle}>{inner}</View>;
  }

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[animatedStyle, baseStyle]}
        accessibilityRole="button"
      >
        {content}
      </AnimatedPressable>
    );
  }

  return content;
}
