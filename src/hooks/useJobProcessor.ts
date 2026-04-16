import { useEffect, useRef, useState, useCallback } from "react";
import { db } from "@/api/client";
import { supabase } from "@/integrations/supabase/client";
import { storageService } from "@/services/storageService";
import { generateCoverAsync } from "@/lib/cover-worker-client";
import { invalidateBookCache } from "@/services/bookService";

export type DbJobStatus = "pending" | "processing" | "done" | "error";

export interface DbJob {
  id: string;
  file_name: string;
  status: DbJobStatus;
  created_at: string;
  result: Record<string, any> | null;
}

interface UseJobProcessorOptions {
  enabled?: boolean;
  pollInterval?: number;   // ms, default 2000
  batchSize?: number;      // default 3
  onBatchComplete?: (stats: { success: number; failed: number }) => void;
}

/**
 * Background job processor that polls upload_jobs table
 * and processes pending jobs (cover gen → cover upload → book creation).
 */
export function useJobProcessor(opts: UseJobProcessorOptions = {}) {
  const {
    enabled = true,
    pollInterval = 2000,
    batchSize = 3,
    onBatchComplete,
  } = opts;

  const [jobs, setJobs] = useState<DbJob[]>([]);
  const [processing, setProcessing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processingRef = useRef(false);

  // Fetch all recent jobs for display
  const refreshJobs = useCallback(async () => {
    const { data } = await db
      .from("upload_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setJobs(data as unknown as DbJob[]);
  }, []);

  // Process a single job
  const processJob = async (job: DbJob): Promise<boolean> => {
    const jobData = job.result || {};
    const { title, category, pdfUrl, referenceCode, storagePath } = jobData as any;

    if (!pdfUrl || !referenceCode) {
      await db
        .from("upload_jobs")
        .update({ status: "error", result: { ...jobData, error: "بيانات غير مكتملة" } } as any)
        .eq("id", job.id);
      return false;
    }

    try {
      // Mark as processing
      await db
        .from("upload_jobs")
        .update({ status: "processing" } as any)
        .eq("id", job.id);

      // 1. Generate cover via Web Worker
      const coverBlob = await generateCoverAsync(title || job.file_name, referenceCode);
      const coverFile = new File([coverBlob], `${referenceCode}.jpg`, { type: "image/jpeg" });

      // 2. Upload cover
      const coverResult = await storageService.uploadBookImage(coverFile, referenceCode);
      const image = coverResult.data?.publicUrl || pdfUrl;

      // 3. Create book via batch edge function
      const { data, error } = await supabase.functions.invoke("batch-create-books", {
        body: {
          books: [{
            name: title || job.file_name,
            category: category || "كتب",
            price: 0,
            pdf_url: pdfUrl,
            image,
            reference_code: referenceCode,
          }],
        },
      });

      if (error) throw new Error(error.message || "فشل إنشاء الكتاب");

      const result = data as { success: number; failed: number; results: any[] };
      if (result.failed > 0) {
        throw new Error(result.results?.[0]?.error || "فشل إنشاء الكتاب");
      }

      // Mark done
      await db
        .from("upload_jobs")
        .update({
          status: "done",
          result: { ...jobData, image, bookCreated: true },
        } as any)
        .eq("id", job.id);

      return true;
    } catch (err: any) {
      await db
        .from("upload_jobs")
        .update({
          status: "error",
          result: { ...jobData, error: err?.message || "خطأ غير متوقع" },
        } as any)
        .eq("id", job.id);
      return false;
    }
  };

  // Poll and process pending jobs
  const pollAndProcess = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);

    try {
      const { data: pendingJobs } = await db
        .from("upload_jobs")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(batchSize);

      if (!pendingJobs || pendingJobs.length === 0) {
        setProcessing(false);
        processingRef.current = false;
        return;
      }

      let success = 0;
      let failed = 0;

      // Process batch in parallel
      const results = await Promise.all(
        (pendingJobs as unknown as DbJob[]).map((job) => processJob(job))
      );

      results.forEach((ok) => (ok ? success++ : failed++));

      if (success > 0) invalidateBookCache();
      onBatchComplete?.({ success, failed });

      await refreshJobs();
    } finally {
      setProcessing(false);
      processingRef.current = false;
    }
  }, [batchSize, onBatchComplete, refreshJobs]);

  // Start/stop polling
  useEffect(() => {
    if (!enabled) return;

    refreshJobs(); // Initial load
    intervalRef.current = setInterval(pollAndProcess, pollInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, pollInterval, pollAndProcess, refreshJobs]);

  const stats = {
    total: jobs.length,
    pending: jobs.filter((j) => j.status === "pending").length,
    processing: jobs.filter((j) => j.status === "processing").length,
    done: jobs.filter((j) => j.status === "done").length,
    errors: jobs.filter((j) => j.status === "error").length,
  };

  return { jobs, stats, processing, refreshJobs };
}
