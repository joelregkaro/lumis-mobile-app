import React, { useEffect } from "react";
import { TextStyle, StyleProp } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { TextInput } from "react-native";

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  delay?: number;
  style?: StyleProp<TextStyle>;
  prefix?: string;
  suffix?: string;
  decimalPlaces?: number;
}

export default function AnimatedNumber({
  value,
  duration = 800,
  delay: delayMs = 0,
  style,
  prefix = "",
  suffix = "",
  decimalPlaces = 0,
}: AnimatedNumberProps) {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = 0;
    animatedValue.value = withDelay(
      delayMs,
      withTiming(value, { duration, easing: Easing.out(Easing.cubic) }),
    );
  }, [value]);

  const animatedProps = useAnimatedProps(() => {
    const num = decimalPlaces > 0
      ? animatedValue.value.toFixed(decimalPlaces)
      : Math.round(animatedValue.value).toString();
    return {
      text: `${prefix}${num}${suffix}`,
      defaultValue: `${prefix}${num}${suffix}`,
    } as any;
  });

  return (
    <AnimatedTextInput
      underlineColorAndroid="transparent"
      editable={false}
      animatedProps={animatedProps}
      style={[
        {
          color: "#EAEDF3",
          fontSize: 28,
          fontWeight: "900",
          padding: 0,
          margin: 0,
        },
        style,
      ]}
    />
  );
}
