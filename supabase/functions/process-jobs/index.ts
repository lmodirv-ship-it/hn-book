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

    // Load per-type retry policies once
    const { data: policies } = await supabase
      .from("job_retry_policies")
      .select("job_type,max_attempts,backoff_seconds,enabled");
    const policyByType: Record<string, { max_attempts: number; backoff_seconds: number; enabled: boolean }> = {};
    for (const p of policies || []) policyByType[p.job_type] = p;

    async function recordAttempt(jobId: string, attempt: number, status: string, error: string | null, durationMs: number | null) {
      try {
        await supabase.from("job_attempts").insert({ job_id: jobId, attempt, status, error, duration_ms: durationMs });
      } catch (_) { /* swallow */ }
    }

    async function notifyDead(job: any, error: string) {
      try {
        await supabase.functions.invoke("notify-dead-job", { body: { jobId: job.id, type: job.type, error } });
        await supabase.from("jobs").update({ last_notified_at: new Date().toISOString() }).eq("id", job.id);
      } catch (_) { /* swallow */ }
    }

    const results: any[] = [];

    for (const job of jobs) {
      const handler = handlers[job.type];
      const attempt = (job.attempts ?? 0) + 1;
      const policy = policyByType[job.type];
      const effectiveMax = policy?.enabled === false
        ? 1
        : (policy?.max_attempts ?? job.max_attempts ?? 3);
      const backoffBase = (policy?.backoff_seconds ?? 30) * 1000;
      const startedAt = Date.now();
      await recordAttempt(job.id, attempt, "started", null, null);

      if (!handler) {
        const msg = `No handler for type: ${job.type}`;
        await supabase.from("jobs").update({
          status: "dead",
          error: msg,
          attempts: attempt,
          completed_at: new Date().toISOString(),
        }).eq("id", job.id);
        await recordAttempt(job.id, attempt, "dead", msg, Date.now() - startedAt);
        await notifyDead(job, msg);
        results.push({ id: job.id, success: false, error: "no handler", dead: true });
        continue;
      }

      try {
        const result = await handler(job.data, { supabase, jobId: job.id });
        const durationMs = Date.now() - startedAt;
        await supabase.from("jobs").update({
          status: "completed",
          result,
          attempts: attempt,
          completed_at: new Date().toISOString(),
          error: null,
        }).eq("id", job.id);
        await recordAttempt(job.id, attempt, "succeeded", null, durationMs);
        results.push({ id: job.id, success: true });
      } catch (err: any) {
        const msg = err?.message || "Unknown error";
        const durationMs = Date.now() - startedAt;
        const shouldRetry = attempt < effectiveMax;
        const isDead = !shouldRetry;
        await supabase.from("jobs").update({
          status: shouldRetry ? "pending" : "dead",
          error: msg,
          attempts: attempt,
          completed_at: shouldRetry ? null : new Date().toISOString(),
          scheduled_at: shouldRetry
            ? new Date(Date.now() + backoffBase * attempt).toISOString() // linear backoff per policy
            : job.scheduled_at,
        }).eq("id", job.id);
        await recordAttempt(job.id, attempt, isDead ? "dead" : "failed", msg, durationMs);
        if (isDead) await notifyDead(job, msg);
        results.push({ id: job.id, success: false, error: msg, retrying: shouldRetry, dead: isDead });
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
