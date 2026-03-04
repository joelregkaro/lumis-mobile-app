import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInRight } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useHabitStore } from "@/store/habits";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import type { Habit, HabitFrequency, HabitDifficulty, HabitCueType } from "@/types/database";

const CATEGORIES = [
  { key: "health", label: "Health", icon: "heart-outline" as const },
  { key: "mindfulness", label: "Mindfulness", icon: "leaf-outline" as const },
  { key: "social", label: "Social", icon: "people-outline" as const },
  { key: "productivity", label: "Productivity", icon: "briefcase-outline" as const },
  { key: "creativity", label: "Creativity", icon: "color-palette-outline" as const },
  { key: "rest", label: "Rest", icon: "bed-outline" as const },
];

const CELEBRATIONS = [
  { label: "Say \"Yes!\"", value: "Yes!" },
  { label: "Fist pump", value: "Fist pump!" },
  { label: "Smile to yourself", value: "😊" },
  { label: "Do a little dance", value: "💃" },
  { label: "Deep breath + \"Done\"", value: "Done." },
];

const FREQUENCIES: { key: HabitFrequency; label: string }[] = [
  { key: "daily", label: "Daily" },
  { key: "weekdays", label: "Weekdays" },
  { key: "weekends", label: "Weekends" },
  { key: "weekly", label: "Weekly" },
  { key: "custom", label: "Custom" },
];

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

interface Props {
  visible: boolean;
  onClose: () => void;
  editHabit?: Habit | null;
}

