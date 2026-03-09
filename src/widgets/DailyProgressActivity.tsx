import { HStack, Image, Text, VStack } from "@expo/ui/swift-ui";
import {
  font,
  foregroundStyle,
  padding,
  frame,
} from "@expo/ui/swift-ui/modifiers";
import { createLiveActivity } from "expo-widgets";

export type DailyProgressActivityProps = {
  completedHabits: number;
  totalHabits: number;
  currentStreak: number;
  morningIntentionDone: boolean;
  moodLoggedToday: boolean;
  eveningReflectionDone: boolean;
  companionName: string;
};

const CHECK_DONE = "checkmark.circle.fill" as const;
const CHECK_EMPTY = "circle" as const;
const FLAME_FILL = "flame.fill" as const;
const FLAME = "flame" as const;
const STAR_FILL = "star.fill" as const;

function checkIcon(done: boolean) {
  return done ? CHECK_DONE : CHECK_EMPTY;
}

function checkColor(done: boolean): string {
  return done ? "#34D399" : "#52525B";
}

const DailyProgressActivity = (props?: DailyProgressActivityProps) => {
  "widget";

  const p = props ?? {
    completedHabits: 0,
    totalHabits: 0,
    currentStreak: 0,
    morningIntentionDone: false,
    moodLoggedToday: false,
    eveningReflectionDone: false,
    companionName: "Lumis",
  };

  const progress = `${p.completedHabits}/${p.totalHabits}`;
  const allDone =
    p.completedHabits >= p.totalHabits &&
    p.totalHabits > 0 &&
    p.morningIntentionDone &&
    p.moodLoggedToday;

  return {
    banner: (
      <VStack modifiers={[padding({ all: 16 })]}>
        <HStack modifiers={[frame({ maxWidth: Infinity, alignment: "leading" })]}>
          <VStack modifiers={[frame({ maxWidth: Infinity, alignment: "leading" })]}>
            <HStack>
              <Image
                systemName={allDone ? STAR_FILL : FLAME_FILL}
                color={allDone ? "#FBBF24" : "#8B5CF6"}
              />
              <Text
                modifiers={[
                  font({ weight: "semibold", size: 15 }),
                  foregroundStyle("#FFFFFF"),
                ]}
              >
                {allDone ? "All done today!" : "Daily Progress"}
              </Text>
            </HStack>
            {p.currentStreak > 0 && (
              <HStack>
                <Image systemName={FLAME} color="#F97316" />
                <Text
                  modifiers={[
                    font({ size: 13 }),
                    foregroundStyle("#F97316"),
                  ]}
                >
                  {p.currentStreak} day streak
                </Text>
              </HStack>
            )}
          </VStack>

          <VStack>
            <Text
              modifiers={[
                font({ weight: "bold", size: 28 }),
                foregroundStyle("#FFFFFF"),
              ]}
            >
              {progress}
            </Text>
            <Text
              modifiers={[
                font({ size: 11 }),
                foregroundStyle("#A1A1AA"),
              ]}
            >
              habits
            </Text>
          </VStack>
        </HStack>

        <HStack modifiers={[padding({ top: 8 })]}>
          <HStack>
            <Image
              systemName={checkIcon(p.morningIntentionDone)}
              color={checkColor(p.morningIntentionDone)}
            />
            <Text
              modifiers={[
                font({ size: 12 }),
                foregroundStyle(checkColor(p.morningIntentionDone)),
              ]}
            >
              Intention
            </Text>
          </HStack>
          <HStack>
            <Image
              systemName={checkIcon(p.moodLoggedToday)}
              color={checkColor(p.moodLoggedToday)}
            />
            <Text
              modifiers={[
                font({ size: 12 }),
                foregroundStyle(checkColor(p.moodLoggedToday)),
              ]}
            >
              Mood
            </Text>
          </HStack>
          <HStack>
            <Image
              systemName={checkIcon(p.eveningReflectionDone)}
              color={checkColor(p.eveningReflectionDone)}
            />
            <Text
              modifiers={[
                font({ size: 12 }),
                foregroundStyle(checkColor(p.eveningReflectionDone)),
              ]}
            >
              Reflection
            </Text>
          </HStack>
        </HStack>
      </VStack>
    ),

    compactLeading: (
      <Image
        systemName={allDone ? STAR_FILL : FLAME_FILL}
        color={allDone ? "#FBBF24" : "#8B5CF6"}
      />
    ),

    compactTrailing: (
      <Text
        modifiers={[
          font({ weight: "semibold", size: 14 }),
          foregroundStyle("#FFFFFF"),
        ]}
      >
        {progress}
      </Text>
    ),

    minimal: (
      <Image
        systemName={allDone ? STAR_FILL : FLAME_FILL}
        color={allDone ? "#FBBF24" : "#8B5CF6"}
      />
    ),

    expandedLeading: (
      <VStack modifiers={[padding({ leading: 4 })]}>
        <Image systemName={FLAME_FILL} color="#8B5CF6" />
        {p.currentStreak > 0 && (
          <Text modifiers={[font({ size: 11 }), foregroundStyle("#F97316")]}>
            {p.currentStreak}d
          </Text>
        )}
      </VStack>
    ),

    expandedTrailing: (
      <VStack modifiers={[padding({ trailing: 4 })]}>
        <Text
          modifiers={[
            font({ weight: "bold", size: 22 }),
            foregroundStyle("#FFFFFF"),
          ]}
        >
          {progress}
        </Text>
        <Text modifiers={[font({ size: 11 }), foregroundStyle("#A1A1AA")]}>
          habits
        </Text>
      </VStack>
    ),

    expandedBottom: (
      <HStack modifiers={[padding({ horizontal: 4, bottom: 4 })]}>
        <HStack>
          <Image
            systemName={checkIcon(p.morningIntentionDone)}
            color={checkColor(p.morningIntentionDone)}
          />
          <Text
            modifiers={[
              font({ size: 11 }),
              foregroundStyle(checkColor(p.morningIntentionDone)),
            ]}
          >
            AM
          </Text>
        </HStack>
        <HStack>
          <Image
            systemName={checkIcon(p.moodLoggedToday)}
            color={checkColor(p.moodLoggedToday)}
          />
          <Text
            modifiers={[
              font({ size: 11 }),
              foregroundStyle(checkColor(p.moodLoggedToday)),
            ]}
          >
            Mood
          </Text>
        </HStack>
        <HStack>
          <Image
            systemName={checkIcon(p.eveningReflectionDone)}
            color={checkColor(p.eveningReflectionDone)}
          />
          <Text
            modifiers={[
              font({ size: 11 }),
              foregroundStyle(checkColor(p.eveningReflectionDone)),
            ]}
          >
            PM
          </Text>
        </HStack>
      </HStack>
    ),
  };
};

export default createLiveActivity(
  "DailyProgressActivity",
  DailyProgressActivity,
);
