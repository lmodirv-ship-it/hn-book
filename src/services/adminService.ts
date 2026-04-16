/**
 * Admin Service — handles admin-specific data queries.
 */

import { db } from "@/api/client";

export interface SmartAlert {
  id: string;
  severity: "warning" | "critical";
  message: string;
  icon: string;
}

export const adminService = {
  async detectAlerts(): Promise<SmartAlert[]> {
    const detected: SmartAlert[] = [];

    const [jobsRes, noPdfRes, noCoverRes, zeroPriceRes] = await Promise.all([
      db.from("upload_jobs").select("id, status, updated_at"),
      db.from("products").select("id", { count: "exact", head: true }).or("pdf_url.is.null,pdf_url.eq."),
      db.from("products").select("id", { count: "exact", head: true }).or("image.is.null,image.eq.,image.eq./placeholder.svg"),
      db.from("products").select("id", { count: "exact", head: true }).eq("price", 0).not("page_count", "is", null).gt("page_count", 0),
    ]);

    const jobs = jobsRes.data || [];
    const failedCount = jobs.filter((j: any) => j.status === "error").length;
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const stuckCount = jobs.filter((j: any) => j.status === "processing" && j.updated_at < tenMinAgo).length;

    if (failedCount > 0) {
      detected.push({ id: "failed_jobs", severity: failedCount >= 5 ? "critical" : "warning", message: `${failedCount} مهمة رفع فاشلة`, icon: "❌" });
    }
    if (stuckCount > 0) {
      detected.push({ id: "stuck_jobs", severity: "warning", message: `${stuckCount} مهمة عالقة أكثر من 10 دقائق`, icon: "⏳" });
    }
    if ((noPdfRes.count || 0) > 0) {
      detected.push({ id: "no_pdf", severity: "critical", message: `${noPdfRes.count} كتاب بدون ملف PDF`, icon: "📄" });
    }
    if ((noCoverRes.count || 0) > 0) {
      detected.push({ id: "no_cover", severity: "warning", message: `${noCoverRes.count} كتاب بدون غلاف`, icon: "🖼️" });
    }
    if ((zeroPriceRes.count || 0) > 0) {
      detected.push({ id: "zero_price", severity: "warning", message: `${zeroPriceRes.count} كتاب بسعر 0`, icon: "💰" });
    }

    return detected;
  },
};
