import { View, Text, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { hapticSuccess, hapticLight } from "@/lib/haptics";
import type { Goal } from "@/types/database";

interface GoalCardProps {
  goal: Goal;
  index: number;
  onComplete: (id: string) => void;
  onPause: (id: string) => void;
  compact?: boolean;
}

const CATEGORY_EMOJI: Record<string, string> = {
  wellness: "🧘",
  relationships: "💛",
  career: "💼",
  personal_growth: "🌱",
  habits: "🔄",
  emotional: "💭",
};

function getLatestProgress(goal: Goal): { pct: number; note: string } | null {
  if (!goal.progress_notes || goal.progress_notes.length === 0) return null;
  const latest = goal.progress_notes[goal.progress_notes.length - 1];
  return { pct: latest.progress_pct ?? 0, note: latest.note };
}

function getDueStatus(targetDate: string | null): { label: string; color: string } | null {
  if (!targetDate) return null;
  const now = new Date();
  const due = new Date(targetDate);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, color: "#F87171" };
  if (diffDays === 0) return { label: "Due today", color: "#FBBF24" };
  if (diffDays <= 7) return { label: `${diffDays}d left`, color: "#FBBF24" };
  return { label: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }), color: "#71717A" };
}

export default function GoalCard({ goal, index, onComplete, onPause, compact }: GoalCardProps) {
  const emoji = CATEGORY_EMOJI[goal.category ?? ""] ?? "🎯";
  const progress = getLatestProgress(goal);
  const dueStatus = getDueStatus(goal.target_date);
  const progressPct = progress?.pct ?? 0;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).duration(300)}
      style={{
        marginBottom: 8,
        borderRadius: 12,
        backgroundColor: "#16161D",
        padding: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ marginRight: 6 }}>{emoji}</Text>
            <Text style={{ flex: 1, fontSize: 15, fontWeight: "500", color: "#F4F4F5" }}>
              {goal.title}
            </Text>
          </View>
          {goal.description && !compact && (
            <Text style={{ fontSize: 13, color: "#A1A1AA", marginTop: 4, lineHeight: 18 }} numberOfLines={2}>
              {goal.description}
            </Text>
          )}
        </View>

        {!compact && (
          <View style={{ marginLeft: 10, flexDirection: "row", gap: 6 }}>
            <Pressable
              onPress={async () => {
                await hapticSuccess();
                onComplete(goal.id);
              }}
              style={{ backgroundColor: "#14B8A620", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}
            >
              <Text style={{ fontSize: 13, color: "#2DD4BF" }}>✓</Text>
            </Pressable>
            <Pressable
              onPress={async () => {
                await hapticLight();
                onPause(goal.id);
              }}
              style={{ backgroundColor: "#27272A", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}
            >
              <Text style={{ fontSize: 13, color: "#71717A" }}>⏸</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Progress bar */}
      {progressPct > 0 && (
        <View style={{ marginTop: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
            <Text style={{ fontSize: 11, color: "#71717A" }}>Progress</Text>
            <Text style={{ fontSize: 11, color: "#A78BFA", fontWeight: "600" }}>{progressPct}%</Text>
          </View>
          <View style={{ height: 4, backgroundColor: "#27272A", borderRadius: 2, overflow: "hidden" }}>
            <View style={{ height: 4, width: `${Math.min(progressPct, 100)}%`, backgroundColor: "#8B5CF6", borderRadius: 2 }} />
          </View>
        </View>
      )}

      {/* Due date and latest note row */}
      {(dueStatus || progress?.note) && !compact && (
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, gap: 10 }}>
          {dueStatus && (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontSize: 11, color: dueStatus.color }}>📅 {dueStatus.label}</Text>
            </View>
          )}
          {progress?.note && (
            <Text style={{ flex: 1, fontSize: 11, color: "#71717A", fontStyle: "italic" }} numberOfLines={1}>
              "{progress.note}"
            </Text>
          )}
        </View>
      )}
    </Animated.View>
  );
}
