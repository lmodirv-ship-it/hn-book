// Generic background worker — processes jobs by type
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 5;

type Handler = (data: any, ctx: { supabase: any; jobId: string }) => Promise<any>;

// ── Job type handlers ─────────────────────────────────────────
const handlers: Record<string, Handler> = {
  // PDF generation (delegate to existing flow / placeholder)
  pdf_generation: async (data) => {
    // Expected data: { productId, pdfUrl, options }
    if (!data?.productId) throw new Error("productId required");
    // Placeholder: real PDF gen would happen here or call print-pdf flow
    return { generated: true, productId: data.productId, at: new Date().toISOString() };
  },

  // EPS → SVG conversion (placeholder — real impl would shell out to ghostscript/inkscape)
  eps_to_svg: async (data) => {
    if (!data?.sourceUrl) throw new Error("sourceUrl required");
    // Placeholder: in production, fetch EPS, convert, upload SVG
    return { converted: true, sourceUrl: data.sourceUrl, svgUrl: data.sourceUrl.replace(/\.eps$/i, ".svg") };
  },

  // Generic import (book catalog row, etc.)
  import: async (data, { supabase }) => {
    const { table, payload } = data || {};
    if (!table || !payload) throw new Error("table and payload required");
    const { data: inserted, error } = await supabase.from(table).insert(payload).select().single();
    if (error) throw new Error(error.message);
    return { imported: true, id: inserted?.id };
  },

  // WhatsApp send (placeholder — would call WhatsApp Business API integration)
  whatsapp_send: async (data, { supabase }) => {
    const { to, message } = data || {};
    if (!to || !message) throw new Error("to and message required");
    // Look up WhatsApp integration config
    const { data: integration } = await supabase
      .from("api_integrations")
      .select("base_url,is_active,status")
      .eq("name", "whatsapp")
      .maybeSingle();
    if (!integration?.is_active) throw new Error("WhatsApp integration not active");
    // Real send would happen here using integration credentials
    return { sent: true, to, length: message.length };
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Pick up pending jobs (oldest scheduled first, highest priority first)
    const { data: jobs, error: pickError } = await supabase
      .from("jobs")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .order("priority", { ascending: false })
      .order("scheduled_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (pickError) throw new Error(pickError.message);
    if (!jobs || jobs.length === 0) {
      return json({ processed: 0, message: "No pending jobs" });
    }

    const ids = jobs.map((j: any) => j.id);
    await supabase
      .from("jobs")
      .update({ status: "processing", started_at: new Date().toISOString(), attempts: 0 })
      .in("id", ids);

    const results: any[] = [];

    for (const job of jobs) {
      const handler = handlers[job.type];
      const attempt = (job.attempts ?? 0) + 1;

      if (!handler) {
        await supabase.from("jobs").update({
          status: "failed",
          error: `No handler for type: ${job.type}`,
          attempts: attempt,
          completed_at: new Date().toISOString(),
        }).eq("id", job.id);
        results.push({ id: job.id, success: false, error: "no handler" });
        continue;
      }

      try {
        const result = await handler(job.data, { supabase, jobId: job.id });
        await supabase.from("jobs").update({
          status: "completed",
          result,
          attempts: attempt,
          completed_at: new Date().toISOString(),
          error: null,
        }).eq("id", job.id);
        results.push({ id: job.id, success: true });
      } catch (err: any) {
        const msg = err?.message || "Unknown error";
        const shouldRetry = attempt < (job.max_attempts ?? 3);
        await supabase.from("jobs").update({
          status: shouldRetry ? "pending" : "failed",
          error: msg,
          attempts: attempt,
          completed_at: shouldRetry ? null : new Date().toISOString(),
          scheduled_at: shouldRetry
            ? new Date(Date.now() + 30_000 * attempt).toISOString() // backoff
            : job.scheduled_at,
        }).eq("id", job.id);
        results.push({ id: job.id, success: false, error: msg, retrying: shouldRetry });
      }
    }

    const success = results.filter((r) => r.success).length;
    const failed = results.length - success;
    return json({ processed: results.length, success, failed, results });
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
