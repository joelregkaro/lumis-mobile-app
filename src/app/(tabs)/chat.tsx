import { useRef, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import MessageBubble from "@/components/chat/MessageBubble";
import TypingIndicator from "@/components/chat/TypingIndicator";
import QuickReplies from "@/components/chat/QuickReplies";
import SessionCoolDown from "@/components/chat/SessionCoolDown";
import { useChatStore } from "@/store/chat";
import { useSubscriptionStore } from "@/store/subscription";
import { hapticLight } from "@/lib/haptics";
import type { ChatMessage } from "@/types/chat";

export default function ChatScreen() {
  const router = useRouter();
  const { topic } = useLocalSearchParams<{ topic?: string }>();
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const [inputText, setInputText] = useState(topic ? decodeURIComponent(topic) : "");
  const isAtBottomRef = useRef(true);
  const {
    messages,
    isStreaming,
    sessionNumber,
    completedSession,
    sendMessage,
    loadLatestSession,
    dismissCoolDown,
  } = useChatStore();

  const isPro = useSubscriptionStore((s) => s.isPro);
  const lastMessage = messages[messages.length - 1];
  const quickReplies = lastMessage?.quickReplies;

  useEffect(() => {
    loadLatestSession();
  }, []);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isStreaming) return;

    await hapticLight();
    setInputText("");

    try {
      await sendMessage(text);
    } catch {
      // handled by store
    }
  }, [inputText, isStreaming, sendMessage]);

  const handleQuickReply = useCallback(
    async (reply: string) => {
      if (isStreaming) return;
      try {
        await sendMessage(reply);
      } catch {
        // handled by store
      }
    },
    [isStreaming, sendMessage],
  );

  const renderMessage = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => {
      const prevMessage = index > 0 ? messages[index - 1] : null;
      const showAvatar = item.role === "assistant" && prevMessage?.role !== "assistant";
      return <MessageBubble message={item} showAvatar={showAvatar} />;
    },
    [messages],
  );

  const handleContentSizeChange = () => {
    if (isAtBottomRef.current) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  };

  const canSend = inputText.trim().length > 0 && !isStreaming;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#0D0D12" }} edges={["top"]}>
      {/* Header */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: "#1E1E27",
      }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#16161D", alignItems: "center", justifyContent: "center" }}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={20} color="#A1A1AA" />
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#F4F4F5" }}>Lumis</Text>
          <Text style={{ fontSize: 11, color: "#71717A", marginTop: 1 }}>Session {sessionNumber}</Text>
        </View>
        <Pressable
          onPress={() => router.push("/sos")}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#16161D", alignItems: "center", justifyContent: "center" }}
          accessibilityLabel="Emergency support"
        >
          <Ionicons name="shield-outline" size={18} color="#F472B6" />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Post-Session Cool Down */}
        {completedSession && (
          <SessionCoolDown session={completedSession} onDismiss={dismissCoolDown} />
        )}

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}
          onContentSizeChange={handleContentSizeChange}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            isAtBottomRef.current = layoutMeasurement.height + contentOffset.y >= contentSize.height - 40;
          }}
          scrollEventThrottle={100}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 80 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#1E1E27", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Ionicons name="chatbubble-ellipses-outline" size={28} color="#71717A" />
              </View>
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#F4F4F5" }}>What's on your mind?</Text>
              <Text style={{ fontSize: 14, color: "#71717A", textAlign: "center", marginTop: 8, lineHeight: 20 }}>
                I'm here to listen.{"\n"}Share whatever feels right.
              </Text>
            </View>
          }
          ListFooterComponent={
            isStreaming && !lastMessage?.content ? <TypingIndicator /> : null
          }
        />

        {/* Quick Replies */}
        {quickReplies && quickReplies.length > 0 && !isStreaming && (
          <QuickReplies replies={quickReplies} onSelect={handleQuickReply} />
        )}

        {/* Input Bar */}
        <View style={{
          paddingHorizontal: 16,
          paddingVertical: 8,
          paddingBottom: Platform.OS === "ios" ? 4 : 8,
          borderTopWidth: 0.5,
          borderTopColor: "#1E1E27",
        }}>
          <View style={{
            flexDirection: "row",
            alignItems: "flex-end",
            backgroundColor: "#16161D",
            borderRadius: 24,
            borderWidth: 1,
            borderColor: "#27272A",
            paddingHorizontal: 16,
            paddingVertical: 6,
          }}>
            {!inputText.trim() && (
              <Pressable
                onPress={async () => {
                  await hapticLight();
                  if (isPro) {
                    router.push("/voice-chat");
                  } else {
                    router.push("/paywall");
                  }
                }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 4,
                }}
                accessibilityLabel="Start voice session"
                accessibilityRole="button"
              >
                <Ionicons name="mic-outline" size={20} color="#A78BFA" />
              </Pressable>
            )}
            <TextInput
              style={{
                flex: 1,
                fontSize: 15,
                color: "#F4F4F5",
                maxHeight: 100,
                minHeight: 36,
                paddingTop: 8,
                paddingBottom: 8,
              }}
              placeholder="Type a message..."
              placeholderTextColor="#71717A"
              value={inputText}
              onChangeText={setInputText}
              multiline
              editable={!isStreaming}
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
            <Pressable
              onPress={handleSend}
              disabled={!canSend}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: canSend ? "#8B5CF6" : "#27272A",
                alignItems: "center",
                justifyContent: "center",
                marginLeft: 8,
                marginBottom: 2,
              }}
              accessibilityLabel="Send message"
            >
              <Ionicons name="arrow-up" size={18} color={canSend ? "white" : "#52525B"} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
