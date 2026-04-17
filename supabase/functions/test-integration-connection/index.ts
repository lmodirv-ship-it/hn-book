// Admin-only: pings an integration's base_url using the resolved secret to
// verify the credential works. Accepts either an existing integration id/name
// or an ad-hoc payload (used by the admin form before saving).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type TestPayload = {
  id?: string;
  name?: string;
  // Ad-hoc (used in the form before persisting)
  base_url?: string;
  secret_ref?: string;
  api_key_name?: string;
  config?: Record<string, unknown>;
};

function authHeaderName(apiKeyName: string | null | undefined): string {
  return (apiKeyName && apiKeyName.trim()) || "Authorization";
}

function buildAuthHeaders(apiKeyName: string | null | undefined, secret: string): Record<string, string> {
  const header = authHeaderName(apiKeyName);
  // If the user picked "Authorization" we default to Bearer scheme.
  if (header.toLowerCase() === "authorization") {
    return { Authorization: `Bearer ${secret}` };
  }
  return { [header]: secret };
}

async function pingUrl(url: string, headers: Record<string, string>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json", ...headers },
      signal: controller.signal,
      redirect: "follow",
    });
    let snippet = "";
    try {
      const text = await res.text();
      snippet = text.slice(0, 200);
    } catch { /* ignore */ }
    return { ok: res.ok, status: res.status, snippet };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, status: 0, snippet: msg };
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // AuthN + admin check
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ ok: false, error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json().catch(() => ({}))) as TestPayload;

    // Resolve integration data from either DB lookup or ad-hoc payload
    let base_url = payload.base_url ?? "";
    let secret_ref = payload.secret_ref ?? "";
    let api_key_name = payload.api_key_name ?? "";
    let name = payload.name ?? "(ad-hoc)";

    if (payload.id || payload.name) {
      const q = admin.from("api_integrations").select("name, base_url, secret_ref, api_key_name, config");
      const { data: integ } = payload.id
        ? await q.eq("id", payload.id).maybeSingle()
        : await q.ilike("name", payload.name!).maybeSingle();
      if (!integ) {
        return new Response(JSON.stringify({ ok: false, error: "integration not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      base_url = (integ.base_url as string) || base_url;
      secret_ref = (integ.secret_ref as string | null) ?? secret_ref;
      api_key_name = (integ.api_key_name as string | null) ?? api_key_name;
      name = (integ.name as string) || name;
    }

    // Validate inputs
    if (!base_url || !/^https?:\/\//i.test(base_url)) {
      return new Response(JSON.stringify({
        ok: false, stage: "validation",
        error: "base_url is missing or not a valid http(s) URL",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let secret: string | null = null;
    if (secret_ref) {
      secret = Deno.env.get(secret_ref) ?? null;
      if (!secret) {
        return new Response(JSON.stringify({
          ok: false, stage: "secret",
          error: `Secret '${secret_ref}' is not configured in Lovable Cloud`,
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const headers = secret ? buildAuthHeaders(api_key_name, secret) : {};
    const result = await pingUrl(base_url, headers);

    return new Response(JSON.stringify({
      ok: result.ok,
      stage: "request",
      name,
      status: result.status,
      snippet: result.snippet,
      tested_url: base_url,
      auth_header: secret ? authHeaderName(api_key_name) : null,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
