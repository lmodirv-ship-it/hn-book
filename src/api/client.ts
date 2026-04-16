/**
 * API Client — single point of contact with the backend.
 * 
 * Currently wraps Supabase client from Lovable Cloud.
 * To migrate to a custom backend (Node.js, etc.):
 *   1. Replace this file with your own HTTP client (fetch/axios)
 *   2. Keep the same exported interface
 *   3. All services automatically use the new backend
 */

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

// Re-export the raw clients for services to use internally
export const db = supabase;
export const oauth = lovable;

// ─── Helpers ─────────────────────────────────────────────────

/** Generic query helper — wraps Supabase responses into a clean result */
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

/**
 * Wrap any async Supabase call into an ApiResult.
 * Usage: const result = await wrap(supabase.from('x').select('*'));
 */
export async function wrap<T>(
  promise: PromiseLike<{ data: T | null; error: { message: string } | null }>
): Promise<ApiResult<T>> {
  const { data, error } = await promise;
  if (error) return fail(error.message);
  return ok(data as T);
}
