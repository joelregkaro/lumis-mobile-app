import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useJournalStore } from "@/store/journal";
import JournalEntryCard from "@/components/journal/JournalEntryCard";
import SearchResultCard from "@/components/journal/SearchResultCard";
import { EmptyState } from "@/components/ui";
import { hapticLight } from "@/lib/haptics";
import { colors } from "@/constants/theme";
import type { InsightCard } from "@/types/database";

const c = colors.dark;

function DigestCard({ card }: { card: InsightCard }) {
  return (
    <View
      style={{
        backgroundColor: c.bg.elevated,
        borderRadius: 16,
        padding: 16,
        marginRight: 12,
        width: 280,
        borderWidth: 1,
        borderColor: c.brand.purple + "30",
      }}
    >
      {card.stat_value && (
        <Text
          style={{
            color: c.brand.purpleLight,
            fontSize: 28,
            fontWeight: "700",
            marginBottom: 2,
          }}
        >
          {card.stat_value}
        </Text>
      )}
      {card.stat_label && (
        <Text
          style={{
            color: c.text.tertiary,
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 8,
          }}
        >
          {card.stat_label}
        </Text>
      )}
      <Text
        style={{
          color: c.text.primary,
          fontSize: 15,
          fontWeight: "600",
          marginBottom: 4,
        }}
      >
        {card.title}
      </Text>
      <Text
        style={{ color: c.text.secondary, fontSize: 13, lineHeight: 18 }}
        numberOfLines={3}
      >
        {card.body}
      </Text>
    </View>
  );
}

export default function JournalScreen() {
  const router = useRouter();
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    entries,
    digests,
    searchResults,
    searchQuery,
    isLoading,
    isSearching,
    isLoadingMore,
    hasMore,
    loadTimeline,
    loadMore,
    search,
    clearSearch,
  } = useJournalStore();

  useEffect(() => {
    loadTimeline();
  }, []);

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchText(text);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

      if (!text.trim()) {
        clearSearch();
        return;
      }

      searchTimerRef.current = setTimeout(() => {
        search(text);
      }, 500);
    },
    [search, clearSearch],
  );

  const handleCloseSearch = useCallback(() => {
    setSearchVisible(false);
    setSearchText("");
    clearSearch();
    Keyboard.dismiss();
  }, [clearSearch]);

  const startJournalMode = useCallback(() => {
    hapticLight();
    router.push({
      pathname: "/(tabs)/chat",
      params: { journalMode: "true" },
    });
  }, [router]);

  const showingSearch = searchVisible && searchQuery.trim().length > 0;

  const renderFooter = useCallback(() => {
    if (isLoadingMore) {
      return (
        <View style={{ paddingVertical: 20, alignItems: "center" }}>
          <ActivityIndicator color={c.brand.purple} />
        </View>
      );
    }
    if (!hasMore && entries.length > 0) {
      return (
        <View style={{ paddingVertical: 20, alignItems: "center" }}>
          <Text style={{ color: c.text.tertiary, fontSize: 13 }}>
            You've reached the beginning
          </Text>
        </View>
      );
    }
    return null;
  }, [isLoadingMore, hasMore, entries.length]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg.primary }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 12,
        }}
      >
        {searchVisible ? (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: c.bg.surface,
              borderRadius: 12,
              paddingHorizontal: 12,
              height: 40,
            }}
          >
            <Ionicons
              name="search"
              size={18}
              color={c.text.tertiary}
              style={{ marginRight: 8 }}
            />
            <TextInput
              autoFocus
              value={searchText}
              onChangeText={handleSearchChange}
              placeholder="Search your sessions..."
              placeholderTextColor={c.text.tertiary}
              style={{
                flex: 1,
                color: c.text.primary,
                fontSize: 15,
                height: 40,
              }}
              returnKeyType="search"
            />
            {isSearching && (
              <ActivityIndicator
                size="small"
                color={c.brand.purple}
                style={{ marginRight: 8 }}
              />
            )}
            <Pressable onPress={handleCloseSearch} hitSlop={12}>
              <Ionicons name="close" size={20} color={c.text.secondary} />
            </Pressable>
          </Animated.View>
        ) : (
          <>
            <Text
              style={{
                color: c.text.primary,
                fontSize: 28,
                fontWeight: "700",
              }}
            >
              My Journal
            </Text>
            <Pressable
              onPress={() => {
                hapticLight();
                setSearchVisible(true);
              }}
              hitSlop={12}
            >
              <Ionicons
                name="search-outline"
                size={24}
                color={c.text.secondary}
              />
            </Pressable>
          </>
        )}
      </View>

      {/* Loading state */}
      {isLoading && entries.length === 0 && (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={c.brand.purple} />
          <Text
            style={{ color: c.text.tertiary, fontSize: 14, marginTop: 12 }}
          >
            Loading your journal...
          </Text>
        </View>
      )}

      {/* Search results */}
      {showingSearch ? (
        <FlatList
          data={searchResults}
          keyExtractor={(_, i) => `search-${i}`}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8 }}
          ListEmptyComponent={
            !isSearching ? (
              <View
                style={{
                  alignItems: "center",
                  paddingTop: 40,
                }}
              >
                <Ionicons
                  name="search"
                  size={40}
                  color={c.text.tertiary}
                />
                <Text
                  style={{
                    color: c.text.tertiary,
                    fontSize: 14,
                    marginTop: 12,
                  }}
                >
                  No matches found
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <SearchResultCard result={item} query={searchQuery} />
          )}
        />
      ) : (
        /* Timeline */
        !isLoading && (
          <FlatList
            data={entries}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: 100,
            }}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={loadTimeline}
                tintColor={c.brand.purple}
              />
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            ListHeaderComponent={
              digests.length > 0 ? (
                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      color: c.text.tertiary,
                      fontSize: 12,
                      fontWeight: "600",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      marginBottom: 10,
                    }}
                  >
                    Weekly Insights
                  </Text>
                  <FlatList
                    horizontal
                    data={digests}
                    keyExtractor={(d) => d.id}
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => <DigestCard card={item} />}
                  />
                </View>
              ) : null
            }
            ListEmptyComponent={
              <EmptyState
                icon="book-outline"
                title="Your journal is empty"
                subtitle="Start a conversation with Lumis and your sessions will appear here as journal entries."
              />
            }
            ListFooterComponent={renderFooter}
            renderItem={({ item, index }) => (
              <JournalEntryCard entry={item} index={index} />
            )}
          />
        )
      )}

      {/* Journal Mode FAB */}
      {!searchVisible && (
        <Pressable
          onPress={startJournalMode}
          style={{
            position: "absolute",
            bottom: 24,
            right: 20,
            overflow: "hidden",
            borderRadius: 28,
            elevation: 8,
            shadowColor: c.brand.purple,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
          }}
        >
          <LinearGradient
            colors={[c.brand.purple, c.brand.teal]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 20,
              paddingVertical: 14,
            }}
          >
            <Ionicons
              name="pencil"
              size={18}
              color="white"
              style={{ marginRight: 8 }}
            />
            <Text style={{ color: "white", fontSize: 15, fontWeight: "600" }}>
              Journal
            </Text>
          </LinearGradient>
        </Pressable>
      )}
    </SafeAreaView>
  );
}
