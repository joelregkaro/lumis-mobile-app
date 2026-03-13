import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { View, Text, TextInput, Pressable, FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { TabsParamList } from "@/navigation/types";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from "react-native-reanimated";
import MessageBubble from "@/components/chat/MessageBubble";
import TypingIndicator from "@/components/chat/TypingIndicator";
import QuickReplies from "@/components/chat/QuickReplies";
import SessionCoolDown from "@/components/chat/SessionCoolDown";
import FirstReadModal from "@/components/blueprint/FirstReadModal";
import HeroDroplet from "@/components/companion/HeroDroplet";
import CosmicBackground from "@/components/ui/CosmicBackground";
import GlassCard from "@/components/ui/GlassCard";
import { useChatStore } from "@/store/chat";
import { useSubscriptionStore } from "@/store/subscription";
import { useAuthStore } from "@/store/auth";
import { useEchoStore } from "@/store/echo";
import { useGoalStore } from "@/store/goals";
import { supabase } from "@/lib/supabase";
import { hapticLight } from "@/lib/haptics";
import { screen, track } from "@/lib/analytics";
import { colors } from "@/constants/theme";
import type { ChatMessage } from "@/types/chat";

const c = colors.dark;

const HERO_QUICK_ACTIONS = [
  { id: "clear_head", label: "Clear my head", message: "I want to clear my head." },
  { id: "plan_today", label: "Plan today", message: "Help me plan my day." },
  { id: "talk_it_through", label: "Talk it through", message: "I want to talk something through." },
] as const;

type HeroQuickActionId = (typeof HERO_QUICK_ACTIONS)[number]["id"];

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning.";
  if (hour < 17) return "Good afternoon.";
  if (hour < 21) return "Good evening.";
  return "Late night?";
}

interface ChatHeroProps {
  companionName: string;
  displayName: string;
  isStreaming: boolean;
  sessionNumber: number;
  headerGlowStyle: Record<string, unknown>;
  isJournalMode: boolean;
  onPrimaryCta: () => void;
  onQuickActionPress: (id: HeroQuickActionId) => void;
}

