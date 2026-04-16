/**
 * API Client — single point of contact with the backend.
 * 
 * Currently wraps Supabase client from Lovable Cloud.
 * 
 * To migrate to a custom Node.js backend:
 *   1. Change API_BASE to your server URL
 *   2. The apiClient fetch wrapper becomes the primary method
 *   3. Remove Supabase imports
 * 
 * Both methods are available during transition:
 *   - `db` / `oauth` → current Supabase-based backend
 *   - `apiClient`    → future REST API backend
 */

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

// ─── REST API Client (for future backend) ────────────────────

const API_BASE = "/api"; // لاحقاً تبدلها للسيرفر مثل: "https://api.hn-book.com"

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = (await supabase.auth.getSession()).data.session?.access_token;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `API Error: ${res.status}`);
  }

  return res.json();
}

// Shorthand helpers
apiClient.get = <T = any>(endpoint: string) => apiClient<T>(endpoint);
apiClient.post = <T = any>(endpoint: string, body: any) =>
  apiClient<T>(endpoint, { method: "POST", body: JSON.stringify(body) });
apiClient.put = <T = any>(endpoint: string, body: any) =>
  apiClient<T>(endpoint, { method: "PUT", body: JSON.stringify(body) });
apiClient.del = <T = any>(endpoint: string) =>
  apiClient<T>(endpoint, { method: "DELETE" });

// ─── Current Supabase Client (active backend) ────────────────

export const db = supabase;
export const oauth = lovable;

// ─── Helpers ─────────────────────────────────────────────────

export interface ApiResult<T> {
  data: T | null;
  error: string | null;
}

export function ok<T>(data: T): ApiResult<T> {
  return { data, error: null };
}

export function fail<T = null>(error: string): ApiResult<T> {
  return { data: null, error };
}
