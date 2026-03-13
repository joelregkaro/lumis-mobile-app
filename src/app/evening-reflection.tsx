import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useDailyCheckinStore } from "@/store/dailyCheckin";
import * as Haptics from "expo-haptics";
import { screen } from "@/lib/analytics";

const RATINGS = [
  { value: 1, emoji: "😔", label: "Rough" },
  { value: 3, emoji: "😐", label: "Meh" },
  { value: 5, emoji: "🙂", label: "Okay" },
  { value: 7, emoji: "😊", label: "Good" },
  { value: 9, emoji: "🤩", label: "Great" },
];

export default function EveningReflectionScreen() {
  const navigation = useNavigation();
  const { todaysCheckin, setEveningReflection, fetchToday } = useDailyCheckinStore();

  useEffect(() => { screen("evening_reflection"); }, []);

  const [step, setStep] = useState(0);
  const [rating, setRating] = useState(0);
  const [wins, setWins] = useState<string[]>([]);
  const [winInput, setWinInput] = useState("");
  const [reflection, setReflection] = useState("");
  const [intentionDone, setIntentionDone] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  const hasIntention = !!todaysCheckin?.morning_intention;

  const haptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const addWin = useCallback(() => {
    if (winInput.trim()) {
      setWins((prev) => [...prev, winInput.trim()]);
      setWinInput("");
    }
  }, [winInput]);

  const save = useCallback(async () => {
    setSaving(true);
    await setEveningReflection(reflection, intentionDone, wins, rating);
    await fetchToday();
    setSaving(false);
    navigation.goBack();
  }, [reflection, intentionDone, wins, rating, setEveningReflection, fetchToday, navigation]);

  return (
    <LinearGradient colors={["#0B0F1A", "#111827", "#0B0F1A"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
              <Pressable onPress={() => navigation.goBack()}>
                <Text style={{ color: "#5A6178", fontSize: 16 }}>Cancel</Text>
              </Pressable>
              <Text style={{ color: "#EAEDF3", fontSize: 18, fontWeight: "700" }}>
                Evening Reflection
              </Text>
              <View style={{ width: 48 }} />
            </View>

            {/* Step 1: Day Rating */}
            {step >= 0 && (
              <Animated.View entering={FadeInDown.duration(400)}>
                <Text style={{ color: "#EAEDF3", fontSize: 20, fontWeight: "600", marginBottom: 6 }}>
                  How was your day?
                </Text>
                <Text style={{ color: "#5A6178", fontSize: 14, marginBottom: 16 }}>
                  No right answer. Just check in with yourself.
                </Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 28 }}>
                  {RATINGS.map((r) => (
                    <Pressable
                      key={r.value}
                      onPress={() => { haptic(); setRating(r.value); if (step === 0) setTimeout(() => setStep(1), 300); }}
                      style={{
                        alignItems: "center",
                        opacity: rating === 0 || rating === r.value ? 1 : 0.4,
                        transform: [{ scale: rating === r.value ? 1.2 : 1 }],
                      }}
                    >
                      <Text style={{ fontSize: 32 }}>{r.emoji}</Text>
                      <Text style={{ color: rating === r.value ? "#EAEDF3" : "#5A6178", fontSize: 12, marginTop: 4 }}>
                        {r.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* Step 2: Morning Intention Follow-up */}
            {step >= 1 && hasIntention && (
              <Animated.View entering={FadeInDown.duration(400)} style={{ marginBottom: 28 }}>
                <Text style={{ color: "#EAEDF3", fontSize: 16, fontWeight: "600", marginBottom: 6 }}>
                  This morning you said:
                </Text>
                <View style={{ backgroundColor: "#1A1F35", borderRadius: 12, padding: 14, borderLeftWidth: 3, borderLeftColor: "#FBBF24", marginBottom: 12 }}>
                  <Text style={{ color: "#EAEDF3", fontSize: 15, fontStyle: "italic" }}>
                    "{todaysCheckin?.morning_intention}"
                  </Text>
                </View>
                <Text style={{ color: "#5A6178", fontSize: 14, marginBottom: 10 }}>Did you follow through?</Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {[
                    { val: true, label: "Yes", color: "#2DD4BF" },
                    { val: false, label: "Not quite", color: "#F87171" },
                    { val: null, label: "Partly", color: "#A78BFA" },
                  ].map((opt) => (
                    <Pressable
                      key={String(opt.val)}
                      onPress={() => { haptic(); setIntentionDone(opt.val); if (step === 1) setTimeout(() => setStep(2), 300); }}
                      style={{
                        flex: 1,
                        backgroundColor: intentionDone === opt.val ? opt.color + "30" : "#1A1F35",
                        borderRadius: 10,
                        padding: 12,
                        alignItems: "center",
                        borderWidth: intentionDone === opt.val ? 1 : 0,
                        borderColor: opt.color,
                      }}
                    >
                      <Text style={{ color: intentionDone === opt.val ? opt.color : "#EAEDF3", fontWeight: "600" }}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* Auto-advance if no intention */}
            {step >= 1 && !hasIntention && step < 2 && (() => { setTimeout(() => setStep(2), 100); return null; })()}

            {/* Step 3: Wins */}
            {step >= 2 && (
              <Animated.View entering={FadeInDown.duration(400)} style={{ marginBottom: 28 }}>
                <Text style={{ color: "#EAEDF3", fontSize: 16, fontWeight: "600", marginBottom: 6 }}>
                  Any wins today? Even small ones count.
                </Text>
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                  <TextInput
                    value={winInput}
                    onChangeText={setWinInput}
                    placeholder="e.g. Took a walk at lunch"
                    placeholderTextColor="#5A6178"
                    style={{
                      flex: 1,
                      backgroundColor: "#1A1F35",
                      borderRadius: 10,
                      padding: 12,
                      color: "#EAEDF3",
                      fontSize: 15,
                    }}
                    onSubmitEditing={addWin}
                    returnKeyType="done"
                  />
                  <Pressable
                    onPress={addWin}
                    style={{ backgroundColor: "#A78BFA30", borderRadius: 10, padding: 12, justifyContent: "center" }}
                  >
                    <Text style={{ color: "#A78BFA", fontWeight: "700", fontSize: 16 }}>+</Text>
                  </Pressable>
                </View>
                {wins.map((w, i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <Text style={{ color: "#2DD4BF" }}>✓</Text>
                    <Text style={{ color: "#EAEDF3", fontSize: 14 }}>{w}</Text>
                  </View>
                ))}
                {step === 2 && (
                  <Pressable
                    onPress={() => setStep(3)}
                    style={{ marginTop: 12, alignSelf: "flex-end" }}
                  >
                    <Text style={{ color: "#A78BFA", fontSize: 14, fontWeight: "600" }}>
                      {wins.length > 0 ? "Next →" : "Skip →"}
                    </Text>
                  </Pressable>
                )}
              </Animated.View>
            )}

            {/* Step 4: Free Reflection */}
            {step >= 3 && (
              <Animated.View entering={FadeInDown.duration(400)} style={{ marginBottom: 28 }}>
                <Text style={{ color: "#EAEDF3", fontSize: 16, fontWeight: "600", marginBottom: 6 }}>
                  Anything on your mind before bed?
                </Text>
                <Text style={{ color: "#5A6178", fontSize: 13, marginBottom: 10 }}>
                  Optional — even a sentence helps you process the day.
                </Text>
                <TextInput
                  value={reflection}
                  onChangeText={setReflection}
                  placeholder="Write freely..."
                  placeholderTextColor="#5A6178"
                  multiline
                  style={{
                    backgroundColor: "#1A1F35",
                    borderRadius: 12,
                    padding: 14,
                    color: "#EAEDF3",
                    fontSize: 15,
                    minHeight: 100,
                    textAlignVertical: "top",
                  }}
                />
              </Animated.View>
            )}

            {/* Save Button */}
            {step >= 3 && (
              <Animated.View entering={FadeInUp.duration(400)}>
                <Pressable
                  onPress={save}
                  disabled={saving || rating === 0}
                  style={{
                    backgroundColor: rating > 0 ? "#A78BFA" : "#3A3F52",
                    borderRadius: 14,
                    padding: 16,
                    alignItems: "center",
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>
                    {saving ? "Saving..." : "Done for today ✨"}
                  </Text>
                </Pressable>
              </Animated.View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
