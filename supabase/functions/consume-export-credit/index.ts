// Server-side validation for design exports.
// Verifies JWT, then atomically deducts credits (or allows unlimited Pro).
// Returns { allowed, reason, balance, cost, plan }.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "missing_auth" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify JWT using anon client
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return json({ error: "invalid_token" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const exportType = String(body.export_type || "").toLowerCase();
    const templateId = body.template_id ?? null;

    if (!["pdf", "png"].includes(exportType)) {
      return json({ error: "invalid_export_type" }, 400);
    }

    // Use service-role to call the SECURITY DEFINER function
    const admin = createClient(supabaseUrl, serviceKey);
    const { data, error } = await admin.rpc("consume_export_credit", {
      _user_id: user.id,
      _export_type: exportType,
      _template_id: templateId,
    });

    if (error) {
      console.error("[consume-export-credit] rpc error", error);
      return json({ error: error.message }, 500);
    }

    return json(data, 200);
  } catch (e) {
    console.error("[consume-export-credit]", e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
