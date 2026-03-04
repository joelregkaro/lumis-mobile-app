import { useEffect, useState } from "react";
import { View, Text, Pressable, TextInput, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useEchoStore } from "@/store/echo";
import { useHabitStore } from "@/store/habits";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import type { SessionEcho } from "@/types/database";
import type { HabitFrequency } from "@/types/database";

const OUTCOMES = [
  { key: "done", label: "Did it", icon: "checkmark-circle" as const, color: "#2DD4BF", bg: "#2DD4BF20" },
  { key: "partially", label: "Partially", icon: "ellipse-outline" as const, color: "#FBBF24", bg: "#FBBF2420" },
  { key: "not_done", label: "Not yet", icon: "close-circle-outline" as const, color: "#71717A", bg: "#71717A20" },
  { key: "rescheduled", label: "Reschedule", icon: "calendar-outline" as const, color: "#60A5FA", bg: "#60A5FA20" },
] as const;

const FREQUENCY_OPTIONS: { key: HabitFrequency; label: string }[] = [
  { key: "daily", label: "Every day" },
  { key: "weekdays", label: "Weekdays" },
  { key: "weekends", label: "Weekends" },
  { key: "weekly", label: "Once a week" },
];

const RESCHEDULE_OPTIONS = [
  { label: "Tomorrow", days: 1 },
  { label: "In 2 days", days: 2 },
  { label: "Next week", days: 7 },
];

