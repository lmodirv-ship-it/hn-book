// Admin-only: provider-specific integration tests for Stripe, WhatsApp, Analytics.
// Updates api_integrations.status + last_tested_at + last_test_message.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Provider = "stripe" | "whatsapp" | "analytics";

type Payload = {
  provider: Provider;
  integration_id?: string;
  // For ad-hoc tests before saving:
  secret_ref?: string;          // e.g. STRIPE_SECRET_KEY, WHATSAPP_ACCESS_TOKEN
  config?: Record<string, unknown>;
  test_to?: string;             // For WhatsApp test message
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function testStripe(secret: string) {
  const res = await fetch("https://api.stripe.com/v1/balance", {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, snippet: text.slice(0, 250) };
}

async function testWhatsapp(secret: string, phoneId: string, to?: string) {
  if (!phoneId) {
    return { ok: false, status: 0, snippet: "phone_number_id missing in config" };
  }
  // Without a "to" we just verify the phone-number resource is reachable.
  if (!to) {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, snippet: text.slice(0, 250) };
  }
  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: "✅ Test message from your admin dashboard." },
    }),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, snippet: text.slice(0, 250) };
}

function validateAnalytics(trackingId: string) {
  // GA4: G-XXXXXXX, UA: UA-XXXXXX-Y, GTM: GTM-XXXXXX
  const ok = /^(G-[A-Z0-9]{6,}|UA-\d{4,}-\d+|GTM-[A-Z0-9]{5,})$/i.test(trackingId.trim());
  return {
    ok,
    status: ok ? 200 : 400,
    snippet: ok ? `Valid tracking ID format: ${trackingId}` : `Invalid format: ${trackingId}`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json(401, { ok: false, error: "unauthorized" });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json(403, { ok: false, error: "forbidden" });

    const payload = (await req.json().catch(() => ({}))) as Payload;
    if (!payload?.provider) return json(400, { ok: false, error: "provider is required" });

    // Resolve config + secret ref from DB if integration_id provided
    let secret_ref = payload.secret_ref ?? "";
    let config: Record<string, unknown> = payload.config ?? {};
    if (payload.integration_id) {
      const { data: integ } = await admin
        .from("api_integrations")
        .select("secret_ref, config")
        .eq("id", payload.integration_id)
        .maybeSingle();
      if (integ) {
        secret_ref = (integ.secret_ref as string | null) ?? secret_ref;
        config = (integ.config as Record<string, unknown>) ?? config;
      }
    }

    const startedAt = Date.now();
    let result: { ok: boolean; status: number; snippet: string };

    if (payload.provider === "analytics") {
      const id = String(config?.tracking_id ?? "");
      result = validateAnalytics(id);
    } else {
      if (!secret_ref) {
        result = { ok: false, status: 0, snippet: "secret_ref is missing" };
      } else {
        const secret = Deno.env.get(secret_ref);
        if (!secret) {
          result = { ok: false, status: 0, snippet: `Secret '${secret_ref}' not configured in Lovable Cloud` };
        } else if (payload.provider === "stripe") {
          result = await testStripe(secret);
        } else {
          const phoneId = String(config?.phone_number_id ?? "");
          result = await testWhatsapp(secret, phoneId, payload.test_to);
        }
      }
    }

    const durationMs = Date.now() - startedAt;

    // Persist status if integration_id given
    if (payload.integration_id) {
      await admin
        .from("api_integrations")
        .update({
          status: result.ok ? "connected" : "error",
          last_tested_at: new Date().toISOString(),
          last_test_message: result.snippet?.slice(0, 500) ?? null,
        })
        .eq("id", payload.integration_id);
    }

    // Log every call
    await admin.from("integration_logs").insert({
      integration_id: payload.integration_id ?? null,
      provider: payload.provider,
      action: payload.provider === "whatsapp" && payload.test_to ? "send_test_message" : "test_connection",
      success: result.ok,
      status_code: result.status || null,
      duration_ms: durationMs,
      message: result.snippet?.slice(0, 1000) ?? null,
      metadata: { config_keys: Object.keys(config), secret_ref: secret_ref || null },
      triggered_by: userData.user.id,
    });

    return json(200, {
      ok: result.ok,
      provider: payload.provider,
      status: result.status,
      snippet: result.snippet,
    });
  } catch (err) {
    return json(500, { ok: false, error: String(err) });
  }
});

