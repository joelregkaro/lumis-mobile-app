import { useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import BottomSheet from "@/components/ui/BottomSheet";
import { useGoalStore } from "@/store/goals";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { colors } from "@/constants/theme";
import type { Goal } from "@/types/database";

const c = colors.dark;

const CATEGORY_EMOJI: Record<string, string> = {
  wellness: "🧘", relationships: "💛", career: "💼",
  personal_growth: "🌱", habits: "🔄", emotional: "💭",
};

interface Props {
  goal: Goal | null;
  visible: boolean;
  onClose: () => void;
}

export default function GoalDetailSheet({ goal, visible, onClose }: Props) {
  const { milestones, createMilestone, toggleMilestone, deleteMilestone, updateStatus, addProgressNote } = useGoalStore();
  const [newMilestone, setNewMilestone] = useState("");
  const [newNote, setNewNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);

  if (!goal) return null;

  const goalMilestones = milestones[goal.id] ?? [];
  const completedCount = goalMilestones.filter((m) => m.is_completed).length;
  const totalCount = goalMilestones.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const emoji = CATEGORY_EMOJI[goal.category ?? ""] ?? "🎯";

  const dueDate = goal.target_date ? new Date(goal.target_date) : null;
  const now = new Date();
  const daysLeft = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

  const handleAddMilestone = async () => {
    const trimmed = newMilestone.trim();
    if (!trimmed) return;
    await createMilestone(goal.id, trimmed);
    setNewMilestone("");
    await hapticLight();
  };

  const handleToggle = async (id: string) => {
    await toggleMilestone(id, goal.id);
    await hapticSuccess();
  };

  const handleAddNote = async () => {
    const trimmed = newNote.trim();
    if (!trimmed) return;
    await addProgressNote(goal.id, trimmed, progressPct);
    setNewNote("");
    setShowNoteInput(false);
    await hapticLight();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
          <Text style={{ fontSize: 24, marginRight: 8 }}>{emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: c.text.primary }}>{goal.title}</Text>
            {goal.category && (
              <Text style={{ fontSize: 12, color: c.brand.purpleLight, marginTop: 2, textTransform: "capitalize" }}>
                {goal.category.replace(/_/g, " ")}
              </Text>
            )}
          </View>
        </View>

        {goal.description && (
          <Text style={{ fontSize: 14, color: c.text.secondary, lineHeight: 20, marginBottom: 12 }}>
            {goal.description}
          </Text>
        )}

        {/* Due date + Progress */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
          {dueDate && (
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: c.bg.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
              <Ionicons name="calendar-outline" size={14} color={daysLeft !== null && daysLeft < 0 ? "#F87171" : c.text.tertiary} style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 12, color: daysLeft !== null && daysLeft < 0 ? "#F87171" : c.text.secondary }}>
                {daysLeft !== null && daysLeft < 0
                  ? `${Math.abs(daysLeft)}d overdue`
                  : daysLeft === 0 ? "Due today"
                  : `${daysLeft}d left`}
              </Text>
            </View>
          )}
          {totalCount > 0 && (
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: c.bg.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
              <Text style={{ fontSize: 12, color: c.brand.purpleLight, fontWeight: "600" }}>
                {completedCount}/{totalCount} milestones · {progressPct}%
              </Text>
            </View>
          )}
        </View>

        {/* Progress bar */}
        {totalCount > 0 && (
          <View style={{ marginBottom: 16 }}>
            <View style={{ height: 6, backgroundColor: c.bg.primary, borderRadius: 3, overflow: "hidden" }}>
              <View style={{ height: 6, width: `${progressPct}%`, backgroundColor: c.brand.purple, borderRadius: 3 }} />
            </View>
          </View>
        )}

        {/* Milestones checklist */}
        <Text style={{ fontSize: 13, fontWeight: "600", color: c.text.secondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
          Milestones
        </Text>
        {goalMilestones.map((ms, i) => (
          <Animated.View key={ms.id} entering={FadeInDown.delay(i * 40).duration(200)}>
            <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: c.bg.border }}>
              <Pressable onPress={() => handleToggle(ms.id)} style={{ marginRight: 10 }}>
                <Ionicons
                  name={ms.is_completed ? "checkbox" : "square-outline"}
                  size={22}
                  color={ms.is_completed ? c.brand.teal : c.text.tertiary}
                />
              </Pressable>
              <Text style={{
                flex: 1, fontSize: 15, color: ms.is_completed ? c.text.tertiary : c.text.primary,
                textDecorationLine: ms.is_completed ? "line-through" : "none",
              }}>
                {ms.title}
              </Text>
              <Pressable onPress={() => deleteMilestone(ms.id, goal.id)} hitSlop={8}>
                <Ionicons name="close" size={16} color={c.text.tertiary} />
              </Pressable>
            </View>
          </Animated.View>
        ))}

        {/* Add milestone input */}
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, marginBottom: 16 }}>
          <TextInput
            style={{
              flex: 1, backgroundColor: c.bg.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
              fontSize: 14, color: c.text.primary,
            }}
            placeholder="Add a milestone..."
            placeholderTextColor={c.text.tertiary}
            value={newMilestone}
            onChangeText={setNewMilestone}
            onSubmitEditing={handleAddMilestone}
            returnKeyType="done"
          />
          <Pressable
            onPress={handleAddMilestone}
            disabled={!newMilestone.trim()}
            style={{ marginLeft: 8, width: 36, height: 36, borderRadius: 18, backgroundColor: newMilestone.trim() ? c.brand.purple : c.bg.primary, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="add" size={18} color={newMilestone.trim() ? "white" : c.text.tertiary} />
          </Pressable>
        </View>

        {/* Progress notes */}
        {goal.progress_notes && goal.progress_notes.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: c.text.secondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
              Progress Notes
            </Text>
            {goal.progress_notes.slice(-5).reverse().map((note, i) => (
              <View key={i} style={{ flexDirection: "row", paddingVertical: 6 }}>
                <Text style={{ fontSize: 11, color: c.text.tertiary, width: 60 }}>
                  {new Date(note.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </Text>
                <Text style={{ flex: 1, fontSize: 13, color: c.text.secondary, lineHeight: 18 }}>{note.note}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Add note */}
        {showNoteInput ? (
          <View style={{ marginBottom: 16 }}>
            <TextInput
              style={{ backgroundColor: c.bg.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: c.text.primary, minHeight: 60 }}
              placeholder="Write a progress note..."
              placeholderTextColor={c.text.tertiary}
              value={newNote}
              onChangeText={setNewNote}
              multiline
              autoFocus
            />
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <Pressable onPress={handleAddNote} style={{ backgroundColor: c.brand.purple, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "white" }}>Save</Text>
              </Pressable>
              <Pressable onPress={() => { setShowNoteInput(false); setNewNote(""); }}>
                <Text style={{ fontSize: 13, color: c.text.tertiary, paddingVertical: 8 }}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setShowNoteInput(true)} style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, color: c.brand.purpleLight }}>+ Add progress note</Text>
          </Pressable>
        )}

        {/* Actions */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={async () => { await hapticSuccess(); await updateStatus(goal.id, "completed"); onClose(); }}
            style={{ flex: 1, backgroundColor: `${c.brand.teal}15`, borderRadius: 12, paddingVertical: 12, alignItems: "center" }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: c.brand.teal }}>Complete</Text>
          </Pressable>
          <Pressable
            onPress={async () => { await hapticLight(); await updateStatus(goal.id, goal.status === "paused" ? "active" : "paused"); onClose(); }}
            style={{ flex: 1, backgroundColor: c.bg.primary, borderRadius: 12, paddingVertical: 12, alignItems: "center" }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: c.text.secondary }}>
              {goal.status === "paused" ? "Resume" : "Pause"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}
