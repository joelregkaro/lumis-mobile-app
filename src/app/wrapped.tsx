import { useEffect, useState, useRef } from "react";
import { View, Text, Pressable, FlatList, Dimensions, ActivityIndicator, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { supabase } from "@/lib/supabase";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import type { InsightCard } from "@/types/database";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 40;

const GRADIENTS: [string, string][] = [
  ["#7C3AED", "#2DD4BF"],
  ["#6D28D9", "#14B8A6"],
  ["#8B5CF6", "#34D399"],
  ["#7C3AED", "#FBBF24"],
  ["#6366F1", "#2DD4BF"],
  ["#8B5CF6", "#F472B6"],
];

function WrappedCard({ card, index }: { card: InsightCard; index: number }) {
  const gradient = GRADIENTS[index % GRADIENTS.length];

  return (
    <View style={{ width: CARD_WIDTH, paddingHorizontal: 0 }}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 24,
          padding: 32,
          minHeight: 400,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Animated.View entering={FadeInDown.delay(200).duration(600)} style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 64, fontWeight: "800", color: "white", textAlign: "center", letterSpacing: -2 }}>
            {card.stat_value}
          </Text>
          <Text style={{ fontSize: 16, fontWeight: "600", color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: 2, marginTop: 4 }}>
            {card.stat_label}
          </Text>
        </Animated.View>

        <View style={{ marginTop: 32, alignItems: "center" }}>
          <Text style={{ fontSize: 22, fontWeight: "700", color: "white", textAlign: "center" }}>
            {card.title}
          </Text>
          <Text style={{ fontSize: 16, color: "rgba(255,255,255,0.85)", textAlign: "center", marginTop: 12, lineHeight: 24 }}>
            {card.body}
          </Text>
        </View>

        <Text style={{ position: "absolute", bottom: 16, fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: "500" }}>
          lumis.app
        </Text>
      </LinearGradient>
    </View>
  );
}

export default function WrappedScreen() {
  const router = useRouter();
  const [cards, setCards] = useState<InsightCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("insight_cards")
      .select("*")
      .eq("user_id", user.id)
      .eq("card_type", "monthly_wrapped")
      .order("created_at", { ascending: false })
      .limit(6);

    setCards((data as InsightCard[]) ?? []);
    setLoading(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0C1120", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </SafeAreaView>
    );
  }

  if (cards.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0C1120", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>
        <Ionicons name="sparkles-outline" size={48} color="#52525B" />
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#F4F4F5", marginTop: 20, textAlign: "center" }}>
          Your Wrapped is coming
        </Text>
        <Text style={{ fontSize: 15, color: "#71717A", textAlign: "center", marginTop: 8 }}>
          Keep checking in and having conversations. Your first Monthly Wrapped will be ready soon.
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 16, color: "#A78BFA", fontWeight: "600" }}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0C1120" }}>
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Close" accessibilityRole="button">
          <Ionicons name="close" size={24} color="#71717A" />
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#F4F4F5" }}>
          Your Monthly Wrapped
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Cards */}
      <View style={{ flex: 1, justifyContent: "center" }}>
        <FlatList
          ref={flatListRef}
          data={cards}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          snapToInterval={CARD_WIDTH}
          decelerationRate="fast"
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH);
            setCurrentIndex(index);
            hapticLight();
          }}
          renderItem={({ item, index }) => <WrappedCard card={item} index={index} />}
          keyExtractor={(item) => item.id}
        />
      </View>

      {/* Dots */}
      <View style={{ flexDirection: "row", justifyContent: "center", paddingVertical: 16, gap: 6 }}>
        {cards.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === currentIndex ? 20 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i === currentIndex ? "#7C3AED" : "#27272A",
            }}
          />
        ))}
      </View>

      {/* Bottom */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        <Pressable
          onPress={async () => {
            await hapticSuccess();
            router.back();
          }}
          style={{ alignItems: "center", backgroundColor: "#16161D", borderRadius: 16, paddingVertical: 14 }}
          accessibilityLabel="Done viewing wrapped"
          accessibilityRole="button"
        >
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#A78BFA" }}>Done</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
