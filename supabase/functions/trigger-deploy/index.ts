// Admin-only deploy webhook trigger.
// Reads deploy_url + deploy_payload_template from system_config,
// merges runtime fields (timestamp, build.hash), and POSTs to the
// configured external endpoint with the x-api-key header.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const deployKey = Deno.env.get("DEPLOY_API_KEY") ?? "";

    // Auth check: must be admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "forbidden" }, 403);

    if (!deployKey) return json({ error: "DEPLOY_API_KEY secret not set" }, 400);

    // Load config
    const { data: cfgRows } = await admin
      .from("system_config")
      .select("key,value")
      .in("key", ["deploy_url", "deploy_payload_template"]);

    const cfg = Object.fromEntries((cfgRows ?? []).map((r: any) => [r.key, r.value]));
    const deployUrl: string = typeof cfg.deploy_url === "string" ? cfg.deploy_url : "";
    if (!deployUrl) return json({ error: "deploy_url not configured" }, 400);

    const body = await req.json().catch(() => ({}));
    const buildHash: string = body.build_hash ?? "";
    const buildId: string = body.build_id ?? "";
    const notes: string = body.notes ?? "";
    const trigger: string = body.trigger ?? "manual"; // 'manual' | 'auto'

    // Merge template with runtime fields
    const template = (cfg.deploy_payload_template ?? {}) as Record<string, any>;
    const payload = {
      ...template,
      timestamp: Date.now(),
      trigger,
      build: { ...(template.build ?? {}), id: buildId, hash: buildHash },
      meta: {
        ...(template.meta ?? {}),
        user: userData.user.email ?? "admin",
        notes,
      },
    };

    const startedAt = Date.now();
    let status = 0;
    let snippet = "";
    let success = false;

    try {
      const res = await fetch(deployUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": deployKey,
        },
        body: JSON.stringify(payload),
      });
      status = res.status;
      snippet = (await res.text()).slice(0, 500);
      success = res.ok;
    } catch (e) {
      snippet = String(e).slice(0, 500);
    }

    const durationMs = Date.now() - startedAt;

    // Log to integration_logs
    await admin.from("integration_logs").insert({
      provider: "deploy_webhook",
      action: trigger === "auto" ? "auto_deploy" : "manual_deploy",
      success,
      status_code: status,
      duration_ms: durationMs,
      message: snippet,
      metadata: { deploy_url: deployUrl, build_hash: buildHash, build_id: buildId },
      triggered_by: userData.user.id,
    });

    // Persist last status
    await admin
      .from("system_config")
      .update({
        value: JSON.stringify(
          `${success ? "✓" : "✗"} ${status} @ ${new Date().toISOString()} — ${snippet.slice(0, 120)}`,
        ),
      })
      .eq("key", "deploy_last_status");

    return json({ success, status, duration_ms: durationMs, snippet });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
