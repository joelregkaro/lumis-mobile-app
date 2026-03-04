import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useGoalStore } from "@/store/goals";
import { hapticSuccess } from "@/lib/haptics";

const CATEGORIES = [
  { key: "emotional", label: "Emotional", emoji: "💜" },
  { key: "behavioral", label: "Behavioral", emoji: "🎯" },
  { key: "relational", label: "Relational", emoji: "👥" },
  { key: "mindfulness", label: "Mindfulness", emoji: "🧘" },
  { key: "self_care", label: "Self-Care", emoji: "🌿" },
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
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await createGoal(title.trim(), description.trim() || undefined, category ?? undefined);
      await hapticSuccess();
      setTitle("");
      setDescription("");
      setCategory(null);
      onClose();
    } catch {
      // Error handled by store
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setCategory(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable onPress={handleClose} className="flex-1 bg-black/50" />

        <Animated.View
          entering={FadeIn.duration(200)}
          className="rounded-t-2xl bg-bg-primary px-lg pb-lg pt-md"
        >
          {/* Handle bar */}
          <View className="mb-md items-center">
            <View className="h-1 w-10 rounded-full bg-bg-elevated" />
          </View>

          <Text className="mb-lg text-h2 font-inter-semibold text-text-primary">
            Set a New Goal
          </Text>

          <Animated.View entering={FadeInDown.delay(100).duration(300)}>
            <Text className="mb-xs text-label text-text-secondary">What do you want to work on?</Text>
            <TextInput
              className="mb-md rounded-lg bg-bg-surface px-md py-4 text-body text-text-primary"
              placeholder="e.g., Practice gratitude daily"
              placeholderTextColor="#5A6178"
              value={title}
              onChangeText={setTitle}
              autoFocus
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(300)}>
            <Text className="mb-xs text-label text-text-secondary">Why is this important? (optional)</Text>
            <TextInput
              className="mb-md min-h-[80px] rounded-lg bg-bg-surface px-md py-3 text-body text-text-primary"
              placeholder="Add some context..."
              placeholderTextColor="#5A6178"
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).duration(300)}>
            <Text className="mb-sm text-label text-text-secondary">Category (optional)</Text>
            <View className="mb-lg flex-row flex-wrap gap-sm">
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.key}
                  onPress={() => setCategory(category === cat.key ? null : cat.key)}
                  className={`flex-row items-center rounded-lg px-3 py-2 ${
                    category === cat.key ? "bg-brand-purple/20" : "bg-bg-surface"
                  }`}
                >
                  <Text className="mr-xs">{cat.emoji}</Text>
                  <Text className={`text-small ${
                    category === cat.key ? "text-brand-purple-light" : "text-text-secondary"
                  }`}>
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>

          <View className="flex-row gap-sm">
            <Pressable
              onPress={handleClose}
              className="flex-1 items-center rounded-lg bg-bg-surface py-4"
            >
              <Text className="text-body text-text-secondary">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleCreate}
              disabled={!title.trim() || saving}
              className={`flex-1 items-center rounded-lg py-4 ${
                title.trim() && !saving ? "bg-brand-purple" : "bg-bg-elevated"
              }`}
            >
              <Text className={`text-body font-inter-semibold ${
                title.trim() && !saving ? "text-white" : "text-text-tertiary"
              }`}>
                {saving ? "Creating..." : "Create Goal"}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
