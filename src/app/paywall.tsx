import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import CompanionAvatar from "@/components/companion/CompanionAvatar";
import { useSubscriptionStore } from "@/store/subscription";
import { hapticLight, hapticSuccess } from "@/lib/haptics";

const FEATURES = [
  { icon: "chatbubble-outline" as const, text: "Unlimited sessions" },
  { icon: "brain-outline" as const, text: "Long-term memory that knows you" },
  { icon: "git-network-outline" as const, text: "Pattern insights & growth tracking" },
  { icon: "shield-checkmark-outline" as const, text: "All therapeutic tools" },
  { icon: "repeat-outline" as const, text: "Session Echoes & accountability" },
  { icon: "analytics-outline" as const, text: "Monthly Wrapped progress cards" },
];

export default function PaywallScreen() {
  const router = useRouter();
  const { offerings, isPro, isLoading, purchase, restore, fetchOfferings } = useSubscriptionStore();
  const [plan, setPlan] = useState<"annual" | "monthly">("annual");

  const dismiss = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    if (isPro) {
      hapticSuccess();
      dismiss();
      return;
    }
    fetchOfferings();
  }, [isPro]);

  const annualPkg = offerings?.annual;
  const monthlyPkg = offerings?.monthly;

  const handlePurchase = async () => {
    await hapticLight();
    const pkg = plan === "annual" ? annualPkg : monthlyPkg;
    if (!pkg) {
      Alert.alert("Not Available", "Subscriptions are not available on this device right now.");
      return;
    }
    try {
      await purchase(pkg);
    } catch {
      Alert.alert("Purchase Failed", "Something went wrong. Please try again.");
    }
  };

  const handleRestore = async () => {
    await hapticLight();
    const restored = await restore();
    if (restored) {
      Alert.alert("Restored!", "Your subscription has been restored.");
    } else {
      Alert.alert("No Purchases Found", "We couldn't find any previous purchases.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0C1120" }}>
      <View style={{ flex: 1 }}>
        {/* Close button */}
        <Pressable
          onPress={dismiss}
          style={{ position: "absolute", top: 16, right: 20, zIndex: 10, padding: 4 }}
          accessibilityLabel="Close paywall"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={24} color="#71717A" />
        </Pressable>

        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 20 }}>
          {/* Header */}
          <Animated.View entering={FadeIn.duration(600)} style={{ alignItems: "center", marginBottom: 32 }}>
            <CompanionAvatar expression="proud" size="medium" />
            <Text style={{ fontSize: 24, fontWeight: "700", color: "#F4F4F5", textAlign: "center", marginTop: 20 }}>
              Unlock Your Full Growth Journey
            </Text>
            <Text style={{ fontSize: 15, color: "#A1A1AA", textAlign: "center", marginTop: 8 }}>
              You've been making progress. Keep it going with unlimited access.
            </Text>
          </Animated.View>

          {/* Features */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={{ marginBottom: 28 }}>
            {FEATURES.map((f, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#8B5CF615", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                  <Ionicons name={f.icon} size={16} color="#A78BFA" />
                </View>
                <Text style={{ fontSize: 15, color: "#F4F4F5" }}>{f.text}</Text>
              </View>
            ))}
          </Animated.View>

          {/* Social Proof */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)} style={{ alignItems: "center", marginBottom: 24 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              {[
                { bg: "#7C3AED", initials: "AK" },
                { bg: "#0D9488", initials: "RJ" },
                { bg: "#EC4899", initials: "ML" },
                { bg: "#F59E0B", initials: "TS" },
                { bg: "#3B82F6", initials: "DP" },
              ].map((u, i) => (
                <View
                  key={i}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: u.bg,
                    alignItems: "center",
                    justifyContent: "center",
                    marginLeft: i === 0 ? 0 : -8,
                    borderWidth: 2,
                    borderColor: "#0C1120",
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: "700", color: "white" }}>{u.initials}</Text>
                </View>
              ))}
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#FBBF24", marginLeft: 10 }}>4.8★</Text>
            </View>
            <Text style={{ fontSize: 13, color: "#A1A1AA", textAlign: "center" }}>
              Join 2,000+ people on their growth journey
            </Text>
          </Animated.View>

          {/* Plan Toggle */}
          <Animated.View entering={FadeInDown.delay(400).duration(400)} style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => { setPlan("annual"); hapticLight(); }}
                style={{
                  flex: 1,
                  borderRadius: 16,
                  padding: 16,
                  backgroundColor: plan === "annual" ? "#8B5CF615" : "#16161D",
                  borderWidth: plan === "annual" ? 2 : 1,
                  borderColor: plan === "annual" ? "#8B5CF6" : "#27272A",
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#A78BFA" }}>ANNUAL</Text>
                  <View style={{ flexDirection: "row", gap: 4 }}>
                    <View style={{ backgroundColor: "#8B5CF620", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: "#A78BFA" }}>MOST POPULAR</Text>
                    </View>
                    <View style={{ backgroundColor: "#22C55E20", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: "600", color: "#22C55E" }}>SAVE 44%</Text>
                    </View>
                  </View>
                </View>
                <Text style={{ fontSize: 22, fontWeight: "700", color: "#F4F4F5", marginTop: 8 }}>
                  $99.99<Text style={{ fontSize: 14, fontWeight: "400", color: "#71717A" }}>/year</Text>
                </Text>
                <Text style={{ fontSize: 13, color: "#71717A", marginTop: 2 }}>$8.33/month</Text>
              </Pressable>

              <Pressable
                onPress={() => { setPlan("monthly"); hapticLight(); }}
                style={{
                  flex: 1,
                  borderRadius: 16,
                  padding: 16,
                  backgroundColor: plan === "monthly" ? "#8B5CF615" : "#16161D",
                  borderWidth: plan === "monthly" ? 2 : 1,
                  borderColor: plan === "monthly" ? "#8B5CF6" : "#27272A",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#A78BFA" }}>MONTHLY</Text>
                <Text style={{ fontSize: 22, fontWeight: "700", color: "#F4F4F5", marginTop: 8 }}>
                  $14.99<Text style={{ fontSize: 14, fontWeight: "400", color: "#71717A" }}>/month</Text>
                </Text>
                <Text style={{ fontSize: 13, color: "#71717A", marginTop: 2 }}>Cancel anytime</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>

        {/* Guarantee */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          <Text style={{ fontSize: 12, color: "#71717A", textAlign: "center" }}>
            14-day money-back guarantee · Cancel anytime
          </Text>
        </View>

        {/* CTA */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
          <Pressable
            onPress={handlePurchase}
            disabled={isLoading}
            accessibilityLabel="Start free trial"
            accessibilityRole="button"
          >
            <LinearGradient
              colors={["#7C3AED", "#6D28D9"]}
              style={{ borderRadius: 16, paddingVertical: 16, alignItems: "center" }}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{ fontSize: 17, fontWeight: "700", color: "white" }}>
                  Start 14-Day Free Trial
                </Text>
              )}
            </LinearGradient>
          </Pressable>

          <Text style={{ fontSize: 12, color: "#52525B", textAlign: "center", marginTop: 10 }}>
            14-day free trial, then {plan === "annual" ? "$99.99/year" : "$14.99/month"}. Cancel anytime.
          </Text>

          <Pressable onPress={handleRestore} style={{ alignItems: "center", paddingTop: 12 }}>
            <Text style={{ fontSize: 14, color: "#A78BFA" }}>Restore Purchases</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
