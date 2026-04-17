// Notify admins when a job becomes "dead" (exhausted retries).
// Uses configured api_integrations (whatsapp, email/resend, slack) when active.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { jobId, type, error } = await req.json();
    if (!jobId) return json({ error: "jobId required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const message = `☠️ Job ${jobId} (${type || "unknown"}) is DEAD after exhausting retries.\nError: ${error || "n/a"}`;

    // Always raise an in-app system alert (visible in System Monitoring)
    await supabase.from("system_alerts").insert({
      level: "error",
      source: "queue",
      message: `Dead job: ${type}`,
      details: { jobId, type, error },
    });

    // Look up active notification integrations
    const { data: integrations } = await supabase
      .from("api_integrations")
      .select("name, base_url, config, is_active")
      .in("name", ["whatsapp", "email", "resend", "slack"])
      .eq("is_active", true);

    const channels: string[] = [];
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    for (const integ of integrations || []) {
      try {
        // SLACK
        if (integ.name === "slack" && lovableKey) {
          const slackKey = Deno.env.get("SLACK_API_KEY");
          if (slackKey) {
            const channel = (integ.config as any)?.channel;
            if (channel) {
              await fetch("https://connector-gateway.lovable.dev/slack/api/chat.postMessage", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${lovableKey}`,
                  "X-Connection-Api-Key": slackKey,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ channel, text: message }),
              });
              channels.push("slack");
            }
          }
        }

        // RESEND / EMAIL
        if ((integ.name === "resend" || integ.name === "email") && lovableKey) {
          const resendKey = Deno.env.get("RESEND_API_KEY");
          const to = (integ.config as any)?.admin_email;
          const from = (integ.config as any)?.from || "alerts@resend.dev";
          if (resendKey && to) {
            await fetch("https://connector-gateway.lovable.dev/resend/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${lovableKey}`,
                "X-Connection-Api-Key": resendKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from,
                to: [to],
                subject: `[Queue] Dead job: ${type}`,
                html: `<p>${message.replace(/\n/g, "<br/>")}</p>`,
              }),
            });
            channels.push("email");
          }
        }

        // WHATSAPP — generic webhook style (config.webhook_url + config.admin_phone)
        if (integ.name === "whatsapp") {
          const webhook = (integ.config as any)?.webhook_url;
          const to = (integ.config as any)?.admin_phone;
          if (webhook && to) {
            await fetch(webhook, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ to, message }),
            });
            channels.push("whatsapp");
          }
        }
      } catch (e) {
        await supabase.from("integration_logs").insert({
          provider: integ.name,
          action: "notify_dead_job",
          success: false,
          message: (e as Error).message,
          metadata: { jobId, type },
        });
      }
    }

    return json({ ok: true, channels, alerted: true });
  } catch (err: any) {
    return json({ error: err?.message || "Internal error" }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
