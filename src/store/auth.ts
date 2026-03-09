import { create } from "zustand";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";
import { track, identify, reset as resetAnalytics } from "@/lib/analytics";
import type { User as AppUser } from "@/types/database";
import type { Session, User } from "@supabase/supabase-js";

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: AppUser | null;
  isLoading: boolean;
  isOnboarded: boolean;

  initialize: () => Promise<void>;
  _subscribeAuthChanges: () => void;
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
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        // Expired or invalid refresh token — clear stale state and send to sign-in
        console.warn("getSession error (likely expired refresh token):", error.message);
        await supabase.auth.signOut().catch(() => {});
        set({ session: null, user: null, profile: null, isOnboarded: false, isLoading: false });
        get()._subscribeAuthChanges();
        return;
      }

      const session = data.session;
      set({ session, user: session?.user ?? null });

      if (session?.user) {
        await get().fetchProfile();
      }

      set({ isLoading: false });
      get()._subscribeAuthChanges();
    } catch (err) {
      console.warn("initialize error:", err);
      set({ isLoading: false });
    }
  },

  _subscribeAuthChanges: () => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "TOKEN_REFRESHED" && session) {
        // Token refreshed — update session/user but DON'T touch isOnboarded
        set({ session, user: session.user });
        return;
      }

      if (event === "SIGNED_OUT" || !session) {
        set({ session: null, user: null, profile: null, isOnboarded: false });
        return;
      }

      // SIGNED_IN or INITIAL_SESSION — fully load the profile before updating state
      const prevUser = get().user;
      set({ session, user: session.user });

      if (session.user && session.user.id !== prevUser?.id) {
        await get().fetchProfile();
      }
    });
  },

  signInWithEmail: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) {
      set({ session: data.session, user: data.user });
      identify(data.user.id);
      track("sign_in", { method: "email" });
      await get().fetchProfile();
    }
  },

  signUpWithEmail: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    if (data.user) {
      identify(data.user.id);
      track("sign_up", { method: "email" });
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
    track("sign_in", { method: "apple" });
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
    track("sign_in", { method: "google" });
  },

  signOut: async () => {
    track("sign_out");
    resetAnalytics();
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null, isOnboarded: false });
  },

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;

    try {
      let { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error && error.code === "PGRST116") {
        // Row not found — create one
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
      } else if (error) {
        console.warn("fetchProfile: query failed:", error.message);
        // Don't overwrite existing isOnboarded if we had a profile before
        if (get().profile) return;
        return;
      }

      if (data) {
        set({
          profile: data as AppUser,
          isOnboarded: !!data.onboarding_completed_at,
        });
      }
    } catch (err) {
      console.warn("fetchProfile exception:", err);
    }
  },

  setOnboarded: (value) => set({ isOnboarded: value }),
}));
