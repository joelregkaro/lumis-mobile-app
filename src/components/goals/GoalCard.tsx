import { View, Text, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { hapticLight } from "@/lib/haptics";
import { useGoalStore } from "@/store/goals";
import { colors } from "@/constants/theme";
import type { Goal } from "@/types/database";

const c = colors.dark;

interface GoalCardProps {
  goal: Goal;
  index: number;
  onPress: (goal: Goal) => void;
  compact?: boolean;
}

const CATEGORY_EMOJI: Record<string, string> = {
  wellness: "🧘", relationships: "💛", career: "💼",
  personal_growth: "🌱", habits: "🔄", emotional: "💭",
};

function getDueStatus(targetDate: string | null): { label: string; color: string } | null {
  if (!targetDate) return null;
  const now = new Date();
  const due = new Date(targetDate);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, color: "#F87171" };
  if (diffDays === 0) return { label: "Due today", color: "#FBBF24" };
  if (diffDays <= 7) return { label: `${diffDays}d left`, color: "#FBBF24" };
  return { label: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }), color: c.text.tertiary };
}

export default function GoalCard({ goal, index, onPress, compact }: GoalCardProps) {
  const milestones = useGoalStore((s) => s.milestones[goal.id] ?? []);
  const emoji = CATEGORY_EMOJI[goal.category ?? ""] ?? "🎯";
  const dueStatus = getDueStatus(goal.target_date);

  const completedMs = milestones.filter((m) => m.is_completed).length;
  const totalMs = milestones.length;
  const progressPct = totalMs > 0 ? Math.round((completedMs / totalMs) * 100) : 0;

  return (
    <Pressable onPress={async () => { await hapticLight(); onPress(goal); }}>
      <Animated.View
        entering={FadeInDown.delay(index * 80).duration(300)}
        style={{ marginBottom: 8, borderRadius: 12, backgroundColor: c.bg.surface, padding: 14 }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ marginRight: 6 }}>{emoji}</Text>
              <Text style={{ flex: 1, fontSize: 15, fontWeight: "500", color: c.text.primary }}>{goal.title}</Text>
            </View>
            {goal.description && !compact && (
              <Text style={{ fontSize: 13, color: c.text.secondary, marginTop: 4, lineHeight: 18 }} numberOfLines={2}>
                {goal.description}
              </Text>
            )}
          </View>
        </View>

        {/* Milestone progress bar */}
        {totalMs > 0 && (
          <View style={{ marginTop: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ fontSize: 11, color: c.text.tertiary }}>{completedMs}/{totalMs} milestones</Text>
              <Text style={{ fontSize: 11, color: c.brand.purpleLight, fontWeight: "600" }}>{progressPct}%</Text>
            </View>
            <View style={{ height: 4, backgroundColor: c.bg.primary, borderRadius: 2, overflow: "hidden" }}>
              <View style={{ height: 4, width: `${Math.min(progressPct, 100)}%`, backgroundColor: c.brand.purple, borderRadius: 2 }} />
            </View>
          </View>
        )}

        {/* Due date row */}
        {dueStatus && !compact && (
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
            <Text style={{ fontSize: 11, color: dueStatus.color }}>📅 {dueStatus.label}</Text>
            {goal.status === "paused" && (
              <Text style={{ fontSize: 11, color: c.text.tertiary, marginLeft: 8 }}>⏸ Paused</Text>
            )}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}
