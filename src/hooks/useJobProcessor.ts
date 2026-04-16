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
  updated_at: string;
  result: Record<string, any> | null;
}

interface UseJobProcessorOptions {
  /** Auto-trigger backend worker when pending jobs exist */
  autoTrigger?: boolean;
  onJobDone?: (job: DbJob) => void;
  onBatchComplete?: (stats: { success: number; failed: number }) => void;
}

/**
 * Realtime-powered job tracker.
 * Subscribes to upload_jobs changes and auto-triggers
 * the backend worker when pending jobs exist.
 */
export function useJobProcessor(opts: UseJobProcessorOptions = {}) {
  const { autoTrigger = true, onJobDone, onBatchComplete } = opts;

  const [jobs, setJobs] = useState<DbJob[]>([]);
  const [workerActive, setWorkerActive] = useState(false);
  const triggeringRef = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Fetch all jobs ──
  const refreshJobs = useCallback(async () => {
    const { data } = await db
      .from("upload_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setJobs(data as unknown as DbJob[]);
    return data as unknown as DbJob[] | null;
  }, []);

  // ── Trigger backend worker ──
  const triggerWorker = useCallback(async () => {
    if (triggeringRef.current) return;
    triggeringRef.current = true;
    setWorkerActive(true);

    try {
      const { data, error } = await supabase.functions.invoke("process-upload-jobs", {
        body: {},
      });

      if (!error && data) {
        const result = data as { success?: number; failed?: number };
        if ((result.success ?? 0) > 0) invalidateBookCache();
        onBatchComplete?.({
          success: result.success ?? 0,
          failed: result.failed ?? 0,
        });
      }
    } catch (err) {
      console.error("[JobProcessor] trigger error:", err);
    } finally {
      setWorkerActive(false);
      triggeringRef.current = false;
    }
  }, [onBatchComplete]);

  // ── Retry failed jobs ──
  const retryFailed = useCallback(async () => {
    const failedIds = jobs.filter((j) => j.status === "error").map((j) => j.id);
    if (!failedIds.length) return;

    await db
      .from("upload_jobs")
      .update({ status: "pending" } as any)
      .in("id", failedIds);

    // Realtime will pick up the change, but also refresh immediately
    await refreshJobs();
  }, [jobs, refreshJobs]);

  // ── Retry a single job ──
  const retryJob = useCallback(async (jobId: string) => {
    await db
      .from("upload_jobs")
      .update({ status: "pending" } as any)
      .eq("id", jobId);
    await refreshJobs();
  }, [refreshJobs]);

  // ── Realtime subscription ──
  useEffect(() => {
    // Initial load
    refreshJobs();

    // Subscribe to all changes on upload_jobs
    const channel = supabase
      .channel("upload-jobs-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "upload_jobs" },
        (payload) => {
          const newRecord = payload.new as DbJob | undefined;
          const eventType = payload.eventType;

          setJobs((prev) => {
            if (eventType === "INSERT" && newRecord) {
              // Add to top if not already present
              if (prev.some((j) => j.id === newRecord.id)) return prev;
              return [newRecord, ...prev];
            }

            if (eventType === "UPDATE" && newRecord) {
              const updated = prev.map((j) =>
                j.id === newRecord.id ? newRecord : j
              );

              // If job just became "done", fire callback
              const oldJob = prev.find((j) => j.id === newRecord.id);
              if (oldJob && oldJob.status !== "done" && newRecord.status === "done") {
                onJobDone?.(newRecord);
                invalidateBookCache();
              }

              return updated;
            }

            if (eventType === "DELETE") {
              const oldId = (payload.old as any)?.id;
              if (oldId) return prev.filter((j) => j.id !== oldId);
            }

            return prev;
          });

          // Auto-trigger worker if a new pending job appeared
          if (
            autoTrigger &&
            newRecord?.status === "pending" &&
            !triggeringRef.current
          ) {
            triggerWorker();
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [autoTrigger, onJobDone, refreshJobs, triggerWorker]);

  const stats = {
    total: jobs.length,
    pending: jobs.filter((j) => j.status === "pending").length,
    processing: jobs.filter((j) => j.status === "processing").length,
    done: jobs.filter((j) => j.status === "done").length,
    errors: jobs.filter((j) => j.status === "error").length,
  };

  return {
    jobs,
    stats,
    workerActive,
    refreshJobs,
    triggerWorker,
    retryFailed,
    retryJob,
  };
}
