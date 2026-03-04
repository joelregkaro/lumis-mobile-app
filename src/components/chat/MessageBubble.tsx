import { View, Text } from "react-native";
import Animated, { FadeInUp, SlideInUp } from "react-native-reanimated";
import Markdown from "react-native-markdown-display";
import CompanionAvatar from "@/components/companion/CompanionAvatar";
import ExerciseCardView from "@/components/chat/ExerciseCardView";
import { colors } from "@/constants/theme";
import type { ChatMessage } from "@/types/chat";

const c = colors.dark;

const mdStyles = {
  body: { color: c.text.primary, fontSize: 15, lineHeight: 22 },
  paragraph: { marginTop: 0, marginBottom: 6 },
  strong: { color: c.text.primary, fontWeight: "700" as const },
  em: { color: c.text.primary, fontStyle: "italic" as const },
  heading1: { color: c.text.primary, fontSize: 18, fontWeight: "700" as const, marginTop: 8, marginBottom: 4 },
  heading2: { color: c.text.primary, fontSize: 17, fontWeight: "600" as const, marginTop: 6, marginBottom: 4 },
  heading3: { color: c.text.primary, fontSize: 16, fontWeight: "600" as const, marginTop: 4, marginBottom: 2 },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  list_item: { marginVertical: 2 },
  bullet_list_icon: { color: c.brand.purpleLight, fontSize: 14, lineHeight: 22, marginRight: 6 },
  ordered_list_icon: { color: c.brand.purpleLight, fontSize: 14, lineHeight: 22, marginRight: 6 },
  code_inline: { backgroundColor: c.bg.elevated, color: c.brand.teal, paddingHorizontal: 4, borderRadius: 4, fontSize: 13 },
  fence: { backgroundColor: c.bg.elevated, borderRadius: 8, padding: 12, marginVertical: 6, color: c.text.primary, fontSize: 13 },
  blockquote: { backgroundColor: c.bg.surface, borderLeftWidth: 3, borderLeftColor: c.brand.purple, paddingLeft: 12, paddingVertical: 4, marginVertical: 6 },
  link: { color: c.brand.purpleLight },
  hr: { backgroundColor: c.bg.elevated, height: 1, marginVertical: 8 },
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
      entering={isUser ? SlideInUp.springify().damping(18).stiffness(200).duration(250) : FadeInUp.duration(200)}
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
            backgroundColor: isUser ? c.bubble.user : c.bg.surface,
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
                <Text style={{ color: c.text.tertiary, fontSize: 15 }}> ●</Text>
              )}
            </View>
          )}
        </View>

        {message.error && (
          <Text style={{
            fontSize: 12,
            color: c.status.crisis,
            marginTop: 4,
            textAlign: isUser ? "right" : "left",
            marginHorizontal: 4,
          }}>
            Failed to send · Tap to retry
          </Text>
        )}

        {time && !message.error && (
          <Text style={{
            fontSize: 10,
            color: c.text.tertiary,
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
