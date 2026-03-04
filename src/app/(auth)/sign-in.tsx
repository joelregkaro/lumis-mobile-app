import { useState, useRef } from "react";
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
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const passwordRef = useRef<TextInput>(null);

  const validate = () => {
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = "Email is required";
    if (!password.trim()) next.password = "Password is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSignIn = async () => {
    if (!validate()) return;
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
    <SafeAreaView className="flex-1 bg-bg-primary">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-1 justify-center px-lg">
          <Animated.View entering={FadeInDown.duration(400)} className="mb-xl items-center">
            <CompanionAvatar expression="warm" size="medium" />
            <Text className="mt-lg text-h1 font-inter-semibold text-text-primary">
              Welcome back
            </Text>
            <Text className="mt-xs text-body text-text-secondary">
              Your conversations are waiting for you.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            {Platform.OS === "ios" && (
              <Pressable
                onPress={handleAppleSignIn}
                disabled={loading}
                className="mb-sm flex-row items-center justify-center rounded-lg bg-white py-4"
              >
                <Ionicons name="logo-apple" size={20} color="black" style={{ marginRight: 8 }} />
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
              <Ionicons name="logo-google" size={18} color="#F4F4F5" style={{ marginRight: 8 }} />
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
              className="mb-xs rounded-lg bg-bg-surface px-md py-4 text-body text-text-primary"
              placeholder="Email"
              placeholderTextColor="#5A6178"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
            />
            {errors.email && (
              <Text className="mb-sm text-small text-red-500">{errors.email}</Text>
            )}

            <View className="relative mb-xs">
              <TextInput
                ref={passwordRef}
                className="rounded-lg bg-bg-surface px-md py-4 pr-12 text-body text-text-primary"
                placeholder="Password"
                placeholderTextColor="#5A6178"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
                }}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleSignIn}
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-0 bottom-0 justify-center"
                hitSlop={8}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#71717A"
                />
              </Pressable>
            </View>
            {errors.password && (
              <Text className="mb-sm text-small text-red-500">{errors.password}</Text>
            )}

            {!errors.password && <View className="mb-md" />}

            <Pressable
              onPress={handleSignIn}
              disabled={loading}
              className={`mb-md items-center rounded-lg py-4 ${
                loading ? "bg-brand-purple/50" : "bg-brand-purple"
              }`}
            >
              <Text className="text-body font-inter-semibold text-white">
                {loading ? "Signing in..." : "Sign In"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/(auth)/forgot-password")}
              className="items-center py-xs"
            >
              <Text className="text-body text-text-secondary">Forgot password?</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/(auth)/sign-up")}
              className="items-center py-md"
            >
              <Text className="text-body text-text-secondary">
                Don't have an account?{" "}
                <Text className="text-brand-purple-light">Sign up</Text>
              </Text>
            </Pressable>
          </Animated.View>
        </View>

        <View className="px-lg pb-lg">
          <View className="flex-row items-center justify-center">
            <Ionicons name="lock-closed-outline" size={12} color="#52525B" style={{ marginRight: 4 }} />
            <Text className="text-center text-label text-text-tertiary">
              Your conversations are encrypted and never shared.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
