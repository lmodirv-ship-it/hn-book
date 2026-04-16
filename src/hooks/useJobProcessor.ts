import { useEffect, useRef, useState, useCallback } from "react";
import { db } from "@/api/client";
import { supabase } from "@/integrations/supabase/client";
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
  /** Poll interval in ms (default 2000) */
  pollInterval?: number;
  /** Auto-trigger backend worker when pending jobs exist (default true) */
  autoTrigger?: boolean;
  onBatchComplete?: (stats: { success: number; failed: number }) => void;
}

/**
 * Polls upload_jobs table for status changes and triggers
 * the backend worker to process pending jobs.
 * All heavy processing happens server-side.
 */
export function useJobProcessor(opts: UseJobProcessorOptions = {}) {
  const { pollInterval = 2000, autoTrigger = true, onBatchComplete } = opts;

  const [jobs, setJobs] = useState<DbJob[]>([]);
  const [workerActive, setWorkerActive] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const triggeringRef = useRef(false);

  // Fetch all recent jobs
  const refreshJobs = useCallback(async () => {
    const { data } = await db
      .from("upload_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setJobs(data as unknown as DbJob[]);
    return data as unknown as DbJob[] | null;
  }, []);

  // Trigger the backend worker edge function
  const triggerWorker = useCallback(async () => {
    if (triggeringRef.current) return;
    triggeringRef.current = true;
    setWorkerActive(true);

    try {
      const { data, error } = await supabase.functions.invoke("process-upload-jobs", {
        body: {},
      });

      if (error) {
        console.error("[JobProcessor] worker error:", error);
      } else if (data) {
        const result = data as { success?: number; failed?: number; processed?: number };
        if ((result.success ?? 0) > 0) {
          invalidateBookCache();
          onBatchComplete?.({
            success: result.success ?? 0,
            failed: result.failed ?? 0,
          });
        }
      }
    } catch (err) {
      console.error("[JobProcessor] trigger error:", err);
    } finally {
      setWorkerActive(false);
      triggeringRef.current = false;
      await refreshJobs();
    }
  }, [onBatchComplete, refreshJobs]);

  // Poll loop: refresh jobs + auto-trigger worker if pending exist
  useEffect(() => {
    refreshJobs();

    intervalRef.current = setInterval(async () => {
      const freshJobs = await refreshJobs();
      if (!freshJobs) return;

      const hasPending = freshJobs.some((j) => j.status === "pending");
      if (hasPending && autoTrigger && !triggeringRef.current) {
        triggerWorker();
      }
    }, pollInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pollInterval, autoTrigger, refreshJobs, triggerWorker]);

  const stats = {
    total: jobs.length,
    pending: jobs.filter((j) => j.status === "pending").length,
    processing: jobs.filter((j) => j.status === "processing").length,
    done: jobs.filter((j) => j.status === "done").length,
    errors: jobs.filter((j) => j.status === "error").length,
  };

  return { jobs, stats, workerActive, refreshJobs, triggerWorker };
}
