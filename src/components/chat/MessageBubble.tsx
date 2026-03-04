import { View, Text, Platform } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import Markdown from "react-native-markdown-display";
import CompanionAvatar from "@/components/companion/CompanionAvatar";
import ExerciseCardView from "@/components/chat/ExerciseCardView";
import type { ChatMessage } from "@/types/chat";

const mdStyles = {
  body: { color: "#F4F4F5", fontSize: 15, lineHeight: 22 },
  paragraph: { marginTop: 0, marginBottom: 6 },
  strong: { color: "#F4F4F5", fontWeight: "700" as const },
  em: { color: "#D4D4D8", fontStyle: "italic" as const },
  heading1: { color: "#F4F4F5", fontSize: 18, fontWeight: "700" as const, marginTop: 8, marginBottom: 4 },
  heading2: { color: "#F4F4F5", fontSize: 17, fontWeight: "600" as const, marginTop: 6, marginBottom: 4 },
  heading3: { color: "#F4F4F5", fontSize: 16, fontWeight: "600" as const, marginTop: 4, marginBottom: 2 },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  list_item: { marginVertical: 2 },
  bullet_list_icon: { color: "#A78BFA", fontSize: 14, lineHeight: 22, marginRight: 6 },
  ordered_list_icon: { color: "#A78BFA", fontSize: 14, lineHeight: 22, marginRight: 6 },
  code_inline: { backgroundColor: "#27272A", color: "#2DD4BF", paddingHorizontal: 4, borderRadius: 4, fontSize: 13 },
  fence: { backgroundColor: "#27272A", borderRadius: 8, padding: 12, marginVertical: 6, color: "#D4D4D8", fontSize: 13 },
  blockquote: { backgroundColor: "#1A1A24", borderLeftWidth: 3, borderLeftColor: "#8B5CF6", paddingLeft: 12, paddingVertical: 4, marginVertical: 6 },
  link: { color: "#A78BFA" },
  hr: { backgroundColor: "#3F3F46", height: 1, marginVertical: 8 },
};

interface Props {
  message: ChatMessage;
  showAvatar?: boolean;
}

export default function MessageBubble({ message, showAvatar = false }: Props) {
  const isUser = message.role === "user";

  const time = message.created_at
    ? new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <Animated.View
      entering={FadeInUp.duration(200)}
      style={{
        flexDirection: "row",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 6,
      }}
      accessibilityLabel={`${isUser ? "You" : "Lumis"}: ${message.content}`}
      accessibilityRole="text"
    >
      {!isUser && showAvatar && (
        <View style={{ marginRight: 8, marginTop: "auto" }}>
          <CompanionAvatar size="small" expression="neutral" />
        </View>
      )}
      {!isUser && !showAvatar && <View style={{ width: 40 }} />}

      <View style={{ maxWidth: "80%" }}>
        <View
          style={{
            paddingHorizontal: 14,
            paddingVertical: 10,
            backgroundColor: isUser ? "#8B5CF6" : "#1E1E27",
            borderTopLeftRadius: isUser ? 18 : 4,
            borderTopRightRadius: isUser ? 4 : 18,
            borderBottomLeftRadius: 18,
            borderBottomRightRadius: 18,
          }}
        >
          {isUser ? (
            <Text style={{ fontSize: 15, lineHeight: 22, color: "white" }}>
              {message.content}
            </Text>
          ) : (
            <View>
              <Markdown style={mdStyles}>{message.content || " "}</Markdown>
              {message.isStreaming && (
                <Text style={{ color: "#71717A", fontSize: 15 }}> ●</Text>
              )}
            </View>
          )}
        </View>

        {time && (
          <Text style={{
            fontSize: 10,
            color: "#52525B",
            marginTop: 3,
            textAlign: isUser ? "right" : "left",
            marginHorizontal: 4,
          }}>
            {time}
          </Text>
        )}

        {!isUser && message.exerciseCard && (
          <ExerciseCardView card={message.exerciseCard} />
        )}
      </View>
    </Animated.View>
  );
}
