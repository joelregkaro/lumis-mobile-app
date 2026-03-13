import { Pressable, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { hapticLight } from "@/lib/haptics";
import { colors } from "@/constants/theme";
import type { ExerciseDefinition } from "@/store/toolkit";

const c = colors.dark;

interface ExerciseCardProps {
  exercise: ExerciseDefinition;
  reason?: string;
  onPress: () => void;
}

export default function ExerciseCard({ exercise, reason, onPress }: ExerciseCardProps) {
  const handlePress = async () => {
    await hapticLight();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={{
        backgroundColor: c.bg.surface,
        borderRadius: 16,
        padding: 16,
        borderLeftWidth: 3,
        borderLeftColor: exercise.color,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: `${exercise.color}15`,
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Ionicons name={exercise.icon as any} size={18} color={exercise.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: c.text.primary }}>{exercise.title}</Text>
          <Text style={{ fontSize: 13, color: c.text.secondary }}>{exercise.subtitle}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name="time-outline" size={12} color={c.text.tertiary} />
          <Text style={{ fontSize: 12, color: c.text.tertiary }}>{exercise.durationMinutes}m</Text>
        </View>
      </View>
      {reason && (
        <Text style={{ fontSize: 12, color: exercise.color, fontWeight: "500", marginTop: 2 }}>
          {reason}
        </Text>
      )}
    </Pressable>
  );
}
