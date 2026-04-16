/**
 * Auth Service — abstracts authentication operations.
 * Currently backed by Supabase Auth via Lovable Cloud.
 * To migrate: replace the implementation, keep the interface.
 */

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import type {
  AppUser,
  AuthSession,
  AuthCredentials,
  RegisterData,
  ServiceResult,
  AppRole,
  UserProfile,
  ProfileUpdateInput,
} from "./types";

// ─── Mappers (internal) ─────────────────────────────────────

function mapUser(raw: any): AppUser {
  return {
    id: raw.id,
    email: raw.email ?? "",
    displayName: raw.user_metadata?.display_name ?? raw.user_metadata?.full_name,
    avatarUrl: raw.user_metadata?.avatar_url,
  };
}

// ─── Auth ────────────────────────────────────────────────────

export const authService = {
  /** Sign in with email + password */
  async signIn(creds: AuthCredentials): Promise<ServiceResult<AuthSession>> {
    const { data, error } = await supabase.auth.signInWithPassword(creds);
    if (error) return { data: null, error: error.message };
    return {
      data: {
        user: mapUser(data.user),
        accessToken: data.session.access_token,
      },
      error: null,
    };
  },

  /** Register with email + password */
  async register(input: RegisterData): Promise<ServiceResult<{ message: string }>> {
    const { error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { display_name: input.displayName } },
    });
    if (error) return { data: null, error: error.message };
    return { data: { message: "Account created" }, error: null };
  },

  /** Sign in with Google OAuth */
  async signInWithGoogle(): Promise<ServiceResult<{ redirected: boolean }>> {
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) return { data: null, error: "Google sign-in failed" };
      return { data: { redirected: !!result.redirected }, error: null };
    } catch {
      return { data: null, error: "Google sign-in failed" };
    }
  },

  /** Sign out */
  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  },

  /** Get current session */
  async getSession(): Promise<ServiceResult<AuthSession>> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { data: null, error: "No session" };
    return {
      data: {
        user: mapUser(session.user),
        accessToken: session.access_token,
      },
      error: null,
    };
  },

  /** Listen to auth state changes */
  onAuthStateChange(callback: (event: string, user: AppUser | null) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session ? mapUser(session.user) : null);
    });
    return () => subscription.unsubscribe();
  },

  /** Check if user has a specific role */
  async hasRole(userId: string, role: AppRole): Promise<boolean> {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", role)
      .maybeSingle();
    return !!data;
  },

  /** Get user profile */
  async getProfile(userId: string): Promise<ServiceResult<UserProfile>> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (error) return { data: null, error: error.message };
    return {
      data: {
        id: data.id,
        userId: data.user_id,
        displayName: data.display_name ?? undefined,
        avatarUrl: data.avatar_url ?? undefined,
        phone: data.phone ?? undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
      error: null,
    };
  },

  /** Update user profile */
  async updateProfile(userId: string, input: ProfileUpdateInput): Promise<ServiceResult<null>> {
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: input.displayName,
        phone: input.phone,
        avatar_url: input.avatarUrl,
      })
      .eq("user_id", userId);
    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  },
};
