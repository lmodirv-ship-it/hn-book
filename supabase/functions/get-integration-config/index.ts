// Secure backend lookup for an integration's config + resolved secret value.
// Admin-only. Never call from the browser without an authenticated admin session.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is an authenticated admin.
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { name } = await req.json().catch(() => ({}));
    if (!name || typeof name !== "string") {
      return new Response(JSON.stringify({ error: "name required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: integ, error } = await admin
      .from("api_integrations")
      .select("id, name, base_url, category, config, secret_ref, key_hint, is_active")
      .ilike("name", name)
      .maybeSingle();

    if (error || !integ) {
      return new Response(JSON.stringify({ error: "not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const secretValue = integ.secret_ref ? Deno.env.get(integ.secret_ref) ?? null : null;

    return new Response(
      JSON.stringify({
        integration: {
          id: integ.id,
          name: integ.name,
          base_url: integ.base_url,
          category: integ.category,
          config: integ.config,
          is_active: integ.is_active,
          key_hint: integ.key_hint,
          secret_ref: integ.secret_ref,
          secret_present: !!secretValue,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