function ChatHero({
  companionName,
  displayName,
  isStreaming,
  sessionNumber,
  headerGlowStyle,
  isJournalMode,
  onPrimaryCta,
  onQuickActionPress,
}: ChatHeroProps) {
  const greeting = isJournalMode ? "Journal Mode" : getTimeGreeting();

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, alignItems: "center" }}>
      <View
        style={{
          alignSelf: "stretch",
          backgroundColor: "rgba(31, 24, 72, 0.95)",
          borderRadius: 24,
          paddingHorizontal: 18,
          paddingVertical: 14,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: c.text.primary,
            letterSpacing: -0.2,
            textAlign: "left",
          }}
        >
          {isJournalMode ? "Good to see you." : greeting}
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: c.text.secondaryLight,
            marginTop: 4,
            lineHeight: 22,
          }}
        >
          {isJournalMode
            ? "How would you like to reflect today?"
            : `How can I support your well-being today${displayName ? `, ${displayName}` : ""}?`}
        </Text>
      </View>

      <View
        style={{
          marginTop: 10,
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: "rgba(18, 24, 48, 0.9)",
          borderWidth: 1,
          borderColor: c.glass.border,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          alignSelf: "flex-start",
        }}
      >
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: c.brand.teal,
          }}
        />
        <Text style={{ fontSize: 12, color: c.text.secondaryLight }}>
          Balanced {sessionNumber || 1}-day streak
        </Text>
      </View>

      <View style={{ marginTop: 28, alignItems: "center" }}>
        <View
          style={{
            width: 96,
            height: 96,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Animated.View
            style={[
              headerGlowStyle,
              {
                position: "absolute",
                width: 96,
                height: 96,
                borderRadius: 48,
                backgroundColor: c.cosmic.glow,
              },
            ]}
          />
          <HeroDroplet size="large" state={isStreaming ? "thinking" : "idle"} />
        </View>
        <Text
          style={{
            fontSize: 11,
            color: c.text.secondary,
            marginTop: 8,
          }}
        >
          {companionName}
        </Text>
      </View>

      <Pressable
        onPress={onPrimaryCta}
        style={{
          marginTop: 24,
          borderRadius: 999,
          overflow: "hidden",
        }}
        accessibilityRole="button"
        accessibilityLabel="Take 5 minutes to find some calm"
      >
        <GlassCard
          style={{
            borderRadius: 999,
            paddingVertical: 14,
            paddingHorizontal: 20,
            backgroundColor: "rgba(44, 33, 94, 0.95)",
            borderColor: `${c.brand.purple}35`,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: c.text.primary }}>
              Take 5 minutes to find some calm
            </Text>
            <Ionicons name="arrow-forward" size={18} color={c.brand.purpleLight} />
          </View>
        </GlassCard>
      </Pressable>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 16,
          gap: 8,
        }}
      >
        {HERO_QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.id}
            onPress={() => onQuickActionPress(action.id)}
            style={{
              flex: 1,
              backgroundColor: c.bg.surface,
              borderRadius: 999,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: c.glass.border,
              alignItems: "center",
              justifyContent: "center",
            }}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <Text style={{ fontSize: 14, fontWeight: "500", color: c.text.primary }}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<TabsParamList, "chat">>();
  const { topic, journalMode } = route.params ?? {};
  const isJournalMode = journalMode === "true";
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
  const [firstReadData, setFirstReadData] = useState<{ noticed: string[]; surprised_me: string; next_question: string } | null>(null);
  const [showFirstRead, setShowFirstRead] = useState(false);

  useEffect(() => {
    if (!completedSession || completedSession.sessionNumber !== 1) return;
    let cancelled = false;
    const checkFirstRead = async () => {
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        if (cancelled) return;
        const { data } = await supabase
          .from("insight_cards")
          .select("data")
          .eq("user_id", profile?.id)
          .eq("card_type", "first_read")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data?.data?.noticed) {
          setFirstReadData(data.data);
          setShowFirstRead(true);
          return;
        }
      }
    };
    checkFirstRead();
    return () => { cancelled = true; };
  }, [completedSession, profile?.id]);

  const companionName = profile?.companion_name ?? "Lumis";
  const displayName = profile?.display_name ?? "";
  const lastMessage = messages[messages.length - 1];
  const quickReplies = lastMessage?.quickReplies;
  const hasMessages = messages.length > 0;

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

  const journalOpts = isJournalMode ? { sessionType: "journal" as const } : undefined;

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isStreaming) return;

    await hapticLight();
    setInputText("");

    try {
      await sendMessage(text, journalOpts);
    } catch {
      // handled by store
    }
  }, [inputText, isStreaming, sendMessage, journalOpts]);

  const handleQuickReply = useCallback(
    async (reply: string) => {
      if (isStreaming) return;
      try {
        await sendMessage(reply, journalOpts);
      } catch {
        // handled by store
      }
    },
    [isStreaming, sendMessage, journalOpts],
  );

  const handleStarterTap = useCallback(
    async (starter: string) => {
      if (isStreaming) return;
      await hapticLight();
      track("starter_tapped", { text: starter });
      try {
        await sendMessage(starter, journalOpts);
      } catch {
        // handled by store
      }
    },
    [isStreaming, sendMessage, journalOpts],
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
    <View style={{ flex: 1 }}>
      <CosmicBackground intensity="full" />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {!disclaimerDismissed && (
          <GlassCard style={{ marginHorizontal: 12, marginTop: 8 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 14,
                paddingVertical: 8,
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
          </GlassCard>
        )}

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <ChatHero
            companionName={companionName}
            displayName={displayName}
            isStreaming={isStreaming}
            sessionNumber={sessionNumber}
            headerGlowStyle={headerGlowStyle}
            isJournalMode={isJournalMode}
            onPrimaryCta={async () => {
              if (isStreaming) return;
              await hapticLight();
              track("chat_hero_primary_tap", { mode: isJournalMode ? "journal" : "chat" });
              try {
                await sendMessage(
                  isJournalMode
                    ? "I'd like a short journaling exercise to help me reflect."
                    : "I'd like a 5-minute exercise to find some calm.",
                  journalOpts,
                );
              } catch {
                // handled by store
              }
            }}
            onQuickActionPress={async (id) => {
              if (isStreaming) return;
              const action = HERO_QUICK_ACTIONS.find((a) => a.id === id);
              if (!action) return;
              await hapticLight();
              track("chat_hero_quick_action_tap", { id, mode: isJournalMode ? "journal" : "chat" });
              try {
                await sendMessage(action.message, journalOpts);
              } catch {
                // handled by store
              }
            }}
          />

          {completedSession && (
            <SessionCoolDown session={completedSession} onDismiss={dismissCoolDown} />
          )}

          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: hasMessages ? 8 : 0,
              paddingBottom: 8,
              flexGrow: 1,
            }}
            onContentSizeChange={handleContentSizeChange}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            onScroll={({ nativeEvent }) => {
              const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
              isAtBottomRef.current = layoutMeasurement.height + contentOffset.y >= contentSize.height - 40;
            }}
            scrollEventThrottle={100}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={null}
            ListFooterComponent={
              isStreaming && !lastMessage?.content ? <TypingIndicator /> : null
            }
          />

          {quickReplies && quickReplies.length > 0 && !isStreaming && (
            <QuickReplies replies={quickReplies} onSelect={handleQuickReply} />
          )}

          {/* Input Bar */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              paddingBottom: Platform.OS === "ios" ? 70 : 74,
              borderTopWidth: 0.5,
              borderTopColor: c.glass.border,
            }}
          >
            <GlassCard style={{ borderRadius: 24 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-end",
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                }}
              >
                {!inputText.trim() && (
                  <Pressable
                    onPress={async () => {
                      await hapticLight();
                      navigation.navigate((isPro ? "voice-chat" : "paywall") as never);
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
            </GlassCard>
          </View>
        </KeyboardAvoidingView>

        {firstReadData && (
          <FirstReadModal
            visible={showFirstRead}
            data={firstReadData}
            onDismiss={() => setShowFirstRead(false)}
          />
        )}
      </SafeAreaView>
    </View>
  );
}
