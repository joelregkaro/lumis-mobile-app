import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";
import type { JournalEntry } from "@/types/database";

const c = colors.dark;

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  chat: "chatbubble-ellipses-outline",
  voice: "mic-outline",
  journal: "pencil-outline",
};

const THEME_COLORS = [
  c.brand.purple,
  c.brand.teal,
  c.brand.gold,
  "#F87171",
  "#60A5FA",
  "#34D399",
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function formatDuration(minutes: number | null): string | null {
  if (!minutes || minutes < 1) return null;
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function JournalEntryCard({
  entry,
  index,
}: {
  entry: JournalEntry;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const icon = TYPE_ICONS[entry.type] ?? "document-outline";
  const dateStr = formatDate(entry.date);
  const duration = formatDuration(entry.duration_minutes);

  const moodShiftColor =
    entry.mood_shift != null
      ? entry.mood_shift > 0
        ? c.status.success
        : entry.mood_shift < 0
          ? c.status.crisis
          : c.text.tertiary
      : null;

  const moodShiftIcon =
    entry.mood_shift != null
      ? entry.mood_shift > 0
        ? "arrow-up"
        : entry.mood_shift < 0
          ? "arrow-down"
          : "remove"
      : null;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(300)}>
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={{
          backgroundColor: c.bg.surface,
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: entry.insight?.breakthrough
            ? c.brand.gold + "40"
            : c.bg.border,
        }}
      >
        {/* Header row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: c.bg.elevated,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Ionicons name={icon} size={16} color={c.brand.purpleLight} />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: c.text.primary,
                fontSize: 14,
                fontWeight: "600",
              }}
            >
              Session {entry.session_number}
            </Text>
            <Text style={{ color: c.text.tertiary, fontSize: 12 }}>
              {dateStr}
              {duration ? ` \u00B7 ${duration}` : ""}
            </Text>
          </View>

          {/* Mood shift badge */}
          {moodShiftColor && moodShiftIcon && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: moodShiftColor + "20",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
              }}
            >
              <Ionicons
                name={moodShiftIcon as any}
                size={12}
                color={moodShiftColor}
              />
              <Text
                style={{
                  color: moodShiftColor,
                  fontSize: 12,
                  fontWeight: "600",
                  marginLeft: 2,
                }}
              >
                {Math.abs(entry.mood_shift!)}
              </Text>
            </View>
          )}

          {/* Echoes count */}
          {entry.echoes.length > 0 && (
            <View
              style={{
                backgroundColor: c.brand.teal + "20",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
                marginLeft: 6,
              }}
            >
              <Text
                style={{
                  color: c.brand.teal,
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                {entry.echoes.length} action{entry.echoes.length > 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </View>

        {/* Summary */}
        {entry.summary && (
          <Text
            numberOfLines={expanded ? undefined : 3}
            style={{
              color: c.text.secondary,
              fontSize: 14,
              lineHeight: 20,
              marginBottom: 10,
            }}
          >
            {entry.summary}
          </Text>
        )}

        {/* Theme pills */}
        {entry.key_themes.length > 0 && (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: expanded ? 12 : 0,
            }}
          >
            {entry.key_themes.map((theme, i) => (
              <View
                key={theme}
                style={{
                  backgroundColor: THEME_COLORS[i % THEME_COLORS.length] + "20",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{
                    color: THEME_COLORS[i % THEME_COLORS.length],
                    fontSize: 12,
                    fontWeight: "500",
                  }}
                >
                  {theme}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Breakthrough badge */}
        {entry.insight?.breakthrough && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: c.brand.gold + "15",
              padding: 10,
              borderRadius: 10,
              marginBottom: expanded ? 12 : 0,
              marginTop: 4,
            }}
          >
            <Ionicons
              name="bulb-outline"
              size={16}
              color={c.brand.gold}
              style={{ marginRight: 8 }}
            />
            <Text
              numberOfLines={expanded ? undefined : 2}
              style={{
                color: c.brand.gold,
                fontSize: 13,
                lineHeight: 18,
                flex: 1,
              }}
            >
              {entry.insight.breakthrough}
            </Text>
          </View>
        )}

        {/* Expanded: action items */}
        {expanded && entry.echoes.length > 0 && (
          <View style={{ marginTop: 4 }}>
            <Text
              style={{
                color: c.text.tertiary,
                fontSize: 12,
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              Action Items
            </Text>
            {entry.echoes.map((echo, i) => (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  marginBottom: 6,
                }}
              >
                <Ionicons
                  name={
                    echo.status === "completed"
                      ? "checkmark-circle"
                      : "ellipse-outline"
                  }
                  size={16}
                  color={
                    echo.status === "completed"
                      ? c.status.success
                      : c.text.tertiary
                  }
                  style={{ marginRight: 8, marginTop: 1 }}
                />
                <Text
                  style={{
                    color:
                      echo.status === "completed"
                        ? c.text.tertiary
                        : c.text.secondary,
                    fontSize: 13,
                    lineHeight: 18,
                    flex: 1,
                    textDecorationLine:
                      echo.status === "completed" ? "line-through" : "none",
                  }}
                >
                  {echo.action_item}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Expand indicator */}
        {!expanded && (entry.echoes.length > 0 || entry.insight?.breakthrough) && (
          <View style={{ alignItems: "center", marginTop: 4 }}>
            <Ionicons
              name="chevron-down"
              size={16}
              color={c.text.tertiary}
            />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}