export default function CommitmentResponseScreen() {
  const router = useRouter();
  const { echoId } = useLocalSearchParams<{ echoId: string }>();
  const { pendingEchoes, fetchPendingEchoes, respondToCommitment } = useEchoStore();
  const { createHabit } = useHabitStore();
  const [echo, setEcho] = useState<SessionEcho | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [showMakeHabit, setShowMakeHabit] = useState(false);
  const [habitFrequency, setHabitFrequency] = useState<HabitFrequency>("daily");
  const [habitCreated, setHabitCreated] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);

  useEffect(() => {
    if (pendingEchoes.length === 0) {
      fetchPendingEchoes();
    }
  }, []);

  useEffect(() => {
    if (echoId && pendingEchoes.length > 0) {
      const found = pendingEchoes.find((e) => e.id === echoId);
      if (found) setEcho(found);
    } else if (pendingEchoes.length > 0) {
      const commitment = pendingEchoes.find((e) => e.committed_for);
      if (commitment) setEcho(commitment);
    }
  }, [echoId, pendingEchoes]);

  const handleSubmit = async () => {
    if (!echo || !selectedOutcome) return;
    if (selectedOutcome === "rescheduled" && !showReschedule) {
      setShowReschedule(true);
      return;
    }
    setSaving(true);
    await respondToCommitment(echo.id, selectedOutcome as any, note.trim() || null);
    await hapticSuccess();
    setSaving(false);
    setDone(true);
  };

  const handleReschedule = async (days: number) => {
    if (!echo) return;
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + days);
    newDate.setHours(9, 0, 0, 0);
    setSaving(true);
    await respondToCommitment(echo.id, "rescheduled", note.trim() || null, newDate.toISOString());
    await hapticSuccess();
    setSaving(false);
    router.replace("/(tabs)/home");
  };

  const handleCreateHabit = async () => {
    if (!echo) return;
    await createHabit({
      title: echo.action_item,
      description: echo.context ?? undefined,
      frequency: habitFrequency,
      source_echo_id: echo.id,
    });
    await hapticSuccess();
    setHabitCreated(true);
  };

  if (done) {
    const isDone = selectedOutcome === "done";
    return (
      <SafeAreaView className="flex-1 bg-bg-primary" edges={["top", "bottom"]}>
        <Animated.View entering={FadeInDown.duration(400)} style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>{isDone ? "🎉" : "💜"}</Text>
          <Text style={{ fontSize: 22, fontWeight: "700", color: "#F4F4F5", textAlign: "center" }}>
            {isDone ? "You followed through!" : "No judgment at all."}
          </Text>
          <Text style={{ fontSize: 15, color: "#A1A1AA", textAlign: "center", marginTop: 8, lineHeight: 22 }}>
            {isDone
              ? "That's not just a win — that's who you're becoming."
              : "What matters is that you noticed. Want to talk about what got in the way?"}
          </Text>

          {/* Make it a habit CTA (only for completed commitments) */}
          {isDone && !showMakeHabit && !habitCreated && (
            <Animated.View entering={FadeInDown.delay(300).duration(400)} style={{ marginTop: 24, width: "100%" }}>
              <Pressable
                onPress={() => { setShowMakeHabit(true); hapticLight(); }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#2DD4BF15",
                  borderRadius: 14,
                  paddingVertical: 14,
                  borderWidth: 1,
                  borderColor: "#2DD4BF30",
                }}
              >
                <Ionicons name="refresh-outline" size={18} color="#2DD4BF" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#2DD4BF" }}>Make this a habit?</Text>
              </Pressable>
            </Animated.View>
          )}

          {isDone && showMakeHabit && !habitCreated && (
            <Animated.View entering={FadeInDown.duration(400)} style={{ marginTop: 20, width: "100%" }}>
              <Text style={{ fontSize: 14, color: "#A1A1AA", marginBottom: 12, textAlign: "center" }}>
                How often do you want to do this?
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                {FREQUENCY_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.key}
                    onPress={() => { setHabitFrequency(opt.key); hapticLight(); }}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 20,
                      backgroundColor: habitFrequency === opt.key ? "#2DD4BF20" : "#1E1E27",
                      borderWidth: 1,
                      borderColor: habitFrequency === opt.key ? "#2DD4BF50" : "#27272A40",
                    }}
                  >
                    <Text style={{
                      fontSize: 14,
                      fontWeight: "500",
                      color: habitFrequency === opt.key ? "#2DD4BF" : "#A1A1AA",
                    }}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                onPress={handleCreateHabit}
                style={{ marginTop: 16, backgroundColor: "#2DD4BF", borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
              >
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#0D0D12" }}>Start tracking</Text>
              </Pressable>
            </Animated.View>
          )}

          {habitCreated && (
            <Animated.View entering={FadeInDown.duration(400)} style={{ marginTop: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="checkmark-circle" size={18} color="#2DD4BF" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 14, color: "#2DD4BF", fontWeight: "500" }}>Habit created! You'll see it on your home screen.</Text>
              </View>
            </Animated.View>
          )}

          <View style={{ flexDirection: "row", gap: 12, marginTop: 28 }}>
            <Pressable
              onPress={() => router.replace("/(tabs)/home")}
              style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: "#1E1E27", borderRadius: 12 }}
            >
              <Text style={{ fontSize: 14, color: "#A1A1AA", fontWeight: "500" }}>Done</Text>
            </Pressable>
            {!isDone && (
              <Pressable
                onPress={() => router.replace("/(tabs)/chat")}
                style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: "#8B5CF6", borderRadius: 12 }}
              >
                <Text style={{ fontSize: 14, color: "white", fontWeight: "600" }}>Let's talk</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  if (!echo) {
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
          <Ionicons name="close" size={24} color="#A1A1AA" />
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#F4F4F5" }}>How'd it go?</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        {/* Commitment card */}
        <Animated.View entering={FadeInDown.duration(400)} style={{ backgroundColor: "#1E1E27", borderRadius: 16, padding: 18, marginTop: 20, borderLeftWidth: 3, borderLeftColor: "#8B5CF6" }}>
          <Text style={{ fontSize: 12, color: "#A1A1AA", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            You said you'd
          </Text>
          <Text style={{ fontSize: 17, color: "#F4F4F5", fontWeight: "600", lineHeight: 24 }}>
            {echo.action_item}
          </Text>
          {echo.context && (
            <Text style={{ fontSize: 13, color: "#71717A", marginTop: 6 }}>{echo.context}</Text>
          )}
        </Animated.View>

        {/* Outcome buttons */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={{ marginTop: 24 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {OUTCOMES.map((o) => {
              const isSelected = selectedOutcome === o.key;
              return (
                <Pressable
                  key={o.key}
                  onPress={async () => { await hapticLight(); setSelectedOutcome(o.key); }}
                  style={{
                    flex: 1, minWidth: "45%", paddingVertical: 16, borderRadius: 14, alignItems: "center",
                    backgroundColor: isSelected ? o.bg : "#16161D",
                    borderWidth: 1, borderColor: isSelected ? o.color + "60" : "#27272A40",
                  }}
                >
                  <Ionicons name={o.icon} size={24} color={isSelected ? o.color : "#52525B"} />
                  <Text style={{ fontSize: 14, fontWeight: "600", color: isSelected ? o.color : "#A1A1AA", marginTop: 6 }}>
                    {o.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Optional note */}
        {selectedOutcome && (
          <Animated.View entering={FadeInDown.duration(400)} style={{ marginTop: 20 }}>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={selectedOutcome === "done" ? "How did it feel?" : "What got in the way?"}
              placeholderTextColor="#52525B"
              style={{
                backgroundColor: "#1E1E27", borderRadius: 12, padding: 14, fontSize: 15, color: "#F4F4F5",
                borderWidth: 1, borderColor: "#27272A40",
              }}
            />
          </Animated.View>
        )}

        {/* Reschedule picker */}
        {showReschedule && (
          <Animated.View entering={FadeInDown.duration(400)} style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 14, color: "#A1A1AA", marginBottom: 12 }}>When do you want to try again?</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {RESCHEDULE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.days}
                  onPress={() => handleReschedule(opt.days)}
                  disabled={saving}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 12,
                    backgroundColor: "#60A5FA15",
                    borderWidth: 1,
                    borderColor: "#60A5FA30",
                    alignItems: "center",
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#60A5FA" }}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Submit */}
        {selectedOutcome && !showReschedule && (
          <Animated.View entering={FadeInDown.duration(300)} style={{ marginTop: 20 }}>
            <Pressable
              onPress={handleSubmit}
              disabled={saving}
              style={{
                backgroundColor: "#8B5CF6", borderRadius: 14, paddingVertical: 16, alignItems: "center",
                opacity: saving ? 0.6 : 1,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: "white" }}>
                {saving ? "Saving..." : "Submit"}
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}
