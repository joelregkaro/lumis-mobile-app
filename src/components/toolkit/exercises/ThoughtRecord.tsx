import { useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { colors } from "@/constants/theme";

const c = colors.dark;

const DISTORTIONS = [
  { key: "catastrophizing", label: "Catastrophizing", desc: "Assuming the worst" },
  { key: "black_white", label: "All-or-Nothing", desc: "No middle ground" },
  { key: "mind_reading", label: "Mind Reading", desc: "Assuming what others think" },
  { key: "should", label: "Should Statements", desc: "Rigid rules for yourself" },
  { key: "personalization", label: "Personalization", desc: "Blaming yourself unfairly" },
  { key: "overgeneralization", label: "Overgeneralization", desc: "One event = always" },
  { key: "filtering", label: "Mental Filter", desc: "Only seeing the negative" },
  { key: "labeling", label: "Labeling", desc: "Defining yourself by one thing" },
];

type Step = "situation" | "thought" | "emotion" | "distortion" | "evidence" | "reframe";

const STEP_ORDER: Step[] = ["situation", "thought", "emotion", "distortion", "evidence", "reframe"];

const STEP_LABELS: Record<Step, { title: string; prompt: string }> = {
  situation: { title: "What happened?", prompt: "Briefly describe the situation" },
  thought: { title: "What went through your mind?", prompt: "The automatic thought that came up" },
  emotion: { title: "What did you feel?", prompt: "Name the emotion and rate its intensity (0-10)" },
  distortion: { title: "Spot the pattern", prompt: "Which thinking trap might this be?" },
  evidence: { title: "Check the evidence", prompt: "What facts support or challenge this thought?" },
  reframe: { title: "Balanced thought", prompt: "What's a more balanced way to see this?" },
};

interface ThoughtRecordProps {
  onComplete: (data: Record<string, unknown>) => void;
}

export default function ThoughtRecord({ onComplete }: ThoughtRecordProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [situation, setSituation] = useState("");
  const [thought, setThought] = useState("");
  const [emotion, setEmotion] = useState("");
  const [emotionIntensity, setEmotionIntensity] = useState(5);
  const [selectedDistortions, setSelectedDistortions] = useState<string[]>([]);
  const [evidenceFor, setEvidenceFor] = useState("");
  const [evidenceAgainst, setEvidenceAgainst] = useState("");
  const [reframe, setReframe] = useState("");

  const currentStep = STEP_ORDER[stepIdx];
  const stepInfo = STEP_LABELS[currentStep];
  const progress = ((stepIdx + 1) / STEP_ORDER.length) * 100;

  const canProceed = () => {
    switch (currentStep) {
      case "situation": return situation.trim().length > 0;
      case "thought": return thought.trim().length > 0;
      case "emotion": return emotion.trim().length > 0;
      case "distortion": return selectedDistortions.length > 0;
      case "evidence": return evidenceFor.trim().length > 0 || evidenceAgainst.trim().length > 0;
      case "reframe": return reframe.trim().length > 0;
      default: return false;
    }
  };

  const handleNext = async () => {
    await hapticLight();
    if (stepIdx < STEP_ORDER.length - 1) {
      setStepIdx(stepIdx + 1);
    } else {
      await hapticSuccess();
      onComplete({
        situation,
        automatic_thought: thought,
        emotion,
        emotion_intensity: emotionIntensity,
        distortions: selectedDistortions,
        evidence_for: evidenceFor,
        evidence_against: evidenceAgainst,
        balanced_thought: reframe,
      });
    }
  };

  const handleBack = async () => {
    await hapticLight();
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
  };

  const toggleDistortion = async (key: string) => {
    await hapticLight();
    setSelectedDistortions((prev) =>
      prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key],
    );
  };

  return (
    <View style={{ gap: 20 }}>
      {/* Progress */}
      <View style={{ gap: 6 }}>
        <View style={{ height: 4, backgroundColor: c.bg.elevated, borderRadius: 2, overflow: "hidden" }}>
          <View style={{ height: "100%", backgroundColor: c.brand.purple, borderRadius: 2, width: `${progress}%` }} />
        </View>
        <Text style={{ fontSize: 12, color: c.text.tertiary, textAlign: "center" }}>
          Step {stepIdx + 1} of {STEP_ORDER.length}
        </Text>
      </View>

      {/* Step content */}
      <Animated.View key={currentStep} entering={FadeInDown.duration(300)} style={{ gap: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: c.text.primary }}>
          {stepInfo.title}
        </Text>
        <Text style={{ fontSize: 14, color: c.text.secondary, lineHeight: 20 }}>
          {stepInfo.prompt}
        </Text>

        {currentStep === "situation" && (
          <TextInput
            value={situation}
            onChangeText={setSituation}
            placeholder="e.g., My boss criticized my report in front of the team"
            placeholderTextColor={c.text.tertiary}
            multiline
            style={{
              backgroundColor: c.bg.surface,
              borderRadius: 12,
              padding: 14,
              color: c.text.primary,
              fontSize: 15,
              minHeight: 80,
              textAlignVertical: "top",
            }}
          />
        )}

        {currentStep === "thought" && (
          <TextInput
            value={thought}
            onChangeText={setThought}
            placeholder="e.g., I'm terrible at my job and everyone knows it"
            placeholderTextColor={c.text.tertiary}
            multiline
            style={{
              backgroundColor: c.bg.surface,
              borderRadius: 12,
              padding: 14,
              color: c.text.primary,
              fontSize: 15,
              minHeight: 80,
              textAlignVertical: "top",
            }}
          />
        )}

        {currentStep === "emotion" && (
          <View style={{ gap: 12 }}>
            <TextInput
              value={emotion}
              onChangeText={setEmotion}
              placeholder="e.g., Embarrassed, anxious"
              placeholderTextColor={c.text.tertiary}
              style={{
                backgroundColor: c.bg.surface,
                borderRadius: 12,
                padding: 14,
                color: c.text.primary,
                fontSize: 15,
              }}
            />
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 13, color: c.text.secondary }}>
                Intensity: {emotionIntensity}/10
              </Text>
              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => { hapticLight(); setEmotionIntensity(n); }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: emotionIntensity === n ? c.brand.purple : c.bg.surface,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "600", color: emotionIntensity === n ? "#FFF" : c.text.secondary }}>
                      {n}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}

        {currentStep === "distortion" && (
          <View style={{ gap: 8 }}>
            {DISTORTIONS.map((d) => {
              const isSelected = selectedDistortions.includes(d.key);
              return (
                <Pressable
                  key={d.key}
                  onPress={() => toggleDistortion(d.key)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: isSelected ? `${c.brand.purple}20` : c.bg.surface,
                    borderWidth: 1.5,
                    borderColor: isSelected ? c.brand.purple : "transparent",
                  }}
                >
                  <Ionicons
                    name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                    size={20}
                    color={isSelected ? c.brand.purple : c.text.tertiary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: isSelected ? c.brand.purpleLight : c.text.primary }}>
                      {d.label}
                    </Text>
                    <Text style={{ fontSize: 12, color: c.text.secondary }}>{d.desc}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {currentStep === "evidence" && (
          <View style={{ gap: 12 }}>
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: c.brand.teal }}>Evidence FOR this thought</Text>
              <TextInput
                value={evidenceFor}
                onChangeText={setEvidenceFor}
                placeholder="What supports this thought?"
                placeholderTextColor={c.text.tertiary}
                multiline
                style={{
                  backgroundColor: c.bg.surface,
                  borderRadius: 12,
                  padding: 14,
                  color: c.text.primary,
                  fontSize: 15,
                  minHeight: 60,
                  textAlignVertical: "top",
                }}
              />
            </View>
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: c.brand.gold }}>Evidence AGAINST this thought</Text>
              <TextInput
                value={evidenceAgainst}
                onChangeText={setEvidenceAgainst}
                placeholder="What challenges this thought?"
                placeholderTextColor={c.text.tertiary}
                multiline
                style={{
                  backgroundColor: c.bg.surface,
                  borderRadius: 12,
                  padding: 14,
                  color: c.text.primary,
                  fontSize: 15,
                  minHeight: 60,
                  textAlignVertical: "top",
                }}
              />
            </View>
          </View>
        )}

        {currentStep === "reframe" && (
          <View style={{ gap: 12 }}>
            <View style={{
              backgroundColor: c.bg.surface,
              borderRadius: 12,
              padding: 12,
              borderLeftWidth: 3,
              borderLeftColor: c.text.tertiary,
              opacity: 0.7,
            }}>
              <Text style={{ fontSize: 12, color: c.text.tertiary, marginBottom: 4 }}>Original thought</Text>
              <Text style={{ fontSize: 14, color: c.text.secondary, fontStyle: "italic" }}>"{thought}"</Text>
            </View>
            <TextInput
              value={reframe}
              onChangeText={setReframe}
              placeholder="e.g., One critique doesn't define my ability. I've gotten good feedback before."
              placeholderTextColor={c.text.tertiary}
              multiline
              style={{
                backgroundColor: c.bg.surface,
                borderRadius: 12,
                padding: 14,
                color: c.text.primary,
                fontSize: 15,
                minHeight: 80,
                textAlignVertical: "top",
                borderLeftWidth: 3,
                borderLeftColor: c.brand.teal,
              }}
            />
          </View>
        )}
      </Animated.View>

      {/* Navigation */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        {stepIdx > 0 && (
          <Pressable
            onPress={handleBack}
            style={{
              flex: 1,
              paddingVertical: 16,
              borderRadius: 14,
              alignItems: "center",
              backgroundColor: c.bg.surface,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "600", color: c.text.secondary }}>Back</Text>
          </Pressable>
        )}
        <Pressable
          onPress={handleNext}
          disabled={!canProceed()}
          style={{
            flex: 2,
            paddingVertical: 16,
            borderRadius: 14,
            alignItems: "center",
            backgroundColor: canProceed() ? c.brand.purple : c.bg.elevated,
            opacity: canProceed() ? 1 : 0.5,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: "700", color: canProceed() ? "#FFF" : c.text.tertiary }}>
            {stepIdx < STEP_ORDER.length - 1 ? "Next" : "Complete"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
