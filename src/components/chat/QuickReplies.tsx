import { Text, Pressable, ScrollView } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { hapticLight } from "@/lib/haptics";
import { colors } from "@/constants/theme";

const c = colors.dark;

interface Props {
  replies: string[];
  onSelect: (reply: string) => void;
}

export default function QuickReplies({ replies, onSelect }: Props) {
  const handlePress = async (reply: string) => {
    await hapticLight();
    onSelect(reply);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      style={{ marginBottom: 8 }}
    >
      {replies.map((reply, i) => (
        <Animated.View key={reply} entering={FadeInDown.delay(i * 50).duration(250)}>
          <Pressable
            onPress={() => handlePress(reply)}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              borderRadius: 9999,
              borderWidth: 0.5,
              borderColor: c.glass.border,
              backgroundColor: c.glass.bg,
              paddingHorizontal: 16,
              paddingVertical: 8,
            })}
            accessibilityRole="button"
            accessibilityLabel={reply}
          >
            <Text style={{ fontSize: 14, color: c.brand.purpleLight }}>{reply}</Text>
          </Pressable>
        </Animated.View>
      ))}
    </ScrollView>
  );
}
