import { HStack, Image, Text, VStack } from "@expo/ui/swift-ui";
import {
  font,
  foregroundStyle,
  padding,
  frame,
} from "@expo/ui/swift-ui/modifiers";
import { createLiveActivity } from "expo-widgets";

export type VoiceSessionActivityProps = {
  companionName: string;
  sessionNumber: number;
  elapsedSeconds: number;
  status: "connecting" | "listening" | "speaking";
};

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function statusLabel(status: VoiceSessionActivityProps["status"]): string {
  switch (status) {
    case "connecting":
      return "Connecting...";
    case "listening":
      return "Listening";
    case "speaking":
      return "Speaking";
  }
}

function statusColor(status: VoiceSessionActivityProps["status"]): string {
  switch (status) {
    case "connecting":
      return "#A1A1AA";
    case "listening":
      return "#8B5CF6";
    case "speaking":
      return "#34D399";
  }
}

const VoiceSessionActivity = (props?: VoiceSessionActivityProps) => {
  "widget";

  const p = props ?? {
    companionName: "Lumis",
    sessionNumber: 1,
    elapsedSeconds: 0,
    status: "connecting" as const,
  };
  const elapsed = formatElapsed(p.elapsedSeconds);
  const label = statusLabel(p.status);
  const color = statusColor(p.status);

  return {
    banner: (
      <HStack modifiers={[padding({ all: 16 })]}>
        <VStack modifiers={[frame({ maxWidth: Infinity, alignment: "leading" })]}>
          <HStack>
            <Image systemName="waveform" color="#8B5CF6" />
            <Text
              modifiers={[
                font({ weight: "semibold", size: 15 }),
                foregroundStyle("#FFFFFF"),
              ]}
            >
              {p.companionName}
            </Text>
          </HStack>
          <Text
            modifiers={[
              font({ size: 13 }),
              foregroundStyle("#A1A1AA"),
            ]}
          >
            Session #{p.sessionNumber}
          </Text>
          <HStack>
            <Text
              modifiers={[
                font({ size: 8 }),
                foregroundStyle(color),
              ]}
            >
              {"●"}
            </Text>
            <Text
              modifiers={[
                font({ size: 13 }),
                foregroundStyle(color),
              ]}
            >
              {label}
            </Text>
          </HStack>
        </VStack>
        <VStack>
          <Text
            modifiers={[
              font({ weight: "bold", size: 28, design: "monospaced" }),
              foregroundStyle("#FFFFFF"),
            ]}
          >
            {elapsed}
          </Text>
        </VStack>
      </HStack>
    ),

    compactLeading: <Image systemName="waveform" color="#8B5CF6" />,

    compactTrailing: (
      <Text
        modifiers={[
          font({ weight: "semibold", size: 14, design: "monospaced" }),
          foregroundStyle("#FFFFFF"),
        ]}
      >
        {elapsed}
      </Text>
    ),

    minimal: <Image systemName="waveform" color="#8B5CF6" />,

    expandedLeading: (
      <VStack modifiers={[padding({ leading: 4 })]}>
        <Image systemName="waveform" color="#8B5CF6" />
        <Text modifiers={[font({ size: 11 }), foregroundStyle("#A1A1AA")]}>
          {label}
        </Text>
      </VStack>
    ),

    expandedTrailing: (
      <VStack modifiers={[padding({ trailing: 4 })]}>
        <Text
          modifiers={[
            font({ weight: "bold", size: 22, design: "monospaced" }),
            foregroundStyle("#FFFFFF"),
          ]}
        >
          {elapsed}
        </Text>
        <Text modifiers={[font({ size: 11 }), foregroundStyle("#A1A1AA")]}>
          #{p.sessionNumber}
        </Text>
      </VStack>
    ),

    expandedBottom: (
      <HStack modifiers={[padding({ horizontal: 4, bottom: 4 })]}>
        <Text
          modifiers={[
            font({ weight: "medium", size: 13 }),
            foregroundStyle("#E4E4E7"),
          ]}
        >
          Voice session with {p.companionName}
        </Text>
      </HStack>
    ),
  };
};

export default createLiveActivity("VoiceSessionActivity", VoiceSessionActivity);
