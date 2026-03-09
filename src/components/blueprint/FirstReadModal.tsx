import { useRef, useState, useCallback } from "react";
import { View, Text, Pressable, Modal, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { hapticSuccess } from "@/lib/haptics";
import { colors } from "@/constants/theme";
import ShareFooter from "@/components/share/ShareFooter";

const c = colors.dark;

interface FirstReadData {
  noticed: string[];
  surprised_me: string;
  next_question: string;
}

interface Props {
  visible: boolean;
  data: FirstReadData;
  onDismiss: () => void;
}

export default function FirstReadModal({ visible, data, onDismiss }: Props) {
  const viewRef = useRef<ViewShot>(null);
  const [sharing, setSharing] = useState(false);

  const handleShare = useCallback(async () => {
    if (!viewRef.current?.capture) return;
    setSharing(true);
    try {
      const uri = await viewRef.current.capture();
      await hapticSuccess();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "image/png", UTI: "public.png" });
      }
    } catch (e) {
      console.warn("Share failed:", e);
    }
    setSharing(false);
  }, []);

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 }}>
        <Animated.View entering={FadeIn.duration(400)} style={{ width: "100%", alignItems: "center" }}>
          <Animated.Text
            entering={FadeInDown.duration(400)}
            style={{
              fontSize: 14, fontWeight: "600", color: c.text.tertiary,
              letterSpacing: 1, textTransform: "uppercase", marginBottom: 16,
            }}
          >
            AI First Read
          </Animated.Text>

          <ViewShot ref={viewRef} options={{ format: "png", quality: 1.0, result: "tmpfile" }}>
            <View style={{ width: 340, borderRadius: 24, overflow: "hidden", borderWidth: 1.5, borderColor: "#7C3AED40" }}>
              <LinearGradient
                colors={["#1A1040", "#0C1120", "#0A1628"]}
                style={{ padding: 28 }}
              >
                <Text style={{ fontSize: 11, fontWeight: "600", color: "#5A6178", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16, textAlign: "center" }}>
                  WHAT AI NOTICED ABOUT YOU
                </Text>

                {data.noticed.map((item, i) => (
                  <Animated.View
                    key={i}
                    entering={FadeInDown.delay(200 + i * 150).duration(400)}
                    style={{ flexDirection: "row", marginBottom: 12, alignItems: "flex-start" }}
                  >
                    <Text style={{ fontSize: 14, marginRight: 10, marginTop: 1 }}>
                      {i === 0 ? "👁️" : i === 1 ? "💡" : "🎯"}
                    </Text>
                    <Text style={{ flex: 1, fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 20 }}>
                      {item}
                    </Text>
                  </Animated.View>
                ))}

                <View style={{ marginTop: 8, paddingTop: 16, borderTopWidth: 0.5, borderTopColor: "#242A42" }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 12 }}>
                    <Text style={{ fontSize: 14, marginRight: 10 }}>✨</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#A78BFA", letterSpacing: 1, marginBottom: 4 }}>
                        WHAT SURPRISED ME
                      </Text>
                      <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 20 }}>
                        {data.surprised_me}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                    <Text style={{ fontSize: 14, marginRight: 10 }}>🔮</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#2DD4BF", letterSpacing: 1, marginBottom: 4 }}>
                        WHAT I'D ASK YOU NEXT
                      </Text>
                      <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 20, fontStyle: "italic" }}>
                        "{data.next_question}"
                      </Text>
                    </View>
                  </View>
                </View>

                <ShareFooter variant="dark" />
              </LinearGradient>
            </View>
          </ViewShot>

          {/* Share CTA */}
          <Animated.View entering={FadeInDown.delay(600).duration(400)} style={{ width: "100%", marginTop: 20 }}>
            <Pressable onPress={handleShare} disabled={sharing} style={{ borderRadius: 14, overflow: "hidden" }}>
              <LinearGradient
                colors={["#7C3AED", "#2DD4BF"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 16, alignItems: "center", borderRadius: 14 }}
              >
                {sharing ? (
                  <ActivityIndicator color="#EAEDF3" />
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="share-social" size={20} color="#EAEDF3" style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "#EAEDF3" }}>Share What AI Saw</Text>
                  </View>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* Dismiss */}
          <Pressable onPress={onDismiss} style={{ marginTop: 16, paddingVertical: 12 }}>
            <Text style={{ fontSize: 15, color: c.text.tertiary }}>Continue</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
