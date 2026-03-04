import { View, Text, Pressable, ScrollView } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { hapticLight } from "@/lib/haptics";

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
      className="mb-sm"
    >
      {replies.map((reply, i) => (
        <Animated.View key={reply} entering={FadeInDown.delay(i * 50).duration(250)}>
          <Pressable
            onPress={() => handlePress(reply)}
            className="rounded-full border border-brand-purple px-4 py-2"
          >
            <Text className="text-body text-brand-purple-light">{reply}</Text>
          </Pressable>
        </Animated.View>
      ))}
    </ScrollView>
  );
}
