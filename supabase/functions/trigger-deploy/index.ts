// Admin-only deploy webhook trigger.
// - Retries with exponential backoff on transient failures (network/5xx/timeouts).
// - Emits per-phase status logs (build/upload/deploy) into integration_logs.
// - Persists last status string in system_config (deploy_last_status).
// - Reads deploy_url + deploy_payload_template from system_config and merges
//   runtime fields (timestamp, build.hash) before POSTing with x-api-key.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 1500; // 1.5s, 3s, 6s
const REQUEST_TIMEOUT_MS = 25_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

    // Helper: insert a phase log row
    const logPhase = async (
      phase: "build" | "upload" | "deploy",
      success: boolean,
      message: string,
      extra: Record<string, unknown> = {},
    ) => {
      await admin.from("integration_logs").insert({
        provider: "deploy_webhook",
        action: `${trigger}_${phase}`,
        success,
        status_code: (extra.status_code as number) ?? null,
        duration_ms: (extra.duration_ms as number) ?? null,
        message: message.slice(0, 500),
        metadata: {
          phase,
          deploy_url: deployUrl,
          build_hash: buildHash,
          build_id: buildId,
          ...extra,
        },
        triggered_by: userData.user.id,
      });
    };

    // ── Phase 1: build (we don't actually build; we just record the build hash)
    await logPhase("build", true, `build hash captured: ${buildHash || "n/a"}`);

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

    // ── Phase 2: upload (POST to deploy URL with retries) ──────────────
    let attempt = 0;
    let status = 0;
    let snippet = "";
    let success = false;
    let lastError = "";
    const totalStart = Date.now();

    while (attempt < MAX_ATTEMPTS) {
      attempt++;
      const startedAt = Date.now();
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
      try {
        const res = await fetch(deployUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": deployKey,
          },
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        });
        clearTimeout(tid);
        status = res.status;
        snippet = (await res.text()).slice(0, 500);
        success = res.ok;
        const dur = Date.now() - startedAt;

        await logPhase(
          "upload",
          success,
          `attempt ${attempt}/${MAX_ATTEMPTS} → ${status}${success ? " ok" : " fail"}: ${snippet.slice(0, 200)}`,
          { attempt, status_code: status, duration_ms: dur },
        );

        // Retry on 5xx; do not retry on 2xx/4xx
        if (success || (status >= 400 && status < 500)) break;
        lastError = `HTTP ${status}`;
      } catch (e) {
        clearTimeout(tid);
        const dur = Date.now() - startedAt;
        lastError = String(e);
        snippet = lastError.slice(0, 500);
        await logPhase("upload", false, `attempt ${attempt}/${MAX_ATTEMPTS} threw: ${snippet.slice(0, 200)}`, {
          attempt,
          duration_ms: dur,
          error: lastError,
        });
      }

      if (attempt < MAX_ATTEMPTS) {
        await sleep(BASE_BACKOFF_MS * Math.pow(2, attempt - 1));
      }
    }

    const durationMs = Date.now() - totalStart;

    // ── Phase 3: deploy (final outcome) ─────────────────────────────────
    await logPhase(
      "deploy",
      success,
      success
        ? `deploy completed in ${durationMs}ms (status ${status})`
        : `deploy FAILED after ${attempt} attempt(s): ${lastError || snippet}`,
      { status_code: status, duration_ms: durationMs, attempts: attempt },
    );

    // Persist last status (compact summary)
    const summary = `${success ? "✓" : "✗"} ${status} @ ${new Date().toISOString()} — ${attempt} try(s), ${durationMs}ms — ${snippet.slice(0, 100)}`;
    await admin
      .from("system_config")
      .update({ value: summary as any })
      .eq("key", "deploy_last_status");

    return json({
      success,
      status,
      attempts: attempt,
      duration_ms: durationMs,
      snippet,
      message: success
        ? `Deployment completed (${attempt} attempt${attempt > 1 ? "s" : ""}, ${durationMs}ms)`
        : `Deployment failed after ${attempt} attempts: ${lastError || snippet}`,
    }, success ? 200 : 502);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