export default function AddHabitModal({ visible, onClose, editHabit }: Props) {
  const { createHabit, updateHabit, habits } = useHabitStore();

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [tinyVersion, setTinyVersion] = useState("");
  const [anchorBehavior, setAnchorBehavior] = useState("");
  const [frequency, setFrequency] = useState<HabitFrequency>("daily");
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [preferredTime, setPreferredTime] = useState<"morning" | "afternoon" | "evening" | null>(null);
  const [celebration, setCelebration] = useState("");
  const [customCelebration, setCustomCelebration] = useState("");
  const [identityStatement, setIdentityStatement] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isEditing = !!editHabit;

  useEffect(() => {
    if (editHabit) {
      setTitle(editHabit.title);
      setTinyVersion(editHabit.tiny_version ?? "");
      setAnchorBehavior(editHabit.anchor_behavior ?? "");
      setFrequency(editHabit.frequency);
      setCustomDays(editHabit.custom_days ?? []);
      setPreferredTime(editHabit.preferred_time);
      setCelebration(editHabit.celebration ?? "");
      setIdentityStatement(editHabit.identity_statement ?? "");
      setCategory(editHabit.category);
      setStep(0);
    }
  }, [editHabit]);

  const resetForm = () => {
    setStep(0);
    setTitle("");
    setTinyVersion("");
    setAnchorBehavior("");
    setFrequency("daily");
    setCustomDays([]);
    setPreferredTime(null);
    setCelebration("");
    setCustomCelebration("");
    setIdentityStatement("");
    setCategory(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const existingAnchors = habits
    .filter((h) => h.status === "active" && h.anchor_behavior)
    .map((h) => h.anchor_behavior!)
    .filter((v, i, arr) => arr.indexOf(v) === i);

  const existingHabitTitles = habits
    .filter((h) => h.status === "active")
    .map((h) => h.title);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const finalCelebration = customCelebration.trim() || celebration || null;
      if (isEditing && editHabit) {
        await updateHabit(editHabit.id, {
          title: title.trim(),
          tiny_version: tinyVersion.trim() || null,
          anchor_behavior: anchorBehavior.trim() || null,
          frequency,
          custom_days: frequency === "custom" ? customDays : null,
          preferred_time: preferredTime,
          celebration: finalCelebration,
          identity_statement: identityStatement.trim() || null,
          category,
        });
      } else {
        await createHabit({
          title: title.trim(),
          tiny_version: tinyVersion.trim() || undefined,
          anchor_behavior: anchorBehavior.trim() || undefined,
          frequency,
          custom_days: frequency === "custom" ? customDays : undefined,
          preferred_time: preferredTime ?? undefined,
          celebration: finalCelebration ?? undefined,
          identity_statement: identityStatement.trim() || undefined,
          category: category ?? undefined,
          difficulty: "tiny",
          cue_type: anchorBehavior.trim() ? "anchor" : (preferredTime ? "time" : undefined),
        });
      }
      await hapticSuccess();
      handleClose();
    } catch {
      // handled
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0: return title.trim().length > 0;
      case 1: return true; // tiny version optional
      case 2: return true; // anchor optional
      case 3: return frequency !== "custom" || customDays.length > 0;
      case 4: return true; // celebration optional
      default: return true;
    }
  };

  const totalSteps = 5;

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <Animated.View entering={FadeInRight.duration(250)} key="step-0">
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#EAEDF3", marginBottom: 6 }}>
              What habit do you want to build?
            </Text>
            <Text style={{ fontSize: 14, color: "#8B92A8", marginBottom: 20, lineHeight: 20 }}>
              Start with the full version. We'll make it tiny next.
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Meditate for 20 minutes"
              placeholderTextColor="#52525B"
              style={{
                backgroundColor: "#0C1120",
                borderRadius: 12,
                padding: 14,
                fontSize: 15,
                color: "#F4F4F5",
                marginBottom: 16,
              }}
              autoFocus
            />
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#8B92A8", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Category
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.key}
                  onPress={() => { setCategory(category === cat.key ? null : cat.key); hapticLight(); }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 20,
                    backgroundColor: category === cat.key ? "#2DD4BF20" : "#1E1E27",
                    borderWidth: 1,
                    borderColor: category === cat.key ? "#2DD4BF60" : "#242A4240",
                  }}
                >
                  <Ionicons name={cat.icon} size={14} color={category === cat.key ? "#2DD4BF" : "#5A6178"} style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 13, color: category === cat.key ? "#2DD4BF" : "#8B92A8", fontWeight: "500" }}>{cat.label}</Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        );

      case 1:
        return (
          <Animated.View entering={FadeInRight.duration(250)} key="step-1">
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#EAEDF3", marginBottom: 6 }}>
              What's the 30-second version?
            </Text>
            <Text style={{ fontSize: 14, color: "#8B92A8", marginBottom: 8, lineHeight: 20 }}>
              Make it so small you can't say no. This is how real habits form.
            </Text>
            <View style={{ backgroundColor: "#2DD4BF10", borderRadius: 12, padding: 12, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: "#2DD4BF" }}>
              <Text style={{ fontSize: 13, color: "#2DD4BF", fontWeight: "600", marginBottom: 4 }}>
                Full: {title || "..."}
              </Text>
              <Text style={{ fontSize: 13, color: "#8B92A8" }}>
                Tiny version: Something you can do in 30 seconds or less
              </Text>
            </View>
            <TextInput
              value={tinyVersion}
              onChangeText={setTinyVersion}
              placeholder="e.g., Sit and take 3 deep breaths"
              placeholderTextColor="#52525B"
              style={{
                backgroundColor: "#0C1120",
                borderRadius: 12,
                padding: 14,
                fontSize: 15,
                color: "#F4F4F5",
              }}
              autoFocus
            />
            <Text style={{ fontSize: 12, color: "#5A6178", marginTop: 8, fontStyle: "italic" }}>
              You'll start with the tiny version and level up as it becomes automatic.
            </Text>
          </Animated.View>
        );

      case 2:
        return (
          <Animated.View entering={FadeInRight.duration(250)} key="step-2">
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#EAEDF3", marginBottom: 6 }}>
              After I _____, I will do this
            </Text>
            <Text style={{ fontSize: 14, color: "#8B92A8", marginBottom: 16, lineHeight: 20 }}>
              Attach it to something you already do every day. This is your anchor.
            </Text>
            {(existingHabitTitles.length > 0 || existingAnchors.length > 0) && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#8B92A8", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Your existing routines
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {[...new Set([...existingAnchors, ...existingHabitTitles])].slice(0, 6).map((anchor) => (
                      <Pressable
                        key={anchor}
                        onPress={() => { setAnchorBehavior(anchor); hapticLight(); }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 16,
                          backgroundColor: anchorBehavior === anchor ? "#A78BFA20" : "#1E1E27",
                          borderWidth: 1,
                          borderColor: anchorBehavior === anchor ? "#A78BFA60" : "#242A4240",
                        }}
                      >
                        <Text style={{ fontSize: 13, color: anchorBehavior === anchor ? "#A78BFA" : "#8B92A8" }}>
                          {anchor}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
            <TextInput
              value={anchorBehavior}
              onChangeText={setAnchorBehavior}
              placeholder="e.g., Pour my morning coffee"
              placeholderTextColor="#52525B"
              style={{
                backgroundColor: "#0C1120",
                borderRadius: 12,
                padding: 14,
                fontSize: 15,
                color: "#F4F4F5",
              }}
            />
            {anchorBehavior.trim() && (
              <View style={{ backgroundColor: "#A78BFA10", borderRadius: 12, padding: 12, marginTop: 12, borderLeftWidth: 3, borderLeftColor: "#A78BFA" }}>
                <Text style={{ fontSize: 14, color: "#EAEDF3", lineHeight: 20 }}>
                  "After I <Text style={{ color: "#A78BFA", fontWeight: "600" }}>{anchorBehavior}</Text>, I will{" "}
                  <Text style={{ color: "#2DD4BF", fontWeight: "600" }}>{tinyVersion || title}</Text>."
                </Text>
              </View>
            )}
          </Animated.View>
        );

      case 3:
        return (
          <Animated.View entering={FadeInRight.duration(250)} key="step-3">
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#EAEDF3", marginBottom: 6 }}>
              How often?
            </Text>
            <Text style={{ fontSize: 14, color: "#8B92A8", marginBottom: 16, lineHeight: 20 }}>
              Daily is best for building automaticity. Less frequent is okay too.
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {FREQUENCIES.map((f) => (
                <Pressable
                  key={f.key}
                  onPress={() => { setFrequency(f.key); hapticLight(); }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: frequency === f.key ? "#2DD4BF20" : "#0C1120",
                    borderWidth: 1.5,
                    borderColor: frequency === f.key ? "#2DD4BF" : "#27272A",
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: frequency === f.key ? "#2DD4BF" : "#71717A" }}>
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {frequency === "custom" && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#8B92A8", marginBottom: 8 }}>Select days</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {DAY_LABELS.map((label, i) => (
                    <Pressable
                      key={i}
                      onPress={() => {
                        setCustomDays((prev) =>
                          prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i],
                        );
                        hapticLight();
                      }}
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: customDays.includes(i) ? "#2DD4BF20" : "#0C1120",
                        borderWidth: 1.5,
                        borderColor: customDays.includes(i) ? "#2DD4BF" : "#27272A",
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "600", color: customDays.includes(i) ? "#2DD4BF" : "#71717A" }}>
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#8B92A8", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Best time (optional)
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {([{ key: "morning" as const, emoji: "☀️" }, { key: "afternoon" as const, emoji: "🌤" }, { key: "evening" as const, emoji: "🌙" }]).map(({ key, emoji }) => (
                <Pressable
                  key={key}
                  onPress={() => { setPreferredTime(preferredTime === key ? null : key); hapticLight(); }}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: preferredTime === key ? "#A78BFA20" : "#0C1120",
                    borderWidth: 1.5,
                    borderColor: preferredTime === key ? "#A78BFA" : "#27272A",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 16, marginBottom: 2 }}>{emoji}</Text>
                  <Text style={{ fontSize: 11, fontWeight: "500", color: preferredTime === key ? "#A78BFA" : "#71717A", textTransform: "capitalize" }}>
                    {key}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        );

      case 4:
        return (
          <Animated.View entering={FadeInRight.duration(250)} key="step-4">
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#EAEDF3", marginBottom: 6 }}>
              How will you celebrate?
            </Text>
            <Text style={{ fontSize: 14, color: "#8B92A8", marginBottom: 16, lineHeight: 20 }}>
              Celebration wires the habit into your brain. Do it immediately after.
            </Text>
            <View style={{ gap: 8, marginBottom: 16 }}>
              {CELEBRATIONS.map((c) => (
                <Pressable
                  key={c.value}
                  onPress={() => { setCelebration(c.value); setCustomCelebration(""); hapticLight(); }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 14,
                    borderRadius: 12,
                    backgroundColor: celebration === c.value ? "#FBBF2420" : "#0C1120",
                    borderWidth: 1.5,
                    borderColor: celebration === c.value ? "#FBBF24" : "#27272A",
                  }}
                >
                  <Text style={{ fontSize: 15, color: celebration === c.value ? "#FBBF24" : "#8B92A8", fontWeight: "500" }}>
                    {c.label}
                  </Text>
                  {celebration === c.value && (
                    <Ionicons name="checkmark-circle" size={18} color="#FBBF24" style={{ marginLeft: "auto" }} />
                  )}
                </Pressable>
              ))}
            </View>
            <TextInput
              value={customCelebration}
              onChangeText={(t) => { setCustomCelebration(t); setCelebration(""); }}
              placeholder="Or type your own..."
              placeholderTextColor="#52525B"
              style={{
                backgroundColor: "#0C1120",
                borderRadius: 12,
                padding: 14,
                fontSize: 15,
                color: "#F4F4F5",
                marginBottom: 20,
                borderWidth: customCelebration ? 1.5 : 0,
                borderColor: "#FBBF24",
              }}
            />
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#8B92A8", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Identity (optional)
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontSize: 15, color: "#A78BFA", fontWeight: "500", marginRight: 4 }}>
                I am someone who
              </Text>
              <TextInput
                value={identityStatement}
                onChangeText={setIdentityStatement}
                placeholder="takes care of their mind"
                placeholderTextColor="#52525B"
                style={{
                  flex: 1,
                  backgroundColor: "#0C1120",
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  fontSize: 14,
                  color: "#F4F4F5",
                }}
              />
            </View>
          </Animated.View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <Pressable onPress={handleClose} style={{ flex: 1, backgroundColor: "#00000080", justifyContent: "flex-end" }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: "#16161D", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "85%" }}>
            <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingBottom: 32 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#3F3F46", alignSelf: "center", marginBottom: 20 }} />

              {/* Progress dots */}
              <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: 24 }}>
                {Array.from({ length: totalSteps }, (_, i) => (
                  <View
                    key={i}
                    style={{
                      width: i === step ? 24 : 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: i <= step ? "#2DD4BF" : "#27272A",
                    }}
                  />
                ))}
              </View>

              {renderStep()}

              {/* Navigation */}
              <View style={{ flexDirection: "row", gap: 10, marginTop: 28 }}>
                {step > 0 && (
                  <Pressable
                    onPress={() => setStep(step - 1)}
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      borderRadius: 14,
                      backgroundColor: "#1E1E27",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: "600", color: "#8B92A8" }}>Back</Text>
                  </Pressable>
                )}
                {step < totalSteps - 1 ? (
                  <Pressable
                    onPress={() => { if (canProceed()) setStep(step + 1); }}
                    disabled={!canProceed()}
                    style={{
                      flex: step === 0 ? 1 : 2,
                      paddingVertical: 14,
                      borderRadius: 14,
                      backgroundColor: canProceed() ? "#2DD4BF" : "#27272A",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: "700", color: canProceed() ? "#0C1120" : "#52525B" }}>
                      {step === 0 ? "Make it tiny" : "Next"}
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={handleSave}
                    disabled={!title.trim() || saving}
                    style={{
                      flex: 2,
                      paddingVertical: 14,
                      borderRadius: 14,
                      backgroundColor: title.trim() && !saving ? "#2DD4BF" : "#27272A",
                      alignItems: "center",
                    }}
                  >
                    {saving ? (
                      <ActivityIndicator color="#0C1120" />
                    ) : (
                      <Text style={{ fontSize: 15, fontWeight: "700", color: title.trim() ? "#0C1120" : "#52525B" }}>
                        {isEditing ? "Save Changes" : "Start Tracking"}
                      </Text>
                    )}
                  </Pressable>
                )}
              </View>

              {/* Skip to end for quick add */}
              {step > 0 && step < totalSteps - 1 && (
                <Pressable
                  onPress={() => setStep(totalSteps - 1)}
                  style={{ alignSelf: "center", marginTop: 12, paddingVertical: 6 }}
                >
                  <Text style={{ fontSize: 13, color: "#5A6178" }}>Skip to finish</Text>
                </Pressable>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
