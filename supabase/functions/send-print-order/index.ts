// Sends a print order email with the PDF link to the configured shop email.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  to: string;
  subject: string;
  body: string;
  pdfUrl: string;
  fileName: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { to, subject, body, pdfUrl, fileName } = (await req.json()) as Payload;
    if (!to || !pdfUrl) {
      return new Response(JSON.stringify({ error: "missing to/pdfUrl" }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    // Try Lovable AI gateway email-style send via fetch to a generic SMTP relay if available.
    // Fallback: log to integration_logs and return success so the WhatsApp flow still works.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Use Resend if configured, otherwise just log (no hard failure).
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    let sent = false;
    let providerMessage = "no-email-provider-configured";

    if (RESEND_API_KEY) {
      const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
          <h2>🖨️ ${subject}</h2>
          <pre style="white-space:pre-wrap;font-family:inherit;background:#f6f7f9;padding:12px;border-radius:8px">${body}</pre>
          <p><a href="${pdfUrl}" style="background:#16a34a;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">📥 تحميل ملف PDF (${fileName})</a></p>
          <p style="color:#666;font-size:12px">${pdfUrl}</p>
        </div>`;
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: "Print Orders <onboarding@resend.dev>",
          to: [to],
          subject,
          html,
        }),
      });
      sent = r.ok;
      providerMessage = await r.text();
    }

    await supabase.from("integration_logs").insert({
      provider: "email",
      action: "send_print_order",
      success: sent,
      message: providerMessage.slice(0, 500),
      metadata: { to, fileName, pdfUrl },
    });

    return new Response(JSON.stringify({ ok: true, sent, providerMessage }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
