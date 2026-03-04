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
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Please try again.");
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
          {sent ? (
            <Animated.View entering={FadeInDown.duration(400)} className="items-center">
              <Text className="text-stat">📬</Text>
              <Text className="mt-lg text-h2 font-inter-semibold text-text-primary">
                Check your email
              </Text>
              <Text className="mt-sm text-center text-body text-text-secondary">
                We sent a password reset link to{"\n"}
                <Text className="text-brand-purple-light">{email}</Text>
              </Text>
              <Pressable
                onPress={() => router.back()}
                className="mt-xl items-center rounded-lg bg-brand-purple px-8 py-4"
              >
                <Text className="text-body font-inter-semibold text-white">
                  Back to Sign In
                </Text>
              </Pressable>
            </Animated.View>
          ) : (
            <>
              <Animated.View entering={FadeInDown.duration(400)} className="mb-xl">
                <Text className="text-h1 font-inter-semibold text-text-primary">
                  Reset Password
                </Text>
                <Text className="mt-sm text-body text-text-secondary">
                  Enter your email and we'll send you a link to reset your password.
                </Text>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                <TextInput
                  className="mb-lg rounded-lg bg-bg-surface px-md py-4 text-body text-text-primary"
                  placeholder="Email"
                  placeholderTextColor="#5A6178"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Pressable
                  onPress={handleReset}
                  disabled={loading}
                  className={`mb-md items-center rounded-lg py-4 ${
                    loading ? "bg-brand-purple/50" : "bg-brand-purple"
                  }`}
                >
                  <Text className="text-body font-inter-semibold text-white">
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => router.back()}
                  className="items-center py-md"
                >
                  <Text className="text-body text-text-secondary">
                    ← Back to Sign In
                  </Text>
                </Pressable>
              </Animated.View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
