import { Pressable, Text, ActivityIndicator } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { colors } from "@/constants/theme";
import { hapticLight } from "@/lib/haptics";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface Props {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  haptic?: boolean;
}

const VARIANT_STYLES: Record<
  ButtonVariant,
  { bg: string; bgDisabled: string; text: string; border?: string }
> = {
  primary: {
    bg: colors.dark.brand.purple,
    bgDisabled: `${colors.dark.brand.purple}60`,
    text: "#FFFFFF",
  },
  secondary: {
    bg: "transparent",
    bgDisabled: "transparent",
    text: colors.dark.brand.purpleLight,
    border: `${colors.dark.brand.purple}50`,
  },
  ghost: {
    bg: "transparent",
    bgDisabled: "transparent",
    text: colors.dark.text.secondary,
  },
  danger: {
    bg: "#7F1D1D",
    bgDisabled: "#7F1D1D60",
    text: "#FCA5A5",
  },
};

const SIZE_STYLES: Record<ButtonSize, { height: number; px: number; fontSize: number }> = {
  sm: { height: 36, px: 14, fontSize: 13 },
  md: { height: 44, px: 20, fontSize: 15 },
  lg: { height: 52, px: 24, fontSize: 16 },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  icon,
  fullWidth = true,
  haptic = true,
}: Props) {
  const scale = useSharedValue(1);
  const vs = VARIANT_STYLES[variant];
  const ss = SIZE_STYLES[size];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = async () => {
    if (haptic) await hapticLight();
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        animatedStyle,
        {
          height: ss.height,
          paddingHorizontal: ss.px,
          borderRadius: 14,
          backgroundColor: disabled || loading ? vs.bgDisabled : vs.bg,
          borderWidth: vs.border ? 1 : 0,
          borderColor: vs.border,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          alignSelf: fullWidth ? "stretch" : "flex-start",
          minWidth: 44,
          gap: 8,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator color={vs.text} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={{
              fontSize: ss.fontSize,
              fontWeight: "600",
              color: disabled ? `${vs.text}60` : vs.text,
            }}
          >
            {label}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}
