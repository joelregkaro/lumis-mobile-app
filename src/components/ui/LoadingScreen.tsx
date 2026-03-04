import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";
import { colors } from "@/constants/theme";

function SkeletonBlock({
  width,
  height,
  radius = 16,
  delay = 0,
}: {
  width: number | string;
  height: number;
  radius?: number;
  delay?: number;
}) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(0.7, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          width: width as any,
          height,
          borderRadius: radius,
          backgroundColor: colors.dark.bg.surface,
        },
      ]}
    />
  );
}

export default function LoadingScreen() {
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.dark.bg.primary }}
      edges={["top"]}
    >
      <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 16 }}>
        {/* Header skeleton */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <SkeletonBlock width={180} height={28} radius={8} delay={0} />
          <SkeletonBlock width={40} height={40} radius={20} delay={100} />
        </View>

        {/* Hero companion card */}
        <SkeletonBlock width="100%" height={200} delay={150} />

        {/* Daily rhythm section */}
        <SkeletonBlock width={120} height={14} radius={7} delay={200} />
        <SkeletonBlock width="100%" height={120} delay={250} />

        {/* Progress row */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <SkeletonBlock width="33%" height={64} delay={300} />
          <SkeletonBlock width="33%" height={64} delay={350} />
          <SkeletonBlock width="33%" height={64} delay={400} />
        </View>

        {/* Insight card */}
        <SkeletonBlock width="100%" height={80} delay={450} />
      </View>
    </SafeAreaView>
  );
}
