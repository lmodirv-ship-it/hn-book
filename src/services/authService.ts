/**
 * Auth Service — abstracts authentication operations.
 * 
 * Import: import { authService } from "@/services/authService"
 * Migration: change only the implementation here, UI stays the same.
 */

import { db, oauth, ok, fail, type ApiResult } from "@/api/client";
import type {
  AppUser,
  AuthSession,
  AuthCredentials,
  RegisterData,
  AppRole,
  UserProfile,
  ProfileUpdateInput,
} from "./types";

// ─── Mappers ─────────────────────────────────────────────────

function mapUser(raw: any): AppUser {
  return {
    id: raw.id,
    email: raw.email ?? "",
    displayName: raw.user_metadata?.display_name ?? raw.user_metadata?.full_name,
    avatarUrl: raw.user_metadata?.avatar_url,
  };
}

// ─── Service ─────────────────────────────────────────────────

export const authService = {
  async signIn(creds: AuthCredentials): Promise<ApiResult<AuthSession>> {
    const { data, error } = await db.auth.signInWithPassword(creds);
    if (error) return fail(error.message);
    return ok({
      user: mapUser(data.user),
      accessToken: data.session.access_token,
    });
  },

  async register(input: RegisterData): Promise<ApiResult<{ message: string }>> {
    const { error } = await db.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { display_name: input.displayName } },
    });
    if (error) return fail(error.message);
    return ok({ message: "Account created" });
  },

  async signInWithGoogle(): Promise<ApiResult<{ redirected: boolean }>> {
    try {
      const result = await oauth.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) return fail("Google sign-in failed");
      return ok({ redirected: !!result.redirected });
    } catch {
      return fail("Google sign-in failed");
    }
  },

  async signOut(): Promise<void> {
    await db.auth.signOut();
  },

  async getSession(): Promise<ApiResult<AuthSession>> {
    const { data: { session } } = await db.auth.getSession();
    if (!session) return fail("No session");
    return ok({
      user: mapUser(session.user),
      accessToken: session.access_token,
    });
  },

  onAuthStateChange(callback: (event: string, user: AppUser | null) => void) {
    const { data: { subscription } } = db.auth.onAuthStateChange((event, session) => {
      callback(event, session ? mapUser(session.user) : null);
    });
    return () => subscription.unsubscribe();
  },

  async hasRole(userId: string, role: AppRole): Promise<boolean> {
    const { data } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", role)
      .maybeSingle();
    return !!data;
  },

  async getProfile(userId: string): Promise<ApiResult<UserProfile>> {
    const { data, error } = await db
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (error) return fail(error.message);
    return ok({
      id: data.id,
      userId: data.user_id,
      displayName: data.display_name ?? undefined,
      avatarUrl: data.avatar_url ?? undefined,
      phone: data.phone ?? undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  },

  async updateProfile(userId: string, input: ProfileUpdateInput): Promise<ApiResult<null>> {
    const { error } = await db
      .from("profiles")
      .update({
        display_name: input.displayName,
        phone: input.phone,
        avatar_url: input.avatarUrl,
      })
      .eq("user_id", userId);
    if (error) return fail(error.message);
    return ok(null);
  },
};
