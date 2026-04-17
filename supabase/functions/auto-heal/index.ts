// Auto-Heal engine — evaluates rules against live metrics and triggers system-control actions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callSystemControl(action: string, authHeader: string) {
  const url = `${SUPABASE_URL}/functions/v1/system-control`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader },
    body: JSON.stringify({ action }),
  });
  const text = await res.text();
  let body: any = text;
  try { body = JSON.parse(text); } catch {}
  return { ok: res.ok, status: res.status, body };
}

async function gatherMetrics(svc: any) {
  const [{ data: jobs }, { data: integrations }] = await Promise.all([
    svc.from("jobs").select("status, started_at"),
    svc.from("api_integrations").select("status, is_active"),
  ]);
  const all = jobs ?? [];
  const failed_jobs = all.filter((j: any) => j.status === "failed").length;
  const queue_depth = all.filter((j: any) => j.status === "pending" || j.status === "processing").length;
  const fiveMinAgo = Date.now() - 5 * 60_000;
  const stuck_workers = all.filter((j: any) =>
    j.status === "processing" && j.started_at && new Date(j.started_at).getTime() < fiveMinAgo
  ).length;
  const api_down = (integrations ?? []).filter((i: any) =>
    i.is_active && (i.status === "error" || i.status === "down")
  ).length;
  return { failed_jobs, queue_depth, stuck_workers, api_down, pdf_errors: 0 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? `Bearer ${SERVICE_ROLE}`;
  const svc = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "evaluate";

    // ---- LIST/CONFIG endpoints (admin only when called from UI) ----
    if (action === "list_rules") {
      const { data } = await svc.from("auto_heal_rules").select("*").order("key");
      const { data: cfg } = await svc.from("system_config").select("value").eq("key", "auto_heal_enabled").maybeSingle();
      return json({ rules: data ?? [], enabled: cfg?.value ?? true });
    }

    if (action === "set_global") {
      await svc.from("system_config").upsert(
        { key: "auto_heal_enabled", category: "system", value: !!body.enabled },
        { onConflict: "key" }
      );
      return json({ ok: true });
    }

    if (action === "toggle_rule") {
      await svc.from("auto_heal_rules").update({ enabled: !!body.enabled }).eq("id", body.id);
      return json({ ok: true });
    }

    if (action === "update_rule") {
      const patch: any = {};
      if (typeof body.threshold === "number") patch.threshold = body.threshold;
      if (typeof body.cooldown_seconds === "number") patch.cooldown_seconds = body.cooldown_seconds;
      if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
      await svc.from("auto_heal_rules").update(patch).eq("id", body.id);
      return json({ ok: true });
    }

    if (action === "recent_runs") {
      const { data } = await svc.from("auto_heal_runs").select("*").order("created_at", { ascending: false }).limit(50);
      return json({ runs: data ?? [] });
    }

    // ---- EVALUATE: the heart of the engine ----
    const { data: cfg } = await svc.from("system_config").select("value").eq("key", "auto_heal_enabled").maybeSingle();
    const enabled = cfg?.value === false ? false : true;
    if (!enabled && action === "evaluate") {
      return json({ skipped: true, reason: "auto_heal_disabled" });
    }

    const metrics = await gatherMetrics(svc);
    const { data: rules } = await svc.from("auto_heal_rules").select("*").eq("enabled", true);
    const results: any[] = [];
    const now = Date.now();

    for (const rule of rules ?? []) {
      const value = (metrics as any)[rule.trigger_metric] ?? 0;
      const cooldownPassed = !rule.last_triggered_at ||
        (now - new Date(rule.last_triggered_at).getTime()) >= rule.cooldown_seconds * 1000;

      if (value < rule.threshold) {
        results.push({ rule: rule.key, metric: rule.trigger_metric, value, threshold: rule.threshold, triggered: false });
        continue;
      }
      if (!cooldownPassed) {
        results.push({ rule: rule.key, metric: rule.trigger_metric, value, threshold: rule.threshold, triggered: false, reason: "cooldown" });
        continue;
      }

      // Trigger action
      const actionResult = await callSystemControl(rule.action, authHeader);
      const success = actionResult.ok;

      await svc.from("auto_heal_rules").update({ last_triggered_at: new Date().toISOString() }).eq("id", rule.id);
      await svc.from("auto_heal_runs").insert({
        rule_key: rule.key,
        metric: rule.trigger_metric,
        metric_value: value,
        threshold: rule.threshold,
        action: rule.action,
        triggered: true,
        success,
        message: success ? `Auto-fix applied: ${rule.action}` : `Auto-fix FAILED: ${rule.action}`,
        details: actionResult.body,
      });

      if (!success) {
        await svc.from("system_alerts").insert({
          level: "error",
          source: "auto_heal",
          message: `Auto-fix failed for rule "${rule.label}" (${rule.action})`,
          details: { rule: rule.key, metric: rule.trigger_metric, value, response: actionResult.body },
        });
      } else {
        await svc.from("system_alerts").insert({
          level: "info",
          source: "auto_heal",
          message: `Auto-healed: ${rule.label} (${rule.trigger_metric}=${value})`,
          details: { rule: rule.key, action: rule.action },
        });
      }

      results.push({ rule: rule.key, metric: rule.trigger_metric, value, threshold: rule.threshold, triggered: true, success });
    }

    return json({ ok: true, enabled, metrics, results });
  } catch (e: any) {
    console.error("auto-heal error:", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
