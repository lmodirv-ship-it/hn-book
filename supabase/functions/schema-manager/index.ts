// Edge function: schema-manager
// Admin-only proxy to the VPS mirror for schema/migration/data operations.
// Actions:
//   "schema" | "migrate" | "sync-log" | "schema-events" | "health"
//   "overview" | "table-data" | "row-insert" | "row-update" | "row-delete"
//   "query" | "add-column" | "audit-log"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const VPS_URL = Deno.env.get("VPS_BACKUP_URL");
  const VPS_TOKEN = Deno.env.get("VPS_BACKUP_TOKEN");
  const authHeader = req.headers.get("Authorization") ?? "";

  // Admin check
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes } = await userClient.auth.getUser();
  if (!userRes?.user) return j({ error: "unauthorized" }, 401);
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userRes.user.id);
  if (!roles?.some((r: any) => r.role === "admin")) return j({ error: "forbidden" }, 403);

  if (!VPS_URL || !VPS_TOKEN) {
    // VPS backup is optional — return a soft response instead of 400 so the admin UI doesn't error out.
    return j({
      ok: false,
      vps_disabled: true,
      message: "VPS backup not configured (VPS_BACKUP_URL / VPS_BACKUP_TOKEN missing). Feature disabled.",
    }, 200);
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action ?? "schema";
  const base = VPS_URL.replace(/\/backup\/?$/, "").replace(/\/$/, "");

  // Special action: read tables from Supabase and push to VPS as a backup payload.
  if (action === "cloud-snapshot") {
    return await cloudSnapshot(body, admin, base, VPS_TOKEN!, userRes.user.email ?? userRes.user.id);
  }
  // Special action: list public tables in Supabase (the "source" side).
  if (action === "cloud-tables") {
    const { data, error } = await admin.rpc("pg_catalog_tables" as any).catch(() => ({ data: null, error: null }));
    // Fallback: query information_schema via REST is not allowed, so we use a known list.
    // Instead, ask Postgres directly through a lightweight SQL helper if it exists,
    // otherwise return the curated list of project tables.
    const fallback = [
      "products","categories","assets","asset_files","customers","orders","order_items",
      "purchases","cart_items","profiles","print_orders","card_templates","svg_templates",
      "logos","coupons","cms_content","page_customizations","feature_flags",
      "pricing_rules","print_pricing_rules","manual_recommendations","subscription_plans",
      "subscriptions","credit_transactions","api_integrations","integration_logs",
    ];
    return j({ ok: true, tables: data ?? fallback });
  }

  // GET endpoints (no body)
  const getMap: Record<string, string> = {
    "schema":        "/schema",
    "sync-log":      "/sync-log",
    "schema-events": "/schema-events",
    "health":        "/health",
    "overview":      "/overview",
    "audit-log":     "/audit-log",
  };

  // POST endpoints (forward body minus `action`)
  const postMap: Record<string, string> = {
    "migrate":     "/migrate",
    "table-data":  "/table-data",
    "row-insert":  "/row-insert",
    "row-update":  "/row-update",
    "row-delete":  "/row-delete",
    "query":       "/query",
    "add-column":  "/add-column",
  };

  const isGet = action in getMap;
  const isPost = action in postMap;
  if (!isGet && !isPost) return j({ error: "unknown_action" }, 400);

  const path = isGet ? getMap[action] : postMap[action];
  const method = isGet ? "GET" : "POST";

  try {
    const t0 = Date.now();
    // Forward actor info so the VPS can write to its audit log.
    const forwardBody = isPost ? { ...body, _actor: userRes.user.email ?? userRes.user.id } : undefined;
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VPS_TOKEN}`,
      },
      body: forwardBody ? JSON.stringify(forwardBody) : undefined,
    });
    const text = await res.text();
    let data: any; try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return j({ ok: res.ok, status: res.status, duration_ms: Date.now() - t0, data }, res.ok ? 200 : 502);
  } catch (e: any) {
    return j({ ok: false, error: e?.message ?? String(e) }, 502);
  }

  function j(obj: unknown, status = 200) {
    return new Response(JSON.stringify(obj), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Read selected tables from Supabase using the service role and POST them to
 * the VPS /backup endpoint. The VPS upserts on `id`, so re-running is safe.
 */
async function cloudSnapshot(
  body: any,
  admin: ReturnType<typeof createClient>,
  base: string,
  vpsToken: string,
  actor: string,
) {
  const tables: string[] = Array.isArray(body?.tables) ? body.tables : [];
  const limit = Math.min(Math.max(Number(body?.limit) || 1000, 1), 5000);
  if (tables.length === 0) {
    return new Response(JSON.stringify({ ok: false, error: "no_tables_selected" }), {
      status: 400,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    });
  }

  const data: Record<string, any[]> = {};
  const perTable: Array<{ table: string; rows: number; error?: string }> = [];
  for (const t of tables) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(t)) {
      perTable.push({ table: t, rows: 0, error: "unsafe_name" });
      continue;
    }
    try {
      const { data: rows, error } = await admin.from(t).select("*").limit(limit);
      if (error) { perTable.push({ table: t, rows: 0, error: error.message }); continue; }
      data[t] = rows || [];
      perTable.push({ table: t, rows: rows?.length || 0 });
    } catch (e: any) {
      perTable.push({ table: t, rows: 0, error: e?.message ?? String(e) });
    }
  }

  const t0 = Date.now();
  const res = await fetch(`${base}/backup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${vpsToken}` },
    body: JSON.stringify({ source: `lovable-cloud:${actor}`, data }),
  });
  const text = await res.text();
  let parsed: any; try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  return new Response(
    JSON.stringify({ ok: res.ok, status: res.status, duration_ms: Date.now() - t0, snapshot: perTable, vps: parsed }),
    { status: res.ok ? 200 : 502, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" } },
  );
}
