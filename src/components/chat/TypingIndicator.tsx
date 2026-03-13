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
import HeroDroplet from "@/components/companion/HeroDroplet";
import { chatSpec, colors } from "@/constants/theme";

const c = colors.dark;

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
    <Animated.View style={[style, { marginHorizontal: 2, height: 8, width: 8, borderRadius: 4, backgroundColor: c.text.secondary }]} />
  );
}

export default function TypingIndicator() {
  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={{ flexDirection: "row", alignItems: "flex-end", marginBottom: 8 }} accessibilityLabel="Lumis is typing" accessibilityRole="text">
      <View style={{ marginRight: 8 }}>
        <HeroDroplet size="small" state="thinking" />
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: c.bubble.ai,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderTopLeftRadius: chatSpec.aiBubbleRadius.topLeft,
          borderTopRightRadius: chatSpec.aiBubbleRadius.topRight,
          borderBottomLeftRadius: chatSpec.aiBubbleRadius.bottomLeft,
          borderBottomRightRadius: chatSpec.aiBubbleRadius.bottomRight,
          borderWidth: 0.5,
          borderColor: c.glass.border,
        }}
      >
        <Dot delay={0} />
        <Dot delay={150} />
        <Dot delay={300} />
      </View>
    </Animated.View>
  );
}
