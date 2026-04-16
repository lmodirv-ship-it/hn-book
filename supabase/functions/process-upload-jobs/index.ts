const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"

const BATCH_SIZE = 3;

// ── Smart pricing (inline for Deno) ──
function calculatePrice(pageCount: number | null, category: string): number {
  if (!pageCount || pageCount <= 0) return 0;
  const multipliers: Record<string, number> = {
    "الطب": 1.8, "العلوم": 1.5, "الدين الإسلامي": 1.0,
    "التاريخ": 1.2, "الأدب العربي": 1.1, "تطوير الذات": 1.3,
    "كتب": 1.0, "أخرى": 1.0, "Literature": 1.2,
    "Philosophy": 1.3, "Biography & Autobiography": 1.2, "Arabic literature": 1.1,
  };
  const m = multipliers[category] ?? 1.0;
  const raw = pageCount * 0.15 * m;
  return Math.min(500, Math.max(0, Math.round(raw / 5) * 5));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return jsonResponse({ error: "Admin access required" }, 403);
    }

    // Use service role for DB operations
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch pending jobs (oldest first, limit BATCH_SIZE)
    const { data: pendingJobs, error: fetchError } = await serviceClient
      .from("upload_jobs")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      return jsonResponse({ error: fetchError.message }, 500);
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      return jsonResponse({ processed: 0, message: "No pending jobs" });
    }

    // 2. Mark jobs as "processing"
    const jobIds = pendingJobs.map((j: any) => j.id);
    await serviceClient
      .from("upload_jobs")
      .update({ status: "processing" })
      .in("id", jobIds);

    // 3. Process each job
    const results: Array<{ id: string; file_name: string; success: boolean; error?: string }> = [];

    for (const job of pendingJobs) {
      const jobData = job.result || {};
      const { title, category, pdfUrl, image, referenceCode, pageCount } = jobData as any;

      // Validate required fields
      if (!pdfUrl || !image) {
        await serviceClient
          .from("upload_jobs")
          .update({
            status: "error",
            result: { ...jobData, error: "بيانات غير مكتملة — يحتاج pdfUrl و image" },
          })
          .eq("id", job.id);

        results.push({ id: job.id, file_name: job.file_name, success: false, error: "Missing pdfUrl or image" });
        continue;
      }

      try {
        // Create book in products table
        const { data: book, error: insertError } = await serviceClient
          .from("products")
          .insert({
            name: title || job.file_name,
            category: category || "كتب",
            price: calculatePrice(pageCount, category || "كتب"),
            pdf_url: pdfUrl,
            image: image,
            reference_code: referenceCode || null,
            page_count: pageCount || null,
          })
          .select("id, name, reference_code")
          .single();

        if (insertError) throw new Error(insertError.message);

        // Mark job as done
        await serviceClient
          .from("upload_jobs")
          .update({
            status: "done",
            result: {
              ...jobData,
              bookId: book.id,
              bookCreated: true,
            },
          })
          .eq("id", job.id);

        results.push({ id: job.id, file_name: job.file_name, success: true });
      } catch (err: any) {
        // Mark job as error
        await serviceClient
          .from("upload_jobs")
          .update({
            status: "error",
            result: { ...jobData, error: err?.message || "Unknown error" },
          })
          .eq("id", job.id);

        results.push({ id: job.id, file_name: job.file_name, success: false, error: err?.message });
      }
    }

    const success = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return jsonResponse({ processed: results.length, success, failed, results });
  } catch (err: any) {
    return jsonResponse({ error: err?.message || "Internal error" }, 500);
  }
});

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
