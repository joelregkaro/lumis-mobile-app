import { create } from "zustand";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";
import type { User as AppUser } from "@/types/database";
import type { Session, User } from "@supabase/supabase-js";

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: AppUser | null;
  isLoading: boolean;
  isOnboarded: boolean;

  initialize: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  setOnboarded: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isOnboarded: false,

  initialize: async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      set({ session, user: session?.user ?? null });

      if (session?.user) {
        await get().fetchProfile();
      }

      set({ isLoading: false });

      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user ?? null });
        if (session?.user) {
          get().fetchProfile();
        } else {
          set({ profile: null, isOnboarded: false });
        }
      });
    } catch {
      set({ isLoading: false });
    }
  },

  signInWithEmail: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  signUpWithEmail: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    if (data.user) {
      const { error: profileError } = await supabase.from("users").upsert(
        {
          id: data.user.id,
          email: data.user.email ?? email,
          display_name: null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          preferences: {},
        },
        { onConflict: "id" },
      );
      if (profileError) console.warn("Profile creation warning:", profileError.message);
    }
  },

  signInWithApple: async () => {
    if (Platform.OS !== "ios") throw new Error("Apple Sign In is only available on iOS");

    const AppleAuth = require("expo-apple-authentication");
    const Crypto = require("expo-crypto");

    const nonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      nonce,
    );

    const credential = await AppleAuth.signInAsync({
      requestedScopes: [
        AppleAuth.AppleAuthenticationScope.FULL_NAME,
        AppleAuth.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!credential.identityToken) {
      throw new Error("No identity token returned from Apple");
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
      nonce,
    });
    if (error) throw error;
  },

  signInWithGoogle: async () => {
    const AuthSession = require("expo-auth-session");
    const Crypto = require("expo-crypto");

    const redirectUri = AuthSession.makeRedirectUri({ scheme: "lumis" });

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true,
      },
    });
    if (error) throw error;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null, isOnboarded: false });
  },

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;

    let { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error && !data) {
      console.warn("fetchProfile: query failed, skipping to avoid data overwrite:", error.message);
      return;
    }

    if (!data) {
      const { data: created } = await supabase
        .from("users")
        .upsert(
          {
            id: user.id,
            email: user.email ?? "",
            display_name: null,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            preferences: {},
          },
          { onConflict: "id" },
        )
        .select()
        .single();
      data = created;
    }

    if (data) {
      set({
        profile: data as AppUser,
        isOnboarded: !!data.onboarding_completed_at,
      });
    }
  },

  setOnboarded: (value) => set({ isOnboarded: value }),
}));
