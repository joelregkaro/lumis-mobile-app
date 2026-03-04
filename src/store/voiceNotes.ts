import { create } from "zustand";
import { supabase } from "@/lib/supabase";

interface VoiceNote {
  id: string;
  user_id: string;
  audio_url: string | null;
  transcript: string | null;
  themes: string[];
  duration_seconds: number | null;
  created_at: string;
}

interface VoiceNoteState {
  notes: VoiceNote[];
  isRecording: boolean;
  isUploading: boolean;

  fetchNotes: () => Promise<void>;
  saveNote: (audioUri: string, durationMs: number) => Promise<void>;
}

export const useVoiceNoteStore = create<VoiceNoteState>((set) => ({
  notes: [],
  isRecording: false,
  isUploading: false,

  fetchNotes: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("voice_notes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    set({ notes: (data as VoiceNote[]) ?? [] });
  },

  saveNote: async (audioUri: string, durationMs: number) => {
    set({ isUploading: true });
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const fileName = `${user.id}/${Date.now()}.m4a`;
      const response = await fetch(audioUri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from("voice-notes")
        .upload(fileName, blob, { contentType: "audio/m4a" });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("voice-notes").getPublicUrl(fileName);

      const { data: note } = await supabase
        .from("voice_notes")
        .insert({
          user_id: user.id,
          audio_url: publicUrl,
          duration_seconds: Math.round(durationMs / 1000),
        })
        .select()
        .single();

      if (note) {
        set((s) => ({ notes: [note as VoiceNote, ...s.notes] }));

        // Trigger transcription in the background
        const session = await supabase.auth.getSession();
        fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/transcribe-voice`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.data.session?.access_token}`,
            },
            body: JSON.stringify({ voice_note_id: note.id }),
          },
        ).catch(() => {});
      }
    } finally {
      set({ isUploading: false });
    }
  },
}));
