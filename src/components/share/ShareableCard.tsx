import { useRef, useCallback } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { hapticSuccess } from "@/lib/haptics";
import ShareFooter from "@/components/share/ShareFooter";

const GRADIENTS: [string, string][] = [
  ["#7C3AED", "#2DD4BF"],
  ["#6D28D9", "#14B8A6"],
  ["#8B5CF6", "#34D399"],
  ["#7C3AED", "#FBBF24"],
  ["#6366F1", "#2DD4BF"],
  ["#8B5CF6", "#F472B6"],
];

interface Props {
  gradient?: [string, string];
  gradientIndex?: number;
  children: React.ReactNode;
  onShare?: () => void;
  showShareButton?: boolean;
  minHeight?: number;
}

export default function ShareableCard({
  gradient,
  gradientIndex = 0,
  children,
  onShare,
  showShareButton = true,
  minHeight = 400,
}: Props) {
  const viewShotRef = useRef<ViewShot>(null);
  const colors = gradient ?? GRADIENTS[gradientIndex % GRADIENTS.length];

  const handleShare = useCallback(async () => {
    try {
      const uri = await viewShotRef.current?.capture?.();
      if (!uri) return;
      await hapticSuccess();
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: "Share your Lumis card",
      });
      onShare?.();
    } catch (e) {
      console.warn("Share failed:", e);
    }
  }, [onShare]);

  return (
    <View>
      <ViewShot ref={viewShotRef} options={{ format: "png", quality: 1.0 }}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 24,
            padding: 32,
            minHeight,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {children}
          <View style={{ position: "absolute", bottom: 12, left: 32, right: 32 }}>
            <ShareFooter variant="light" />
          </View>
        </LinearGradient>
      </ViewShot>

      {showShareButton && (
        <Pressable
          onPress={handleShare}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 12,
            backgroundColor: "#FFFFFF15",
            borderRadius: 16,
            paddingVertical: 12,
            paddingHorizontal: 24,
          }}
          accessibilityLabel="Share this card"
          accessibilityRole="button"
        >
          <Ionicons name="share-outline" size={18} color="white" style={{ marginRight: 8 }} />
          <Text style={{ fontSize: 15, fontWeight: "600", color: "white" }}>Share</Text>
        </Pressable>
      )}
    </View>
  );
}

export { GRADIENTS };
