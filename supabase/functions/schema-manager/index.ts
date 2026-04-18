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
    return j({ error: "VPS غير مهيأ — أضف VPS_BACKUP_URL و VPS_BACKUP_TOKEN" }, 400);
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action ?? "schema";
  const base = VPS_URL.replace(/\/backup\/?$/, "").replace(/\/$/, "");

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
