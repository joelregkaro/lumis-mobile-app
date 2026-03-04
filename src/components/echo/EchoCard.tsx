import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeOutRight } from "react-native-reanimated";
import { hapticSuccess, hapticLight } from "@/lib/haptics";
import type { SessionEcho } from "@/types/database";

interface EchoCardProps {
  echo: SessionEcho;
  index: number;
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
}

export default function EchoCard({ echo, index, onComplete, onSkip }: EchoCardProps) {
  const router = useRouter();
  const isCommitment = !!echo.committed_for;

  const handleComplete = async () => {
    await hapticSuccess();
    onComplete(echo.id);
  };

  const handleSkip = async () => {
    await hapticLight();
    onSkip(echo.id);
  };

  const handleCommitmentTap = async () => {
    await hapticLight();
    router.push({ pathname: "/commitment-response", params: { echoId: echo.id } });
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).duration(300)}
      exiting={FadeOutRight.duration(200)}
      className="mb-sm rounded-lg border border-brand-purple/20 bg-bg-surface p-md"
    >
      <View className="mb-xs flex-row items-center">
        <Text className="mr-xs text-brand-teal">{isCommitment ? "⏰" : "✦"}</Text>
        <Text className="text-label uppercase tracking-wider text-text-secondary">
          {isCommitment ? "Commitment" : "Session Echo"}
        </Text>
        {isCommitment && echo.committed_for && (
          <Text style={{ fontSize: 11, color: "#60A5FA", marginLeft: "auto" }}>
            {new Date(echo.committed_for).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </Text>
        )}
      </View>

      <Text className="mb-xs text-body font-inter-medium text-text-primary">
        {echo.action_item}
      </Text>

      {echo.context && (
        <Text className="mb-sm text-small text-text-secondary">{echo.context}</Text>
      )}

      {isCommitment ? (
        <Pressable
          onPress={handleCommitmentTap}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#8B5CF620",
            borderRadius: 8,
            paddingVertical: 10,
          }}
        >
          <Ionicons name="checkmark-circle-outline" size={16} color="#A78BFA" style={{ marginRight: 6 }} />
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#A78BFA" }}>
            How'd it go?
          </Text>
        </Pressable>
      ) : (
        <View className="flex-row gap-sm">
          <Pressable
            onPress={handleComplete}
            className="flex-1 items-center rounded-md bg-brand-purple/20 py-2"
          >
            <Text className="text-small font-inter-medium text-brand-purple-light">
              ✓ Done
            </Text>
          </Pressable>
          <Pressable
            onPress={handleSkip}
            className="items-center rounded-md px-4 py-2"
          >
            <Text className="text-small text-text-tertiary">Skip</Text>
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
}
