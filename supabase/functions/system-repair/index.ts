const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface FixAction {
  type: string;
  bookId?: string;
  bookName?: string;
  action: string;
  result: "fixed" | "failed" | "skipped";
  detail: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check — admin only
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonRes({ error: "Missing authorization" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return jsonRes({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) return jsonRes({ error: "Admin access required" }, 403);

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const mode = body.mode || "scan"; // "scan" or "fix"

    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const actions: FixAction[] = [];
    const issues: { type: string; count: number; description: string }[] = [];

    // ── 1. Books without PDF ──
    const { data: noPdf } = await svc
      .from("products")
      .select("id, name, is_active")
      .or("pdf_url.is.null,pdf_url.eq.")
      .limit(200);

    if (noPdf && noPdf.length > 0) {
      issues.push({ type: "no_pdf", count: noPdf.length, description: "كتب بدون ملف PDF" });
      if (mode === "fix") {
        for (const book of noPdf) {
          // Disable books without PDF — they can't be read
          if (book.is_active !== false) {
            const { error } = await svc.from("products").update({ is_active: false }).eq("id", book.id);
            actions.push({
              type: "no_pdf", bookId: book.id, bookName: book.name,
              action: "تعطيل الكتاب (بدون PDF)",
              result: error ? "failed" : "fixed",
              detail: error?.message || "تم تعطيله — يحتاج رفع PDF يدوياً",
            });
          } else {
            actions.push({
              type: "no_pdf", bookId: book.id, bookName: book.name,
              action: "كتاب معطل مسبقاً", result: "skipped", detail: "معطل مسبقاً",
            });
          }
        }
      }
    }

    // ── 2. Books without cover image ──
    const { data: noCover } = await svc
      .from("products")
      .select("id, name, image")
      .or("image.is.null,image.eq.,image.eq./placeholder.svg")
      .limit(200);

    if (noCover && noCover.length > 0) {
      issues.push({ type: "no_cover", count: noCover.length, description: "كتب بدون صورة غلاف" });
      if (mode === "fix") {
        for (const book of noCover) {
          // Set a placeholder — cover generation requires client-side canvas
          const { error } = await svc.from("products")
            .update({ image: "/placeholder.svg" })
            .eq("id", book.id);
          actions.push({
            type: "no_cover", bookId: book.id, bookName: book.name,
            action: "تعيين غلاف مؤقت",
            result: error ? "failed" : "fixed",
            detail: error?.message || "تم تعيين placeholder — يحتاج غلاف حقيقي",
          });
        }
      }
    }

    // ── 3. Failed upload jobs ──
    const { data: failedJobs } = await svc
      .from("upload_jobs")
      .select("id, file_name, result")
      .eq("status", "error")
      .limit(50);

    if (failedJobs && failedJobs.length > 0) {
      issues.push({ type: "failed_jobs", count: failedJobs.length, description: "مهام رفع فاشلة" });
      if (mode === "fix") {
        // Reset failed jobs to pending for re-processing
        const ids = failedJobs.map(j => j.id);
        const { error } = await svc
          .from("upload_jobs")
          .update({ status: "pending" })
          .in("id", ids);
        actions.push({
          type: "failed_jobs",
          action: `إعادة ${ids.length} مهمة فاشلة إلى الانتظار`,
          result: error ? "failed" : "fixed",
          detail: error?.message || `تمت إعادة ${ids.length} مهمة`,
        });
      }
    }

    // ── 4. Books with empty/missing category ──
    const { data: noCategory } = await svc
      .from("products")
      .select("id, name, category")
      .or("category.is.null,category.eq.")
      .limit(200);

    if (noCategory && noCategory.length > 0) {
      issues.push({ type: "no_category", count: noCategory.length, description: "كتب بدون تصنيف" });
      if (mode === "fix") {
        for (const book of noCategory) {
          const { error } = await svc.from("products")
            .update({ category: "كتب" })
            .eq("id", book.id);
          actions.push({
            type: "no_category", bookId: book.id, bookName: book.name,
            action: "تعيين تصنيف افتراضي (كتب)",
            result: error ? "failed" : "fixed",
            detail: error?.message || "تم التعيين",
          });
        }
      }
    }

    // ── 5. Books with price = 0 but have page_count ──
    const { data: zeroPriceBooks } = await svc
      .from("products")
      .select("id, name, page_count, category")
      .eq("price", 0)
      .not("page_count", "is", null)
      .gt("page_count", 0)
      .limit(200);

    if (zeroPriceBooks && zeroPriceBooks.length > 0) {
      issues.push({ type: "zero_price", count: zeroPriceBooks.length, description: "كتب بسعر 0 مع وجود عدد صفحات" });
      if (mode === "fix") {
        // Fetch pricing rules
        const { data: rules } = await svc.from("pricing_rules")
          .select("min_pages,max_pages,price_per_page,priority,country,paper_type")
          .eq("is_active", true);
        const { data: baseSetting } = await svc.from("pricing_settings")
          .select("value").eq("key", "base_price_per_page").single();
        const basePrice = (baseSetting?.value as any)?.value ?? 1;

        for (const book of zeroPriceBooks) {
          const pc = book.page_count as number;
          const matching = (rules || [])
            .filter((r: any) => pc >= r.min_pages && pc <= r.max_pages)
            .sort((a: any, b: any) => b.priority - a.priority);
          const ppp = matching.length > 0 ? (matching[0] as any).price_per_page : basePrice;
          const price = Math.max(0, Math.round((pc * ppp) / 5) * 5);

          const { error } = await svc.from("products").update({ price }).eq("id", book.id);
          actions.push({
            type: "zero_price", bookId: book.id, bookName: book.name,
            action: `تسعير تلقائي: ${price} د.م (${pc} صفحة × ${ppp})`,
            result: error ? "failed" : "fixed",
            detail: error?.message || `${price} د.م`,
          });
        }
      }
    }

    // ── 6. Stuck "processing" jobs (older than 10 min) ──
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: stuckJobs } = await svc
      .from("upload_jobs")
      .select("id, file_name")
      .eq("status", "processing")
      .lt("updated_at", tenMinAgo)
      .limit(50);

    if (stuckJobs && stuckJobs.length > 0) {
      issues.push({ type: "stuck_jobs", count: stuckJobs.length, description: "مهام عالقة (أكثر من 10 دقائق)" });
      if (mode === "fix") {
        const ids = stuckJobs.map(j => j.id);
        const { error } = await svc.from("upload_jobs")
          .update({ status: "pending" })
          .in("id", ids);
        actions.push({
          type: "stuck_jobs",
          action: `إعادة ${ids.length} مهمة عالقة`,
          result: error ? "failed" : "fixed",
          detail: error?.message || `تمت إعادة ${ids.length} مهمة`,
        });
      }
    }

    // ── 7. Duplicate reference codes ──
    const { data: dupes } = await svc.rpc("has_role", { _user_id: user.id, _role: "admin" })
      // We can't do GROUP BY via PostgREST easily, so just note it
      ? { data: null } : { data: null };
    // Skip duplicate check for now — complex query

    // ── Summary ──
    const fixed = actions.filter(a => a.result === "fixed").length;
    const failed = actions.filter(a => a.result === "failed").length;
    const skipped = actions.filter(a => a.result === "skipped").length;

    return jsonRes({
      mode,
      issues,
      totalIssues: issues.reduce((sum, i) => sum + i.count, 0),
      actions: mode === "fix" ? actions : [],
      summary: mode === "fix" ? { fixed, failed, skipped, total: actions.length } : null,
    });
  } catch (err: any) {
    return jsonRes({ error: err?.message || "Internal error" }, 500);
  }
});

function jsonRes(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
