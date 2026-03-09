import { useEffect, useState, useRef, useCallback } from "react";
import { View, Text, Pressable, Dimensions, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { supabase } from "@/lib/supabase";
import { useMemoryStore } from "@/store/memory";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { screen } from "@/lib/analytics";
import { colors } from "@/constants/theme";
import ShareFooter from "@/components/share/ShareFooter";
import type { InsightCard } from "@/types/database";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const c = colors.dark;

const GRADIENTS: [string, string][] = [
  ["#7C3AED", "#2DD4BF"],
  ["#6D28D9", "#14B8A6"],
  ["#8B5CF6", "#34D399"],
  ["#7C3AED", "#FBBF24"],
  ["#6366F1", "#2DD4BF"],
  ["#8B5CF6", "#F472B6"],
  ["#4F46E5", "#06B6D4"],
  ["#9333EA", "#F59E0B"],
];

const AUTO_ADVANCE_MS = 8000;

function CountUpText({ value, style }: { value: string; style: any }) {
  const isNumeric = /^\d+$/.test(value);
  const [display, setDisplay] = useState(isNumeric ? "0" : value);

  useEffect(() => {
    if (!isNumeric) { setDisplay(value); return; }
    const target = parseInt(value, 10);
    const duration = 1200;
    const steps = 30;
    const interval = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(String(Math.round(target * eased)));
      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, [value]);

  return <Text style={style}>{display}</Text>;
}

function StoryCard({
  card,
  index,
  isActive,
  onShare,
  sharing,
  viewRef,
  companionName,
}: {
  card: InsightCard;
  index: number;
  isActive: boolean;
  onShare: () => void;
  sharing: boolean;
  viewRef: React.RefObject<ViewShot>;
  companionName: string;
}) {
  const gradient = GRADIENTS[index % GRADIENTS.length];
  const monthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const statOpacity = useSharedValue(0);
  const labelOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const titleOpacity = useSharedValue(0);
  const bodyOpacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      statOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
      labelOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));
      titleTranslateY.value = withDelay(400, withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) }));
      titleOpacity.value = withDelay(400, withTiming(1, { duration: 300 }));
      bodyOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));
    } else {
      statOpacity.value = 0;
      labelOpacity.value = 0;
      titleTranslateY.value = 20;
      titleOpacity.value = 0;
      bodyOpacity.value = 0;
    }
  }, [isActive]);

  const statStyle = useAnimatedStyle(() => ({ opacity: statOpacity.value }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: labelOpacity.value }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));
  const bodyStyle = useAnimatedStyle(() => ({ opacity: bodyOpacity.value }));

  return (
    <ViewShot ref={viewRef} options={{ format: "png", quality: 1.0, result: "tmpfile" }}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: SCREEN_WIDTH,
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 32,
          paddingVertical: 60,
        }}
      >
        <Animated.View style={[{ alignItems: "center" }, statStyle]}>
          {card.stat_value && (
            <CountUpText
              value={card.stat_value}
              style={{ fontSize: 72, fontWeight: "900", color: "white", textAlign: "center", letterSpacing: -2 }}
            />
          )}
        </Animated.View>

        <Animated.View style={labelStyle}>
          {card.stat_label && (
            <Text style={{
              fontSize: 14, fontWeight: "700", color: "rgba(255,255,255,0.75)",
              textTransform: "uppercase", letterSpacing: 2, marginTop: 4, textAlign: "center",
            }}>
              {card.stat_label}
            </Text>
          )}
        </Animated.View>

        <Animated.View style={[{ marginTop: 40, alignItems: "center" }, titleStyle]}>
          <Text style={{ fontSize: 26, fontWeight: "800", color: "white", textAlign: "center", lineHeight: 32 }}>
            {card.title}
          </Text>
        </Animated.View>

        <Animated.View style={[{ marginTop: 16, alignItems: "center" }, bodyStyle]}>
          <Text style={{ fontSize: 17, color: "rgba(255,255,255,0.9)", textAlign: "center", lineHeight: 26 }}>
            {card.body}
          </Text>
        </Animated.View>

        {/* Share button */}
        <Animated.View style={[{ position: "absolute", bottom: 80 }, bodyStyle]}>
          <Pressable
            onPress={onShare}
            disabled={sharing}
            style={{
              flexDirection: "row", alignItems: "center",
              backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20,
              paddingHorizontal: 16, paddingVertical: 8,
            }}
          >
            {sharing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="share-outline" size={16} color="white" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 13, fontWeight: "600", color: "white" }}>Share</Text>
              </>
            )}
          </Pressable>
        </Animated.View>

        {/* Watermark */}
        <View style={{ position: "absolute", bottom: 24, left: 32, right: 32, alignItems: "center" }}>
          <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: "600", letterSpacing: 2, marginBottom: 4 }}>
            {companionName} · {monthLabel}
          </Text>
          <ShareFooter variant="light" />
        </View>
      </LinearGradient>
    </ViewShot>
  );
}

