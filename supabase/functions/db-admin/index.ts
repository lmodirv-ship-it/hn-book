// Edge function: db-admin
// Provides admin-only database overview, JSON export, and optional VPS push.
// Actions: "overview" | "export" | "push-vps"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Whitelist of public tables we allow exporting (safety guard).
const TABLES = [
  "products", "categories", "orders", "order_items", "customers",
  "cart_items", "purchases", "profiles", "coupons", "card_templates",
  "svg_templates", "logos", "assets", "asset_files", "digital_assets",
  "manual_recommendations", "print_orders", "pricing_rules",
  "pricing_settings", "print_pricing_rules", "feature_flags",
  "page_customizations", "cms_content", "permissions", "role_permissions",
  "subscription_plans", "subscriptions", "credit_transactions",
  "api_integrations", "auto_heal_rules", "job_retry_policies",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  // --- Verify the caller is an admin ---
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes } = await userClient.auth.getUser();
  if (!userRes?.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: roles } = await admin
    .from("user_roles").select("role").eq("user_id", userRes.user.id);
  const isAdmin = roles?.some((r: any) => r.role === "admin");
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action ?? "overview";

  try {
    if (action === "overview") {
      const stats = await Promise.all(TABLES.map(async (t) => {
        const { count, error } = await admin
          .from(t).select("*", { count: "exact", head: true });
        return { table: t, rows: error ? null : count ?? 0, error: error?.message ?? null };
      }));
      return json({ tables: stats });
    }

    if (action === "export") {
      const dump: Record<string, unknown[]> = {};
      for (const t of TABLES) {
        const { data, error } = await admin.from(t).select("*").limit(10000);
        if (!error) dump[t] = data ?? [];
      }
      return json({
        exported_at: new Date().toISOString(),
        table_count: Object.keys(dump).length,
        data: dump,
      });
    }

    if (action === "push-vps") {
      const VPS_URL = Deno.env.get("VPS_BACKUP_URL");
      const VPS_TOKEN = Deno.env.get("VPS_BACKUP_TOKEN");
      if (!VPS_URL || !VPS_TOKEN) {
        return json({
          ok: false,
          error: "VPS غير مهيأ — أضف VPS_BACKUP_URL و VPS_BACKUP_TOKEN في الأسرار",
        }, 400);
      }
      const dump: Record<string, unknown[]> = {};
      for (const t of TABLES) {
        const { data, error } = await admin.from(t).select("*").limit(10000);
        if (!error) dump[t] = data ?? [];
      }
      const payload = {
        source: "lovable-cloud",
        exported_at: new Date().toISOString(),
        data: dump,
      };
      const started = Date.now();
      const res = await fetch(VPS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${VPS_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      return json({
        ok: res.ok,
        status: res.status,
        duration_ms: Date.now() - started,
        response: text.slice(0, 500),
      });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }

  function json(obj: unknown, status = 200) {
    return new Response(JSON.stringify(obj), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
