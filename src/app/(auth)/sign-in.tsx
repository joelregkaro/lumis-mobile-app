import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import CompanionAvatar from "@/components/companion/CompanionAvatar";
import { useAuthStore } from "@/store/auth";

export default function SignInScreen() {
  const router = useRouter();
  const { signInWithEmail, signInWithApple, signInWithGoogle } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      router.replace("/");
    } catch (err: any) {
      Alert.alert("Sign in failed", err?.message ?? "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithApple();
      router.replace("/");
    } catch (err: any) {
      if (err?.code !== "ERR_REQUEST_CANCELED") {
        Alert.alert("Apple Sign In failed", err?.message ?? "Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      router.replace("/");
    } catch (err: any) {
      Alert.alert("Google Sign In failed", err?.message ?? "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0D0D12" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>
          <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: "center", marginBottom: 40 }}>
            <CompanionAvatar expression="warm" size="medium" />
            <Text style={{ fontSize: 28, fontWeight: "700", color: "#F4F4F5", marginTop: 24, letterSpacing: -0.5 }}>
              Welcome back
            </Text>
            <Text style={{ fontSize: 15, color: "#71717A", marginTop: 8 }}>
              Your conversations are waiting for you.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            {Platform.OS === "ios" && (
              <Pressable
                onPress={handleAppleSignIn}
                disabled={loading}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "white",
                  borderRadius: 14,
                  paddingVertical: 14,
                  marginBottom: 10,
                }}
              >
                <Ionicons name="logo-apple" size={20} color="black" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 15, fontWeight: "600", color: "black" }}>Continue with Apple</Text>
              </Pressable>
            )}

            <Pressable
              onPress={handleGoogleSignIn}
              disabled={loading}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#16161D",
                borderRadius: 14,
                paddingVertical: 14,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: "#27272A",
              }}
            >
              <Ionicons name="logo-google" size={18} color="#F4F4F5" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#F4F4F5" }}>Continue with Google</Text>
            </Pressable>

            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
              <View style={{ flex: 1, height: 0.5, backgroundColor: "#27272A" }} />
              <Text style={{ marginHorizontal: 16, fontSize: 13, color: "#52525B" }}>or</Text>
              <View style={{ flex: 1, height: 0.5, backgroundColor: "#27272A" }} />
            </View>

            <TextInput
              style={{
                backgroundColor: "#16161D",
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 15,
                color: "#F4F4F5",
                marginBottom: 10,
                borderWidth: 1,
                borderColor: "#27272A",
              }}
              placeholder="Email"
              placeholderTextColor="#52525B"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={{
                backgroundColor: "#16161D",
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 15,
                color: "#F4F4F5",
                marginBottom: 24,
                borderWidth: 1,
                borderColor: "#27272A",
              }}
              placeholder="Password"
              placeholderTextColor="#52525B"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Pressable
              onPress={handleSignIn}
              disabled={loading}
              style={{
                alignItems: "center",
                borderRadius: 14,
                paddingVertical: 14,
                backgroundColor: loading ? "#8B5CF680" : "#8B5CF6",
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "600", color: "white" }}>
                {loading ? "Signing in..." : "Sign In"}
              </Text>
            </Pressable>

            <Pressable onPress={() => router.push("/(auth)/forgot-password")} style={{ alignItems: "center", paddingVertical: 8 }}>
              <Text style={{ fontSize: 14, color: "#71717A" }}>Forgot password?</Text>
            </Pressable>

            <Pressable onPress={() => router.push("/(auth)/sign-up")} style={{ alignItems: "center", paddingVertical: 12 }}>
              <Text style={{ fontSize: 14, color: "#71717A" }}>
                Don't have an account? <Text style={{ color: "#A78BFA", fontWeight: "500" }}>Sign up</Text>
              </Text>
            </Pressable>
          </Animated.View>
        </View>

        <View style={{ paddingHorizontal: 24, paddingBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="lock-closed-outline" size={12} color="#52525B" style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 12, color: "#52525B", textAlign: "center" }}>
              Your conversations are encrypted and never shared.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
