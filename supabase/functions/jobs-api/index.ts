// Jobs API — create, retry, status (admin or job owner)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || (await safeJson(req))?.action;
    const body = await safeJson(req) || {};

    switch (action) {
      case "create": {
        const { type, data, priority = 0, max_attempts = 3, scheduled_at } = body;
        if (!type) return json({ error: "type required" }, 400);
        const { data: job, error } = await service.from("jobs").insert({
          type,
          data: data || {},
          priority,
          max_attempts,
          scheduled_at: scheduled_at || new Date().toISOString(),
          created_by: user.id,
        }).select().single();
        if (error) return json({ error: error.message }, 500);
        // Auto-trigger worker (fire and forget)
        triggerWorker().catch(() => {});
        return json({ job });
      }

      case "retry": {
        const { jobId } = body;
        if (!jobId) return json({ error: "jobId required" }, 400);
        // Owner or admin
        const { data: existing } = await service.from("jobs").select("created_by").eq("id", jobId).single();
        if (!existing) return json({ error: "Not found" }, 404);
        if (!isAdmin && existing.created_by !== user.id) return json({ error: "Forbidden" }, 403);
        const { error } = await service.from("jobs").update({
          status: "pending",
          error: null,
          attempts: 0,
          scheduled_at: new Date().toISOString(),
          started_at: null,
          completed_at: null,
        }).eq("id", jobId);
        if (error) return json({ error: error.message }, 500);
        triggerWorker().catch(() => {});
        return json({ ok: true });
      }

      case "retry_all_failed": {
        if (!isAdmin) return json({ error: "Admin required" }, 403);
        const { error, count } = await service.from("jobs").update({
          status: "pending",
          error: null,
          attempts: 0,
          scheduled_at: new Date().toISOString(),
          started_at: null,
          completed_at: null,
        }, { count: "exact" }).eq("status", "failed");
        if (error) return json({ error: error.message }, 500);
        triggerWorker().catch(() => {});
        return json({ ok: true, retried: count });
      }

      case "status": {
        const jobId = body.jobId || url.searchParams.get("jobId");
        if (!jobId) return json({ error: "jobId required" }, 400);
        const { data, error } = await service.from("jobs").select("*").eq("id", jobId).single();
        if (error) return json({ error: error.message }, 404);
        if (!isAdmin && data.created_by !== user.id) return json({ error: "Forbidden" }, 403);
        return json({ job: data });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (err: any) {
    return json({ error: err?.message || "Internal error" }, 500);
  }
});

async function safeJson(req: Request) {
  try { return await req.clone().json(); } catch { return null; }
}

async function triggerWorker() {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-jobs`;
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: "{}",
  });
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
