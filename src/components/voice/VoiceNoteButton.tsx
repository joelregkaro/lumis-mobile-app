import { useState, useRef, useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAudioRecorder, AudioModule, RecordingPresets } from "expo-audio";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { useVoiceNoteStore } from "@/store/voiceNotes";

export default function VoiceNoteButton() {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { saveNote, isUploading } = useVoiceNoteStore();

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isRecording) {
      pulse.value = withRepeat(withTiming(1.2, { duration: 800 }), -1, true);
    } else {
      pulse.value = 1;
    }
  }, [isRecording]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const startRecording = async () => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) return;

      recorder.record();
      setIsRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      await hapticLight();
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  };

  const stopRecording = async () => {
    try {
      await recorder.stop();
      const uri = recorder.uri;
      const durationMs = duration * 1000;
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (uri) {
        await hapticSuccess();
        await saveNote(uri, durationMs);
      }
    } catch (err) {
      console.error("Failed to stop recording:", err);
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (isUploading) {
    return (
      <Animated.View entering={FadeIn} exiting={FadeOut} style={{ alignItems: "center" }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#1E1E27", alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="small" color="#A78BFA" />
        </View>
        <Text style={{ fontSize: 13, color: "#71717A", marginTop: 8 }}>Saving</Text>
      </Animated.View>
    );
  }

  return (
    <View style={{ alignItems: "center" }}>
      <Pressable onPress={isRecording ? stopRecording : startRecording} accessibilityLabel={isRecording ? "Stop recording" : "Record voice note"}>
        <Animated.View
          style={[
            isRecording ? pulseStyle : undefined,
            {
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: isRecording ? "#F8717130" : "#F4727215",
              alignItems: "center",
              justifyContent: "center",
            },
          ]}
        >
          <Ionicons name={isRecording ? "stop" : "mic-outline"} size={22} color={isRecording ? "#F87171" : "#F472B6"} />
        </Animated.View>
      </Pressable>
      <Text style={{ fontSize: 13, color: "#A1A1AA", marginTop: 8, fontWeight: "500" }}>
        {isRecording ? formatTime(duration) : "Voice Note"}
      </Text>
    </View>
  );
}
