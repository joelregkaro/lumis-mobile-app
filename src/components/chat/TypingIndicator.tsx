import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import CompanionAvatar from "@/components/companion/CompanionAvatar";
import { chatSpec } from "@/constants/theme";

function Dot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.3, { duration: 400 }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={style} className="mx-0.5 h-2 w-2 rounded-full bg-text-secondary" />
  );
}

export default function TypingIndicator() {
  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} className="mb-sm flex-row items-end">
      <View className="mr-sm">
        <CompanionAvatar size="small" expression="curious" />
      </View>
      <View
        className="flex-row items-center bg-bubble-ai px-4 py-3"
        style={{
          borderTopLeftRadius: chatSpec.aiBubbleRadius.topLeft,
          borderTopRightRadius: chatSpec.aiBubbleRadius.topRight,
          borderBottomLeftRadius: chatSpec.aiBubbleRadius.bottomLeft,
          borderBottomRightRadius: chatSpec.aiBubbleRadius.bottomRight,
        }}
      >
        <Dot delay={0} />
        <Dot delay={150} />
        <Dot delay={300} />
      </View>
    </Animated.View>
  );
}
