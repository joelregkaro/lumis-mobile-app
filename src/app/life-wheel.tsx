import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useLifeDomainsStore, DOMAIN_META, ALL_DOMAINS } from "@/store/lifeDomains";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import type { LifeDomainType } from "@/types/database";

export default function LifeWheelScreen() {
  const router = useRouter();
  const { latestScores, isLoading, fetchLatestScores, saveAssessment } = useLifeDomainsStore();
  const [editing, setEditing] = useState(false);
  const [scores, setScores] = useState<Record<LifeDomainType, number>>(
    Object.fromEntries(ALL_DOMAINS.map((d) => [d, 5])) as Record<LifeDomainType, number>,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLatestScores();
  }, []);

  useEffect(() => {
    if (latestScores.length > 0) {
      const map = Object.fromEntries(ALL_DOMAINS.map((d) => [d, 5])) as Record<LifeDomainType, number>;
      latestScores.forEach((s) => { map[s.domain] = s.score; });
      setScores(map);
    }
  }, [latestScores]);

  const average = ALL_DOMAINS.reduce((sum, d) => sum + scores[d], 0) / ALL_DOMAINS.length;

  const handleSave = async () => {
    setSaving(true);
    await saveAssessment(ALL_DOMAINS.map((d) => ({ domain: d, score: scores[d] })));
    await hapticSuccess();
    setSaving(false);
    setEditing(false);
  };

  if (isLoading && latestScores.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-bg-primary" edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={["top", "bottom"]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={16}>
          <Ionicons name="chevron-back" size={24} color="#A1A1AA" />
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#F4F4F5" }}>Life Wheel</Text>
        <Pressable onPress={() => setEditing(!editing)} hitSlop={16}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#A78BFA" }}>{editing ? "Cancel" : "Re-assess"}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Average Score */}
        <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: "center", marginVertical: 24 }}>
          <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: "#8B5CF615", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#8B5CF640" }}>
            <Text style={{ fontSize: 32, fontWeight: "800", color: "#A78BFA" }}>{average.toFixed(1)}</Text>
            <Text style={{ fontSize: 11, color: "#A1A1AA", fontWeight: "500" }}>AVERAGE</Text>
          </View>
          <Text style={{ fontSize: 14, color: "#71717A", marginTop: 8 }}>
            {average >= 7 ? "Looking great across the board!" : average >= 5 ? "Room to grow in some areas" : "Let's work on lifting these up"}
          </Text>
        </Animated.View>

        {/* Domain Bars */}
        {ALL_DOMAINS.map((domain, idx) => {
          const meta = DOMAIN_META[domain];
          const score = scores[domain];
          return (
            <Animated.View key={domain} entering={FadeInDown.delay(idx * 60).duration(400)} style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <Ionicons name={meta.icon as any} size={18} color={meta.color} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#F4F4F5", flex: 1 }}>{meta.label}</Text>
                <Text style={{ fontSize: 18, fontWeight: "800", color: meta.color }}>{score}</Text>
              </View>

              {editing ? (
                <View style={{ flexDirection: "row", gap: 4 }}>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
                    <Pressable
                      key={val}
                      onPress={() => {
                        setScores((prev) => ({ ...prev, [domain]: val }));
                        hapticLight();
                      }}
                      style={{
                        flex: 1, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center",
                        backgroundColor: val <= score ? meta.color + "30" : "#1E1E27",
                        borderWidth: 1,
                        borderColor: val <= score ? meta.color + "50" : "#27272A40",
                      }}
                    >
                      <Text style={{ fontSize: 12, color: val <= score ? meta.color : "#52525B", fontWeight: "600" }}>{val}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View style={{ height: 12, backgroundColor: "#1E1E27", borderRadius: 6, overflow: "hidden" }}>
                  <View style={{ width: `${score * 10}%`, height: "100%", backgroundColor: meta.color + "60", borderRadius: 6 }} />
                </View>
              )}
            </Animated.View>
          );
        })}

        {editing && (
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={{
              backgroundColor: "#8B5CF6",
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: "center",
              marginTop: 8,
              opacity: saving ? 0.6 : 1,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: "white" }}>
              {saving ? "Saving..." : "Save Assessment"}
            </Text>
          </Pressable>
        )}

        {latestScores.length > 0 && latestScores[0].assessed_at && (
          <Text style={{ fontSize: 12, color: "#52525B", textAlign: "center", marginTop: 16 }}>
            Last assessed {new Date(latestScores[0].assessed_at).toLocaleDateString()}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
