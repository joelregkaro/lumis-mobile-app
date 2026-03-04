import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Paths, File as ExpoFile } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useRouter } from "expo-router";
import { Share } from "react-native";
import { useAuthStore } from "@/store/auth";
import { useMemoryStore } from "@/store/memory";
import { useSubscriptionStore } from "@/store/subscription";
import { useReferralStore } from "@/store/referral";
import { supabase } from "@/lib/supabase";
import { hapticLight } from "@/lib/haptics";
import type { MemoryCategory, UserMemory } from "@/types/database";

type ViewMode = "memory_doc" | "legacy";

const CATEGORY_CONFIG: { category: MemoryCategory; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { category: "goal", icon: "flag-outline", label: "Goals" },
  { category: "trigger", icon: "flash-outline", label: "Triggers" },
  { category: "coping_strategy", icon: "fitness-outline", label: "Coping Strategies" },
  { category: "pattern", icon: "git-network-outline", label: "Patterns" },
  { category: "relationship", icon: "people-outline", label: "Relationships" },
  { category: "life_event", icon: "calendar-outline", label: "Life Events" },
  { category: "insight", icon: "bulb-outline", label: "Insights" },
  { category: "value", icon: "diamond-outline", label: "Values" },
  { category: "strength", icon: "star-outline", label: "Strengths" },
  { category: "preference", icon: "settings-outline", label: "Preferences" },
];

function MemoryItem({
  memory,
  onEdit,
  onDelete,
}: {
  memory: UserMemory;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(memory.content);

  const handleSave = () => {
    onEdit(memory.id, editText);
    setEditing(false);
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: "#27272A" }}>
      {editing ? (
        <View style={{ flex: 1 }}>
          <TextInput
            style={{ backgroundColor: "#1E1E27", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: "#F4F4F5" }}
            value={editText}
            onChangeText={setEditText}
            multiline
            autoFocus
          />
          <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
            <Pressable onPress={handleSave}>
              <Text style={{ fontSize: 14, color: "#2DD4BF", fontWeight: "500" }}>Save</Text>
            </Pressable>
            <Pressable onPress={() => setEditing(false)}>
              <Text style={{ fontSize: 14, color: "#71717A" }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          <Text style={{ flex: 1, fontSize: 14, color: "#F4F4F5", lineHeight: 20 }}>• {memory.content}</Text>
          <Pressable onPress={() => setEditing(true)} style={{ marginLeft: 8, padding: 4 }} accessibilityLabel="Edit memory">
            <Ionicons name="create-outline" size={16} color="#71717A" />
          </Pressable>
          <Pressable onPress={() => onDelete(memory.id)} style={{ marginLeft: 4, padding: 4 }} accessibilityLabel="Delete memory">
            <Ionicons name="close" size={16} color="#52525B" />
          </Pressable>
        </>
      )}
    </View>
  );
}

function SettingsRow({ icon, label, onPress, destructive, loading: rowLoading, rightElement }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  destructive?: boolean;
  loading?: boolean;
  rightElement?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={rowLoading}
      accessibilityLabel={label}
      accessibilityRole="button"
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 0.5,
        borderBottomColor: "#27272A",
      }}
    >
      <Ionicons name={icon} size={18} color={destructive ? "#F87171" : "#A1A1AA"} style={{ marginRight: 12 }} />
      <Text style={{ flex: 1, fontSize: 15, color: destructive ? "#F87171" : "#F4F4F5" }}>{label}</Text>
      {rowLoading ? (
        <ActivityIndicator size="small" color="#8B5CF6" />
      ) : rightElement ? rightElement : (
        <Ionicons name="chevron-forward" size={16} color="#52525B" />
      )}
    </Pressable>
  );
}

