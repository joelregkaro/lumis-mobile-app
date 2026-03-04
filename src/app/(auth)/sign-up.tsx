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
import Animated, { FadeInDown } from "react-native-reanimated";
import CompanionAvatar from "@/components/companion/CompanionAvatar";
import { useAuthStore } from "@/store/auth";

export default function SignUpScreen() {
  const router = useRouter();
  const { signUpWithEmail, signInWithApple, signInWithGoogle } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim()) return;
    if (password.length < 6) {
      Alert.alert("Password too short", "Please use at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail(email, password);
      router.replace("/");
    } catch (err: any) {
      Alert.alert("Sign up failed", err?.message ?? "Please try again.");
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
    <SafeAreaView className="flex-1 bg-bg-primary">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-1 justify-center px-lg">
          <Animated.View entering={FadeInDown.duration(400)} className="mb-xl items-center">
            <CompanionAvatar expression="curious" size="medium" />
            <Text className="mt-lg text-h1 font-inter-semibold text-text-primary">
              Begin your journey
            </Text>
            <Text className="mt-xs text-center text-body text-text-secondary">
              No labels. No pressure. Just a space to grow.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            {/* Social auth buttons */}
            {Platform.OS === "ios" && (
              <Pressable
                onPress={handleAppleSignIn}
                disabled={loading}
                className="mb-sm flex-row items-center justify-center rounded-lg bg-white py-4"
              >
                <Text className="mr-sm text-lg">🍎</Text>
                <Text className="text-body font-inter-semibold text-black">
                  Continue with Apple
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={handleGoogleSignIn}
              disabled={loading}
              className="mb-md flex-row items-center justify-center rounded-lg border border-bg-elevated bg-bg-surface py-4"
            >
              <Text className="mr-sm text-lg">G</Text>
              <Text className="text-body font-inter-semibold text-text-primary">
                Continue with Google
              </Text>
            </Pressable>

            <View className="mb-md flex-row items-center">
              <View className="h-px flex-1 bg-bg-elevated" />
              <Text className="mx-md text-small text-text-tertiary">or</Text>
              <View className="h-px flex-1 bg-bg-elevated" />
            </View>

            <TextInput
              className="mb-sm rounded-lg bg-bg-surface px-md py-4 text-body text-text-primary"
              placeholder="Email"
              placeholderTextColor="#5A6178"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              className="mb-lg rounded-lg bg-bg-surface px-md py-4 text-body text-text-primary"
              placeholder="Password (6+ characters)"
              placeholderTextColor="#5A6178"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Pressable
              onPress={handleSignUp}
              disabled={loading}
              className={`mb-md items-center rounded-lg py-4 ${
                loading ? "bg-brand-purple/50" : "bg-brand-purple"
              }`}
            >
              <Text className="text-body font-inter-semibold text-white">
                {loading ? "Creating account..." : "Create Account"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.back()}
              className="items-center py-md"
            >
              <Text className="text-body text-text-secondary">
                Already have an account?{" "}
                <Text className="text-brand-purple-light">Sign in</Text>
              </Text>
            </Pressable>
          </Animated.View>
        </View>

        <View className="px-lg pb-lg">
          <Text className="text-center text-label text-text-tertiary">
            This is a wellness tool, not a replacement for professional therapy.{"\n"}
            Your data is encrypted and never shared.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
