import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn, useSharedValue, useAnimatedStyle, withTiming, withDelay } from "react-native-reanimated";
import ShareableCard from "@/components/share/ShareableCard";
import { supabase } from "@/lib/supabase";
import { hapticLight } from "@/lib/haptics";
import { screen } from "@/lib/analytics";

interface EmotionalType {
  type_name: string;
  type_emoji: string;
  traits: Record<string, number>;
  insight: string;
  description: string;
}

const TRAIT_LABELS: Record<string, { label: string; color: string }> = {
  self_awareness: { label: "Self-Awareness", color: "#A78BFA" },
  empathy: { label: "Empathy", color: "#2DD4BF" },
  resilience: { label: "Resilience", color: "#FBBF24" },
  regulation: { label: "Regulation", color: "#F472B6" },
};

function TraitBar({ label, color, value, delay }: { label: string; color: string; value: number; delay: number }) {
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withDelay(delay, withTiming(value, { duration: 800 }));
  }, [value]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
    backgroundColor: color,
  }));

  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
        <Text style={{ fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.9)" }}>{label}</Text>
        <Text style={{ fontSize: 13, fontWeight: "700", color }}>{value}%</Text>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.15)" }}>
        <Animated.View style={[barStyle, { height: 8, borderRadius: 4 }]} />
      </View>
    </View>
  );
}

export default function EmotionalTypeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [typeData, setTypeData] = useState<EmotionalType | null>(null);

  useEffect(() => { screen("emotional_type"); }, []);

  useEffect(() => {
    loadExisting();
  }, []);

  const loadExisting = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data } = await supabase
      .from("insight_cards")
      .select("*")
      .eq("user_id", user.id)
      .eq("card_type", "emotional_type")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0 && data[0].metadata) {
      setTypeData(data[0].metadata as unknown as EmotionalType);
    }
    setLoading(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-emotional-type");
      if (error) throw error;
      const card = data?.card;
      if (card?.metadata) {
        setTypeData(card.metadata as EmotionalType);
      }
    } catch (e) {
      console.error("Generate emotional type error:", e);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0C1120", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </SafeAreaView>
    );
  }

  if (!typeData && !generating) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0C1120" }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="#71717A" />
          </Pressable>
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#F4F4F5" }}>Your Emotional Type</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 48, marginBottom: 20 }}>🔮</Text>
          <Text style={{ fontSize: 22, fontWeight: "700", color: "#F4F4F5", textAlign: "center", marginBottom: 12 }}>
            Discover Your Type
          </Text>
          <Text style={{ fontSize: 15, color: "#71717A", textAlign: "center", lineHeight: 22, marginBottom: 32 }}>
            Based on your conversations, moods, and patterns, we'll reveal your unique emotional archetype.
          </Text>
          <Pressable
            onPress={() => { hapticLight(); handleGenerate(); }}
            style={{ backgroundColor: "#8B5CF6", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 20 }}
          >
            <Text style={{ fontSize: 16, fontWeight: "600", color: "white" }}>Reveal My Type</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (generating) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0C1120", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#A78BFA" />
        <Text style={{ fontSize: 16, color: "#A1A1AA", marginTop: 16 }}>Analyzing your journey...</Text>
      </SafeAreaView>
    );
  }

  const traits = typeData!.traits;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0C1120" }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#71717A" />
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#F4F4F5" }}>Your Emotional Type</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 20 }}>
        <ShareableCard gradientIndex={3} minHeight={480}>
          <Animated.View entering={FadeInDown.delay(100).duration(600)} style={{ alignItems: "center", width: "100%" }}>
            <Text style={{ fontSize: 56, marginBottom: 8 }}>{typeData!.type_emoji}</Text>
            <Text style={{ fontSize: 28, fontWeight: "800", color: "white", textAlign: "center", letterSpacing: -1 }}>
              {typeData!.type_name}
            </Text>
            <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", textAlign: "center", marginTop: 8, lineHeight: 20, paddingHorizontal: 16 }}>
              {typeData!.insight}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).duration(600)} style={{ width: "100%", marginTop: 28 }}>
            {Object.entries(traits).map(([key, value], i) => {
              const config = TRAIT_LABELS[key];
              if (!config) return null;
              return (
                <TraitBar
                  key={key}
                  label={config.label}
                  color={config.color}
                  value={typeof value === "number" ? value : 50}
                  delay={600 + i * 200}
                />
              );
            })}
          </Animated.View>
        </ShareableCard>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ alignItems: "center", backgroundColor: "#16161D", borderRadius: 16, paddingVertical: 14 }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#A78BFA" }}>Done</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