export default function WrappedScreen() {
  const router = useRouter();
  const { markShared } = useMemoryStore();
  const [cards, setCards] = useState<InsightCard[]>([]);
  const [companionName, setCompanionName] = useState("Lumis");
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sharing, setSharing] = useState(false);
  const viewRefs = useRef<(ViewShot | null)[]>([]);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { screen("wrapped"); }, []);

  useEffect(() => {
    loadCards();
    return () => { if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current); };
  }, []);

  useEffect(() => {
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    if (cards.length > 0 && currentIndex < cards.length - 1) {
      autoAdvanceRef.current = setTimeout(() => {
        setCurrentIndex((prev) => Math.min(prev + 1, cards.length - 1));
        hapticLight();
      }, AUTO_ADVANCE_MS);
    }
    return () => { if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current); };
  }, [currentIndex, cards.length]);

  const loadCards = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [cardsRes, userRes] = await Promise.all([
      supabase
        .from("insight_cards")
        .select("*")
        .eq("user_id", user.id)
        .eq("card_type", "monthly_wrapped")
        .order("created_at", { ascending: false })
        .limit(12),
      supabase.from("users").select("companion_name").eq("id", user.id).single(),
    ]);

    setCards((cardsRes.data as InsightCard[]) ?? []);
    if (userRes.data?.companion_name) setCompanionName(userRes.data.companion_name);
    setLoading(false);
  };

  const handleTap = useCallback((side: "left" | "right") => {
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    if (side === "right" && currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      hapticLight();
    } else if (side === "left" && currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      hapticLight();
    }
  }, [currentIndex, cards.length]);

  const handleShare = useCallback(async () => {
    const ref = viewRefs.current[currentIndex];
    if (!ref?.capture) return;
    setSharing(true);
    try {
      const uri = await ref.capture();
      await hapticSuccess();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "image/png", UTI: "public.png" });
        await markShared(cards[currentIndex].id);
      }
    } catch (e) {
      console.error("Share error:", e);
    }
    setSharing(false);
  }, [currentIndex, cards]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg.primary, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={c.brand.purple} />
      </SafeAreaView>
    );
  }

  if (cards.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>
        <Ionicons name="sparkles-outline" size={48} color={c.text.tertiary} />
        <Text style={{ fontSize: 20, fontWeight: "700", color: c.text.primary, marginTop: 20, textAlign: "center" }}>
          Your Wrapped is coming
        </Text>
        <Text style={{ fontSize: 15, color: c.text.secondary, textAlign: "center", marginTop: 8 }}>
          Keep checking in and having conversations. Your first Monthly Wrapped will be ready soon.
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 16, color: c.brand.purpleLight, fontWeight: "600" }}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isLastCard = currentIndex === cards.length - 1;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg.primary }}>
      {/* Progress bar segments */}
      <SafeAreaView edges={["top"]} style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 }}>
        <View style={{ flexDirection: "row", paddingHorizontal: 8, paddingTop: 8, gap: 3 }}>
          {cards.map((_, i) => (
            <View key={i} style={{ flex: 1, height: 3, borderRadius: 1.5, backgroundColor: i <= currentIndex ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.2)" }} />
          ))}
        </View>
        {/* Close button */}
        <Pressable
          onPress={() => router.back()}
          style={{ position: "absolute", right: 16, top: 56, zIndex: 20, padding: 4 }}
        >
          <Ionicons name="close" size={24} color="rgba(255,255,255,0.7)" />
        </Pressable>
      </SafeAreaView>

      {/* Card content */}
      <View style={{ flex: 1 }}>
        <StoryCard
          key={currentIndex}
          card={cards[currentIndex]}
          index={currentIndex}
          isActive={true}
          onShare={handleShare}
          sharing={sharing}
          viewRef={(ref) => { viewRefs.current[currentIndex] = ref; }}
          companionName={companionName}
        />
      </View>

      {/* Tap zones */}
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, flexDirection: "row" }}>
        <Pressable style={{ flex: 1 }} onPress={() => handleTap("left")} />
        <Pressable style={{ flex: 1 }} onPress={() => handleTap("right")} />
      </View>

      {/* Last card CTA */}
      {isLastCard && (
        <SafeAreaView edges={["bottom"]} style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10 }}>
          <Animated.View entering={FadeInUp.delay(800).duration(400)} style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
            <Pressable
              onPress={handleShare}
              disabled={sharing}
              style={{ borderRadius: 14, overflow: "hidden", marginBottom: 8 }}
            >
              <LinearGradient
                colors={["#7C3AED", "#2DD4BF"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 14, alignItems: "center", borderRadius: 14 }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="share-social" size={18} color="white" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "white" }}>Share Your Growth</Text>
                </View>
              </LinearGradient>
            </Pressable>
            <Pressable
              onPress={() => { hapticLight(); router.back(); }}
              style={{ alignItems: "center", paddingVertical: 12 }}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: "rgba(255,255,255,0.6)" }}>Done</Text>
            </Pressable>
          </Animated.View>
        </SafeAreaView>
      )}
    </View>
  );
}
