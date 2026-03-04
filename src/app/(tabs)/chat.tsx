import { useRef, useState, useCallback, useEffect, useMemo } from "react";
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
import Animated, { FadeIn, FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from "react-native-reanimated";
import MessageBubble from "@/components/chat/MessageBubble";
import TypingIndicator from "@/components/chat/TypingIndicator";
import QuickReplies from "@/components/chat/QuickReplies";
import SessionCoolDown from "@/components/chat/SessionCoolDown";
import CompanionAvatar from "@/components/companion/CompanionAvatar";
import { useChatStore } from "@/store/chat";
import { useSubscriptionStore } from "@/store/subscription";
import { useAuthStore } from "@/store/auth";
import { useEchoStore } from "@/store/echo";
import { useGoalStore } from "@/store/goals";
import { hapticLight } from "@/lib/haptics";
import { colors } from "@/constants/theme";
import type { ChatMessage } from "@/types/chat";

const c = colors.dark;

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Late night?";
}

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
  const profile = useAuthStore((s) => s.profile);
  const { pendingEchoes } = useEchoStore();
  const { goals } = useGoalStore();
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(false);
  const companionName = profile?.companion_name ?? "Lumis";
  const displayName = profile?.display_name ?? "";
  const lastMessage = messages[messages.length - 1];
  const quickReplies = lastMessage?.quickReplies;

  const headerGlowOpacity = useSharedValue(0.4);

  useEffect(() => {
    loadLatestSession();
  }, []);

  useEffect(() => {
    if (isStreaming) {
      headerGlowOpacity.value = withRepeat(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    } else {
      headerGlowOpacity.value = withTiming(0.4, { duration: 400 });
    }
  }, [isStreaming]);

  const headerGlowStyle = useAnimatedStyle(() => ({
    opacity: headerGlowOpacity.value,
  }));

  const contextualStarters = useMemo(() => {
    const starters: string[] = [];
    if (pendingEchoes.length > 0) {
      const item = pendingEchoes[0].action_item;
      starters.push(item.length > 40 ? `Follow up: ${item.slice(0, 37)}...` : `Follow up: ${item}`);
    }
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 5) {
      starters.push("I can't sleep");
    } else if (hour < 12) {
      starters.push("Starting my day...");
    }
    starters.push("I need to vent");
    if (goals.length > 0) {
      starters.push("Check in on my goals");
    }
    starters.push("Something's been on my mind");
    return starters.slice(0, 4);
  }, [pendingEchoes, goals]);

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

  const handleStarterTap = useCallback(
    async (starter: string) => {
      if (isStreaming) return;
      await hapticLight();
      try {
        await sendMessage(starter);
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
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg.primary }} edges={["top"]}>
      {/* Header — no back button, companion identity */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 0.5,
          borderBottomColor: c.bg.surface,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ marginRight: 10 }}>
            <Animated.View style={[headerGlowStyle, { position: "absolute", width: 36, height: 36, borderRadius: 18, backgroundColor: `${c.brand.purple}30` }]} />
            <CompanionAvatar size="small" expression={isStreaming ? "curious" : "warm"} />
          </View>
          <View>
            <Text style={{ fontSize: 16, fontWeight: "600", color: c.text.primary }}>{companionName}</Text>
            <Text style={{ fontSize: 11, color: c.text.tertiary, marginTop: 1 }}>
              {isStreaming ? "typing..." : `Session ${sessionNumber}`}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => router.push("/sos")}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: c.bg.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
          accessibilityLabel="Emergency support"
        >
          <Ionicons name="shield-outline" size={18} color="#F472B6" />
        </Pressable>
      </View>

      {!disclaimerDismissed && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: c.bg.surface,
            paddingHorizontal: 14,
            paddingVertical: 8,
            marginHorizontal: 12,
            marginTop: 8,
            borderRadius: 10,
          }}
        >
          <Text style={{ flex: 1, fontSize: 12, color: c.text.secondary, lineHeight: 16 }}>
            Lumis is an AI life coach, not a licensed therapist. If you're in crisis, call{" "}
            <Text style={{ fontWeight: "700", color: c.brand.purpleLight }}>988</Text>.
          </Text>
          <Pressable
            onPress={() => setDisclaimerDismissed(true)}
            hitSlop={8}
            style={{ marginLeft: 10, padding: 2 }}
            accessibilityLabel="Dismiss disclaimer"
          >
            <Ionicons name="close" size={14} color={c.text.secondary} />
          </Pressable>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {completedSession && (
          <SessionCoolDown session={completedSession} onDismiss={dismissCoolDown} />
        )}

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, flexGrow: 1 }}
          onContentSizeChange={handleContentSizeChange}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            isAtBottomRef.current = layoutMeasurement.height + contentOffset.y >= contentSize.height - 40;
          }}
          scrollEventThrottle={100}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
              <CompanionAvatar expression="warm" size="medium" />
              <Text style={{ fontSize: 20, fontWeight: "600", color: c.text.primary, marginTop: 20 }}>
                {getTimeGreeting()}{displayName ? `, ${displayName}` : ""}
              </Text>
              <Text style={{ fontSize: 15, color: c.text.secondary, textAlign: "center", marginTop: 8, lineHeight: 22 }}>
                What's on your mind?{"\n"}I'm here to listen.
              </Text>
              {/* Contextual conversation starters */}
              <View style={{ marginTop: 24, width: "100%", gap: 8, paddingHorizontal: 8 }}>
                {contextualStarters.map((starter, i) => (
                  <Animated.View key={starter} entering={FadeInDown.delay(200 + i * 80).duration(300)}>
                    <Pressable
                      onPress={() => handleStarterTap(starter)}
                      style={{
                        backgroundColor: c.bg.surface,
                        borderRadius: 16,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderWidth: 1,
                        borderColor: `${c.brand.purple}20`,
                      }}
                    >
                      <Text style={{ fontSize: 14, color: c.text.primary }}>{starter}</Text>
                    </Pressable>
                  </Animated.View>
                ))}
              </View>
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
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            paddingBottom: Platform.OS === "ios" ? 4 : 8,
            borderTopWidth: 0.5,
            borderTopColor: c.bg.surface,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              backgroundColor: c.bg.surface,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: c.bg.elevated,
              paddingHorizontal: 16,
              paddingVertical: 6,
            }}
          >
            {!inputText.trim() && (
              <Pressable
                onPress={async () => {
                  await hapticLight();
                  router.push(isPro ? "/voice-chat" : "/paywall");
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
                <Ionicons name="mic-outline" size={20} color={c.brand.purpleLight} />
              </Pressable>
            )}
            <TextInput
              style={{
                flex: 1,
                fontSize: 15,
                color: c.text.primary,
                maxHeight: 100,
                minHeight: 36,
                paddingTop: 8,
                paddingBottom: 8,
              }}
              placeholder="Type a message..."
              placeholderTextColor={c.text.tertiary}
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
                backgroundColor: canSend ? c.brand.purple : c.bg.elevated,
                alignItems: "center",
                justifyContent: "center",
                marginLeft: 8,
                marginBottom: 2,
              }}
              accessibilityLabel="Send message"
            >
              <Ionicons name="arrow-up" size={18} color={canSend ? "white" : c.text.tertiary} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
