import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";
import type { JournalSearchResult } from "@/types/database";

const c = colors.dark;

function highlightText(text: string, query: string) {
  if (!query.trim()) return text;

  const parts: { text: string; highlight: boolean }[] = [];
  const lower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  let lastIndex = 0;

  let index = lower.indexOf(queryLower);
  while (index !== -1) {
    if (index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, index), highlight: false });
    }
    parts.push({
      text: text.slice(index, index + query.length),
      highlight: true,
    });
    lastIndex = index + query.length;
    index = lower.indexOf(queryLower, lastIndex);
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), highlight: false });
  }

  return parts.length > 0 ? parts : [{ text, highlight: false }];
}

export default function SearchResultCard({
  result,
  query,
  onPress,
}: {
  result: JournalSearchResult;
  query: string;
  onPress?: () => void;
}) {
  const parts = highlightText(result.chunk_text, query);
  const relevance = Math.round((result.combined_score ?? 0) * 100);

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: c.bg.surface,
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: c.bg.border,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <Ionicons
          name="search-outline"
          size={14}
          color={c.brand.purpleLight}
          style={{ marginRight: 6 }}
        />
        <Text style={{ color: c.text.tertiary, fontSize: 12 }}>
          {relevance}% match
        </Text>
      </View>

      <Text style={{ lineHeight: 20 }}>
        {Array.isArray(parts)
          ? parts.map((part, i) => (
              <Text
                key={i}
                style={{
                  color: part.highlight ? c.brand.purpleLight : c.text.secondary,
                  fontSize: 14,
                  fontWeight: part.highlight ? "700" : "400",
                  backgroundColor: part.highlight
                    ? c.brand.purple + "20"
                    : "transparent",
                }}
              >
                {part.text}
              </Text>
            ))
          : <Text style={{ color: c.text.secondary, fontSize: 14 }}>{parts}</Text>
        }
      </Text>
    </Pressable>
  );
}
