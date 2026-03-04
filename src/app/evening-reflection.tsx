import { useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useDailyCheckinStore } from "@/store/dailyCheckin";
import { useStreakStore } from "@/store/streak";
import { hapticLight, hapticSuccess } from "@/lib/haptics";

const RATING_EMOJIS = ["😞", "😔", "😐", "🙂", "😊", "😄", "🤩", "💪", "🌟", "🔥"];

export default function EveningReflectionScreen() {
  const router = useRouter();
  const todaysCheckin = useDailyCheckinStore((s) => s.todaysCheckin);
  const setEveningReflection = useDailyCheckinStore((s) => s.setEveningReflection);
  const updateStreak = useStreakStore((s) => s.updateStreak);

  const [step, setStep] = useState(1);
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [reflection, setReflection] = useState("");
  const [rating, setRating] = useState(5);
  const [saving, setSaving] = useState(false);

  const intention = todaysCheckin?.morning_intention;

  const handleSave = async () => {
    setSaving(true);
    await hapticSuccess();
    await setEveningReflection(
      reflection,
      completed,
      reflection ? [reflection] : [],
      rating,
    );
    await updateStreak();
    setSaving(false);
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={["top", "bottom"]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={16}>
          <Ionicons name="close" size={24} color="#A1A1AA" />
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#F4F4F5" }}>Evening Reflection</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Step 1: Did you do the thing? */}
        {step >= 1 && (
          <Animated.View entering={FadeInDown.duration(400)} style={{ marginBottom: 24 }}>
            <View style={{ alignItems: "center", marginVertical: 20 }}>
              <Ionicons name="moon-outline" size={40} color="#A78BFA" />
              <Text style={{ fontSize: 22, fontWeight: "700", color: "#F4F4F5", marginTop: 12, textAlign: "center" }}>
                How was today?
              </Text>
            </View>

            {intention && (
              <View style={{ backgroundColor: "#1E1E27", borderRadius: 16, padding: 16, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: "#8B5CF6" }}>
                <Text style={{ fontSize: 12, color: "#A1A1AA", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                  This morning you said
                </Text>
                <Text style={{ fontSize: 16, color: "#F4F4F5", fontWeight: "500" }}>"{intention}"</Text>

                <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                  {(["yes", "partially", "no"] as const).map((val) => {
                    const labels = { yes: "Did it", partially: "Partially", no: "Not today" };
                    const colors = { yes: "#2DD4BF", partially: "#FBBF24", no: "#71717A" };
                    const isSelected = completed === (val === "yes" ? true : val === "no" ? false : null);
                    return (
                      <Pressable
                        key={val}
                        onPress={async () => {
                          await hapticLight();
                          setCompleted(val === "yes" ? true : val === "no" ? false : null);
                          if (step === 1) setStep(2);
                        }}
                        style={{
                          flex: 1,
                          paddingVertical: 12,
                          borderRadius: 12,
                          alignItems: "center",
                          backgroundColor: isSelected ? colors[val] + "20" : "#16161D",
                          borderWidth: 1,
                          borderColor: isSelected ? colors[val] + "60" : "#27272A40",
                        }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: "600", color: isSelected ? colors[val] : "#A1A1AA" }}>
                          {labels[val]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {!intention && step === 1 && (
              <Pressable
                onPress={() => setStep(2)}
                style={{ alignSelf: "center", paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#8B5CF620", borderRadius: 12 }}
              >
                <Text style={{ fontSize: 14, color: "#A78BFA", fontWeight: "500" }}>Continue</Text>
              </Pressable>
            )}
          </Animated.View>
        )}

        {/* Step 2: What went well? */}
        {step >= 2 && (
          <Animated.View entering={FadeInDown.duration(400)} style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 17, fontWeight: "600", color: "#F4F4F5", marginBottom: 10 }}>
              What went well today?
            </Text>
            <TextInput
              value={reflection}
              onChangeText={setReflection}
              placeholder="Even small wins count..."
              placeholderTextColor="#52525B"
              multiline
              style={{
                backgroundColor: "#1E1E27",
                borderRadius: 14,
                padding: 16,
                fontSize: 15,
                color: "#F4F4F5",
                minHeight: 80,
                textAlignVertical: "top",
                borderWidth: 1,
                borderColor: "#27272A40",
              }}
            />
            {step === 2 && (
              <Pressable
                onPress={() => setStep(3)}
                style={{ alignSelf: "flex-end", marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#8B5CF620", borderRadius: 12 }}
              >
                <Text style={{ fontSize: 14, color: "#A78BFA", fontWeight: "500" }}>Next</Text>
              </Pressable>
            )}
          </Animated.View>
        )}

        {/* Step 3: Day rating */}
        {step >= 3 && (
          <Animated.View entering={FadeInDown.duration(400)} style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 17, fontWeight: "600", color: "#F4F4F5", marginBottom: 6 }}>
              Rate your day
            </Text>
            <Text style={{ fontSize: 13, color: "#71717A", marginBottom: 16 }}>
              No judgment — just a snapshot.
            </Text>

            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              {RATING_EMOJIS.map((emoji, i) => {
                const val = i + 1;
                const isSelected = rating === val;
                return (
                  <Pressable
                    key={val}
                    onPress={async () => {
                      await hapticLight();
                      setRating(val);
                    }}
                    style={{
                      width: 32,
                      height: 40,
                      borderRadius: 10,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isSelected ? "#8B5CF620" : "transparent",
                      borderWidth: isSelected ? 1 : 0,
                      borderColor: "#8B5CF660",
                    }}
                  >
                    <Text style={{ fontSize: isSelected ? 22 : 16, opacity: isSelected ? 1 : 0.5 }}>{emoji}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 11, color: "#52525B" }}>Tough</Text>
              <Text style={{ fontSize: 11, color: "#52525B" }}>Amazing</Text>
            </View>

            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={{
                marginTop: 28,
                backgroundColor: "#8B5CF6",
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: "center",
                opacity: saving ? 0.6 : 1,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: "white" }}>
                {saving ? "Saving..." : "Wrap Up the Day"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                handleSave().then(() => {
                  router.replace("/(tabs)/chat");
                });
              }}
              style={{ alignSelf: "center", marginTop: 14, paddingVertical: 8 }}
            >
              <Text style={{ fontSize: 14, color: "#A78BFA", fontWeight: "500" }}>
                Or talk about my day first →
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
