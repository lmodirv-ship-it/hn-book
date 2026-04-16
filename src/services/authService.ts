/**
 * Auth Service — abstracts authentication operations.
 * 
 * Import: import { authService } from "@/services/authService"
 * 
 * Uses db/oauth for current Supabase backend + apiClient comments for future REST API.
 * Migration: remove db/oauth calls, uncomment apiClient alternatives.
 */

import { db, oauth, apiClient, ok, fail, type ApiResult } from "@/api/client";
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
    displayName: raw.user_metadata?.display_name ?? raw.user_metadata?.full_name ?? raw.displayName,
    avatarUrl: raw.user_metadata?.avatar_url ?? raw.avatarUrl,
  };
}

// ─── Service ─────────────────────────────────────────────────

export const authService = {
  /** Sign in with email + password */
  async login(creds: AuthCredentials): Promise<ApiResult<AuthSession>> {
    // ── Current: Supabase ──
    const { data, error } = await db.auth.signInWithPassword(creds);
    if (error) return fail(error.message);
    return ok({
      user: mapUser(data.user),
      accessToken: data.session.access_token,
    });

    // ── Future: REST API ──
    // const data = await apiClient.post<{ user: any; token: string }>("/auth/login", creds);
    // return ok({ user: mapUser(data.user), accessToken: data.token });
  },

  /** Register with email + password */
  async register(input: RegisterData): Promise<ApiResult<{ message: string }>> {
    // ── Current: Supabase ──
    const { error } = await db.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { display_name: input.displayName } },
    });
    if (error) return fail(error.message);
    return ok({ message: "Account created" });

    // ── Future: REST API ──
    // await apiClient.post("/auth/register", input);
    // return ok({ message: "Account created" });
  },

  /** Sign in with Google OAuth */
  async loginWithGoogle(): Promise<ApiResult<{ redirected: boolean }>> {
    // ── Current: Lovable OAuth ──
    try {
      const result = await oauth.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) return fail("Google sign-in failed");
      return ok({ redirected: !!result.redirected });
    } catch {
      return fail("Google sign-in failed");
    }

    // ── Future: REST API ──
    // window.location.href = "/api/auth/google";
    // return ok({ redirected: true });
  },

  /** Sign out */
  async logout(): Promise<void> {
    // ── Current: Supabase ──
    await db.auth.signOut();

    // ── Future: REST API ──
    // await apiClient.post("/auth/logout", {});
  },

  /** Get current session */
  async getSession(): Promise<ApiResult<AuthSession>> {
    // ── Current: Supabase ──
    const { data: { session } } = await db.auth.getSession();
    if (!session) return fail("No session");
    return ok({
      user: mapUser(session.user),
      accessToken: session.access_token,
    });

    // ── Future: REST API ──
    // const data = await apiClient.get<{ user: any; token: string }>("/auth/session");
    // return ok({ user: mapUser(data.user), accessToken: data.token });
  },

  /** Listen to auth state changes */
  onAuthStateChange(callback: (event: string, user: AppUser | null) => void) {
    // ── Current: Supabase ──
    const { data: { subscription } } = db.auth.onAuthStateChange((event, session) => {
      callback(event, session ? mapUser(session.user) : null);
    });
    return () => subscription.unsubscribe();

    // ── Future: REST API ──
    // Use polling or WebSocket: setInterval(() => apiClient.get("/auth/session"), 30000)
  },

  /** Check if user has a specific role */
  async hasRole(userId: string, role: AppRole): Promise<boolean> {
    // ── Current: Supabase ──
    const { data } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", role)
      .maybeSingle();
    return !!data;

    // ── Future: REST API ──
    // const { hasRole } = await apiClient.get<{ hasRole: boolean }>(`/auth/roles/${userId}/${role}`);
    // return hasRole;
  },

  /** Get user profile */
  async getProfile(userId: string): Promise<ApiResult<UserProfile>> {
    // ── Current: Supabase ──
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

    // ── Future: REST API ──
    // const profile = await apiClient.get(`/users/${userId}/profile`);
    // return ok(profile);
  },

  /** Update user profile */
  async updateProfile(userId: string, input: ProfileUpdateInput): Promise<ApiResult<null>> {
    // ── Current: Supabase ──
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

    // ── Future: REST API ──
    // await apiClient.put(`/users/${userId}/profile`, input);
    // return ok(null);
  },
};
