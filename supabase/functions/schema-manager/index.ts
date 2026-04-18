// Edge function: schema-manager
// Admin-only proxy to the VPS mirror for schema/migration operations.
// Actions: "schema" | "migrate" | "sync-log" | "schema-events" | "health"
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

  const map: Record<string, { path: string; method: string }> = {
    "schema":        { path: "/schema",        method: "GET"  },
    "sync-log":      { path: "/sync-log",      method: "GET"  },
    "schema-events": { path: "/schema-events", method: "GET"  },
    "migrate":       { path: "/migrate",       method: "POST" },
    "health":        { path: "/health",        method: "GET"  },
  };
  const op = map[action];
  if (!op) return j({ error: "unknown_action" }, 400);

  try {
    const t0 = Date.now();
    const res = await fetch(`${base}${op.path}`, {
      method: op.method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VPS_TOKEN}`,
      },
      body: op.method === "POST" ? JSON.stringify({}) : undefined,
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
