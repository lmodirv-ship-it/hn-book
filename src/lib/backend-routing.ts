/**
 * Backend routing helper.
 *
 * Reads `active_backend` and `external_api_base_url` from `system_config`
 * and tells the app which base URL to use for non-Supabase REST calls.
 *
 * - `lovable`  → returns "" (use Supabase client / edge functions normally)
 * - `external` → returns the external server base URL
 *
 * This does NOT replace the Supabase client. It only augments REST calls
 * that should fail over to the backup server.
 */
import { supabase } from "@/integrations/supabase/client";

export type ActiveBackend = "lovable" | "external";

let cache: { backend: ActiveBackend; externalUrl: string; ts: number } | null = null;
const TTL_MS = 30_000;

export async function getBackendConfig(force = false): Promise<{
  backend: ActiveBackend;
  externalUrl: string;
}> {
  if (!force && cache && Date.now() - cache.ts < TTL_MS) {
    return { backend: cache.backend, externalUrl: cache.externalUrl };
  }
  const { data } = await supabase
    .from("system_config")
    .select("key,value")
    .in("key", ["active_backend", "external_api_base_url"]);

  const map = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
  const backend: ActiveBackend = map.active_backend === "external" ? "external" : "lovable";
  const externalUrl: string = typeof map.external_api_base_url === "string" ? map.external_api_base_url : "";
  cache = { backend, externalUrl, ts: Date.now() };
  return { backend, externalUrl };
}

export function clearBackendCache() {
  cache = null;
}

/**
 * Returns the base URL for REST calls.
 * Empty string means "use Lovable Cloud / Supabase as usual".
 */
export async function getApiBaseUrl(): Promise<string> {
  const { backend, externalUrl } = await getBackendConfig();
  return backend === "external" ? externalUrl : "";
}