export default function MeScreen() {
  const router = useRouter();
  const { profile, signOut, fetchProfile } = useAuthStore();
  const isPro = useSubscriptionStore((s) => s.isPro);
  const { memoryDoc, memories, fetchMemoryDoc, fetchMemories, updateMemory, deleteMemory } = useMemoryStore();
  const { code: referralCode, sentReferrals, fetchReferralStatus } = useReferralStore();
  const [viewMode, setViewMode] = useState<ViewMode>("memory_doc");
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingVision, setEditingVision] = useState(false);
  const [visionText, setVisionText] = useState(profile?.future_self_vision ?? "");

  useEffect(() => {
    fetchMemoryDoc();
    fetchMemories();
    fetchReferralStatus();
  }, []);

  const handleDelete = (id: string) => {
    Alert.alert("Delete memory", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMemory(id) },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: signOut },
    ]);
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("export-data", { method: "GET" });
      if (error) throw error;
      const jsonStr = typeof data === "string" ? data : JSON.stringify(data, null, 2);
      const fileName = `lumis-export-${new Date().toISOString().split("T")[0]}.json`;
      const file = new ExpoFile(Paths.cache, fileName);
      file.write(jsonStr);
      await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: "Export your Lumis data" });
    } catch {
      Alert.alert("Export failed", "Something went wrong. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAllData = () => {
    Alert.alert(
      "Delete all your data?",
      "This will permanently delete your account, conversations, memories, mood entries, goals, and patterns. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Everything",
          style: "destructive",
          onPress: () => {
            Alert.alert("Final confirmation", "All your data will be permanently removed.", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Confirm Deletion",
                style: "destructive",
                onPress: async () => {
                  setIsDeleting(true);
                  try {
                    const { error } = await supabase.functions.invoke("export-data", { method: "DELETE" });
                    if (error) throw error;
                    await signOut();
                  } catch {
                    Alert.alert("Deletion failed", "Something went wrong. Please try again.");
                    setIsDeleting(false);
                  }
                },
              },
            ]);
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0D0D12" }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
            <View style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: "#8B5CF620",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 16,
            }}>
              <Ionicons name="person" size={24} color="#A78BFA" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: "700", color: "#F4F4F5" }}>
                {profile?.display_name || profile?.email?.split("@")[0] || "You"}
              </Text>
              <Text style={{ fontSize: 13, color: "#71717A", marginTop: 2 }}>{profile?.email}</Text>
            </View>
          </View>

          <Text style={{ fontSize: 22, fontWeight: "700", color: "#F4F4F5", marginBottom: 4 }}>
            What I Know About You
          </Text>
          <Text style={{ fontSize: 14, color: "#71717A" }}>
            Transparent and fully yours.
          </Text>
        </View>

        {/* View Toggle */}
        {memories.length > 0 && (
          <View style={{ flexDirection: "row", marginHorizontal: 20, marginBottom: 16, backgroundColor: "#16161D", borderRadius: 12, padding: 3 }}>
            {(["memory_doc", "legacy"] as const).map((mode) => (
              <Pressable
                key={mode}
                onPress={() => { setViewMode(mode); hapticLight(); }}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: viewMode === mode ? "#8B5CF6" : "transparent",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: viewMode === mode ? "white" : "#71717A" }}>
                  {mode === "memory_doc" ? "Memory" : "By Category"}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Memory Doc */}
        {viewMode === "memory_doc" && (
          <View style={{ paddingHorizontal: 20 }}>
            {memoryDoc?.content ? (
              <Animated.View entering={FadeInDown.duration(300)} style={{ backgroundColor: "#16161D", borderRadius: 16, padding: 16, marginBottom: 20 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="document-text-outline" size={14} color="#71717A" style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 12, color: "#71717A" }}>
                      v{memoryDoc.version} · {new Date(memoryDoc.updated_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 14, color: "#F4F4F5", lineHeight: 22 }}>
                  {memoryDoc.content}
                </Text>
              </Animated.View>
            ) : (
              <View style={{ alignItems: "center", paddingVertical: 48 }}>
                <Ionicons name="brain-outline" size={40} color="#52525B" />
                <Text style={{ fontSize: 17, fontWeight: "600", color: "#F4F4F5", marginTop: 16 }}>No memories yet</Text>
                <Text style={{ fontSize: 14, color: "#71717A", textAlign: "center", marginTop: 8, maxWidth: 260 }}>
                  After your first conversation, I'll start learning about you.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Legacy View */}
        {viewMode === "legacy" && (
          <View style={{ paddingHorizontal: 20 }}>
            {CATEGORY_CONFIG.map(({ category, icon, label }, idx) => {
              const items = memories.filter((m) => m.category === category);
              if (items.length === 0) return null;
              return (
                <Animated.View key={category} entering={FadeInDown.delay(idx * 50).duration(300)} style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                    <Ionicons name={icon} size={14} color="#A1A1AA" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 12, fontWeight: "600", color: "#A1A1AA", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</Text>
                  </View>
                  <View style={{ backgroundColor: "#16161D", borderRadius: 16, padding: 16 }}>
                    {items.map((memory) => (
                      <MemoryItem key={memory.id} memory={memory} onEdit={updateMemory} onDelete={handleDelete} />
                    ))}
                  </View>
                </Animated.View>
              );
            })}
            {memories.length === 0 && (
              <View style={{ alignItems: "center", paddingVertical: 48 }}>
                <Text style={{ fontSize: 17, fontWeight: "600", color: "#F4F4F5" }}>No categorized memories</Text>
                <Text style={{ fontSize: 14, color: "#71717A", textAlign: "center", marginTop: 8 }}>
                  New memories are stored in the curated Memory view.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Referral Card */}
        {referralCode && (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <Animated.View entering={FadeInDown.duration(300)} style={{
              backgroundColor: "#16161D",
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: "#8B5CF630",
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <Ionicons name="gift-outline" size={20} color="#A78BFA" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#F4F4F5" }}>Invite a Friend</Text>
              </View>
              <Text style={{ fontSize: 13, color: "#A1A1AA", lineHeight: 18, marginBottom: 16 }}>
                Both you and your friend get 1 month of Growth tier free when they complete 3 sessions.
              </Text>

              {/* Code display */}
              <View style={{
                backgroundColor: "#1E1E27",
                borderRadius: 12,
                padding: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}>
                <Text style={{ fontSize: 20, fontWeight: "800", color: "#A78BFA", letterSpacing: 3 }}>
                  {referralCode}
                </Text>
                <Pressable
                  onPress={async () => {
                    await hapticLight();
                    await Share.share({
                      message: `I've been working on myself with Lumis — an AI growth companion that actually gets me. Try it free: lumis.app/r/${referralCode}`,
                    });
                  }}
                  style={{ backgroundColor: "#8B5CF620", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#A78BFA" }}>Share</Text>
                </Pressable>
              </View>

              {/* Referral stats */}
              {sentReferrals.length > 0 && (
                <View style={{ flexDirection: "row", gap: 16 }}>
                  <Text style={{ fontSize: 12, color: "#71717A" }}>
                    {sentReferrals.length} invited
                  </Text>
                  <Text style={{ fontSize: 12, color: "#2DD4BF" }}>
                    {sentReferrals.filter((r) => r.status === "activated" || r.status === "rewarded").length} activated
                  </Text>
                </View>
              )}
            </Animated.View>
          </View>
        )}

        {/* My Vision Card */}
        {profile?.future_self_vision && (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <Animated.View entering={FadeInDown.duration(300)} style={{
              backgroundColor: "#16161D",
              borderRadius: 16,
              padding: 18,
              borderLeftWidth: 3,
              borderLeftColor: "#FBBF24",
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ fontSize: 18, marginRight: 8 }}>🔮</Text>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#F4F4F5" }}>My Vision (6 months)</Text>
                </View>
                <Pressable
                  onPress={async () => {
                    await hapticLight();
                    setEditingVision(true);
                  }}
                  hitSlop={12}
                >
                  <Ionicons name="create-outline" size={18} color="#71717A" />
                </Pressable>
              </View>
              {editingVision ? (
                <View>
                  <TextInput
                    value={visionText}
                    onChangeText={setVisionText}
                    multiline
                    autoFocus
                    style={{
                      backgroundColor: "#1E1E27", borderRadius: 12, padding: 12, fontSize: 14, color: "#F4F4F5",
                      minHeight: 60, textAlignVertical: "top", borderWidth: 1, borderColor: "#27272A40",
                    }}
                  />
                  <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
                    <Pressable
                      onPress={async () => {
                        await supabase.from("users").update({ future_self_vision: visionText.trim() }).eq("id", profile.id);
                        await fetchProfile();
                        setEditingVision(false);
                      }}
                    >
                      <Text style={{ fontSize: 14, color: "#2DD4BF", fontWeight: "600" }}>Save</Text>
                    </Pressable>
                    <Pressable onPress={() => { setEditingVision(false); setVisionText(profile.future_self_vision ?? ""); }}>
                      <Text style={{ fontSize: 14, color: "#71717A" }}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Text style={{ fontSize: 15, color: "#E4E4E7", lineHeight: 22 }}>
                  {profile.future_self_vision}
                </Text>
              )}
            </Animated.View>
          </View>
        )}

        {/* Settings */}
        <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: "#71717A", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>
            Explore
          </Text>
          <View style={{ backgroundColor: "#16161D", borderRadius: 16, overflow: "hidden", marginBottom: 16 }}>
            <SettingsRow
              icon="pie-chart-outline"
              label="Life Wheel — Domain Assessment"
              onPress={() => router.push("/life-wheel")}
            />
            <SettingsRow
              icon="people-outline"
              label="My World — Relationship Map"
              onPress={() => router.push("/relationships")}
            />
            <SettingsRow
              icon="sparkles-outline"
              label="My Emotional Type"
              onPress={() => router.push("/emotional-type")}
            />
          </View>

          <Text style={{ fontSize: 12, fontWeight: "600", color: "#71717A", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>
            Settings
          </Text>
          <View style={{ backgroundColor: "#16161D", borderRadius: 16, overflow: "hidden" }}>
            <SettingsRow
              icon="card-outline"
              label="Subscription"
              onPress={() => router.push("/paywall")}
              rightElement={
                <Text style={{ fontSize: 13, color: isPro ? "#22C55E" : "#A78BFA", fontWeight: "500" }}>
                  {isPro ? "Growth" : "Free"}
                </Text>
              }
            />
            <SettingsRow icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => Linking.openURL("https://lumis.app/privacy")} />
            <SettingsRow icon="download-outline" label="Export My Data" onPress={handleExportData} loading={isExporting} />
            <SettingsRow icon="log-out-outline" label="Sign Out" onPress={handleSignOut} destructive />
          </View>
        </View>

        {/* Danger Zone */}
        <Pressable
          onPress={handleDeleteAllData}
          disabled={isDeleting}
          style={{ alignItems: "center", paddingVertical: 20, marginTop: 16 }}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#F87171" />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="trash-outline" size={16} color="#F8717180" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 14, color: "#F8717180" }}>Delete all my data</Text>
            </View>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
