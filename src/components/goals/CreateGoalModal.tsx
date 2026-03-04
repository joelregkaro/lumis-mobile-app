import { useState } from "react";
import {
  View, Text, TextInput, Pressable, Modal, KeyboardAvoidingView,
  Platform, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useGoalStore } from "@/store/goals";
import { hapticSuccess, hapticLight } from "@/lib/haptics";
import { colors } from "@/constants/theme";

const c = colors.dark;

const CATEGORIES = [
  { key: "emotional", label: "Emotional", emoji: "💭" },
  { key: "wellness", label: "Wellness", emoji: "🧘" },
  { key: "relationships", label: "Relationships", emoji: "💛" },
  { key: "career", label: "Career", emoji: "💼" },
  { key: "personal_growth", label: "Growth", emoji: "🌱" },
  { key: "habits", label: "Habits", emoji: "🔄" },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function CreateGoalModal({ visible, onClose }: Props) {
  const { createGoal } = useGoalStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [targetDate, setTargetDate] = useState("");
  const [milestones, setMilestones] = useState<string[]>([]);
  const [newMilestone, setNewMilestone] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const msTitles = milestones.filter((m) => m.trim());
      await createGoal(
        title.trim(),
        description.trim() || undefined,
        category ?? undefined,
        targetDate || undefined,
        msTitles.length > 0 ? msTitles : undefined,
      );
      await hapticSuccess();
      resetForm();
      onClose();
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setTitle(""); setDescription(""); setCategory(null);
    setTargetDate(""); setMilestones([]); setNewMilestone("");
  };

  const handleClose = () => { resetForm(); onClose(); };

  const addMilestone = () => {
    const trimmed = newMilestone.trim();
    if (!trimmed) return;
    setMilestones([...milestones, trimmed]);
    setNewMilestone("");
    hapticLight();
  };

  const removeMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable onPress={handleClose} style={{ flex: 1, backgroundColor: "#00000050" }} />
        <Animated.View entering={FadeIn.duration(200)} style={{ backgroundColor: c.bg.primary, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12, maxHeight: "80%" }}>
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.bg.elevated }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={{ fontSize: 20, fontWeight: "700", color: c.text.primary, marginBottom: 16 }}>Set a New Goal</Text>

            {/* Title */}
            <Animated.View entering={FadeInDown.delay(100).duration(300)}>
              <Text style={{ fontSize: 13, color: c.text.secondary, marginBottom: 6 }}>What do you want to work on?</Text>
              <TextInput
                style={{ backgroundColor: c.bg.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: c.text.primary, marginBottom: 14 }}
                placeholder="e.g., Practice gratitude daily"
                placeholderTextColor={c.text.tertiary}
                value={title}
                onChangeText={setTitle}
                autoFocus
              />
            </Animated.View>

            {/* Description */}
            <Animated.View entering={FadeInDown.delay(150).duration(300)}>
              <Text style={{ fontSize: 13, color: c.text.secondary, marginBottom: 6 }}>Why is this important? (optional)</Text>
              <TextInput
                style={{ backgroundColor: c.bg.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: c.text.primary, minHeight: 60, marginBottom: 14 }}
                placeholder="Add some context..."
                placeholderTextColor={c.text.tertiary}
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
              />
            </Animated.View>

            {/* Category */}
            <Animated.View entering={FadeInDown.delay(200).duration(300)}>
              <Text style={{ fontSize: 13, color: c.text.secondary, marginBottom: 8 }}>Category (optional)</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.key}
                    onPress={() => { setCategory(category === cat.key ? null : cat.key); hapticLight(); }}
                    style={{
                      flexDirection: "row", alignItems: "center", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
                      backgroundColor: category === cat.key ? `${c.brand.purple}20` : c.bg.surface,
                    }}
                  >
                    <Text style={{ marginRight: 4 }}>{cat.emoji}</Text>
                    <Text style={{ fontSize: 13, color: category === cat.key ? c.brand.purpleLight : c.text.secondary }}>{cat.label}</Text>
                  </Pressable>
                ))}
              </View>
            </Animated.View>

            {/* Target Date */}
            <Animated.View entering={FadeInDown.delay(250).duration(300)}>
              <Text style={{ fontSize: 13, color: c.text.secondary, marginBottom: 6 }}>Target date (optional)</Text>
              <TextInput
                style={{ backgroundColor: c.bg.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: c.text.primary, marginBottom: 14 }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={c.text.tertiary}
                value={targetDate}
                onChangeText={setTargetDate}
                keyboardType="numbers-and-punctuation"
              />
            </Animated.View>

            {/* Milestones */}
            <Animated.View entering={FadeInDown.delay(300).duration(300)}>
              <Text style={{ fontSize: 13, color: c.text.secondary, marginBottom: 8 }}>Break it into steps (optional)</Text>
              {milestones.map((ms, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: c.text.tertiary, marginRight: 8 }} />
                  <Text style={{ flex: 1, fontSize: 14, color: c.text.primary }}>{ms}</Text>
                  <Pressable onPress={() => removeMilestone(i)} hitSlop={8}>
                    <Ionicons name="close" size={16} color={c.text.tertiary} />
                  </Pressable>
                </View>
              ))}
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                <TextInput
                  style={{ flex: 1, backgroundColor: c.bg.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: c.text.primary }}
                  placeholder="Add a step..."
                  placeholderTextColor={c.text.tertiary}
                  value={newMilestone}
                  onChangeText={setNewMilestone}
                  onSubmitEditing={addMilestone}
                  returnKeyType="done"
                />
                <Pressable
                  onPress={addMilestone}
                  disabled={!newMilestone.trim()}
                  style={{ marginLeft: 8, width: 34, height: 34, borderRadius: 17, backgroundColor: newMilestone.trim() ? c.brand.purple : c.bg.surface, alignItems: "center", justifyContent: "center" }}
                >
                  <Ionicons name="add" size={16} color={newMilestone.trim() ? "white" : c.text.tertiary} />
                </Pressable>
              </View>
            </Animated.View>

            {/* Actions */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable onPress={handleClose} style={{ flex: 1, alignItems: "center", backgroundColor: c.bg.surface, borderRadius: 12, paddingVertical: 14 }}>
                <Text style={{ fontSize: 15, color: c.text.secondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleCreate}
                disabled={!title.trim() || saving}
                style={{ flex: 1, alignItems: "center", borderRadius: 12, paddingVertical: 14, backgroundColor: title.trim() && !saving ? c.brand.purple : c.bg.elevated }}
              >
                <Text style={{ fontSize: 15, fontWeight: "600", color: title.trim() && !saving ? "white" : c.text.tertiary }}>
                  {saving ? "Creating..." : "Create Goal"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
