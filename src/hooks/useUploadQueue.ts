import { useRef, useState, useCallback, useEffect } from "react";
import { UploadQueue, type JobState, type QueueOptions } from "@/lib/upload-queue";

/**
 * React hook wrapping UploadQueue for reactive state.
 */
export function useUploadQueue<T>(
  opts: Omit<QueueOptions<T>, "onUpdate">
) {
  const [jobs, setJobs] = useState<JobState<T>[]>([]);
  const queueRef = useRef<UploadQueue<T> | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const getQueue = useCallback(() => {
    if (!queueRef.current) {
      queueRef.current = new UploadQueue<T>({
        ...optsRef.current,
        onUpdate: (updated) => setJobs(updated),
      });
    }
    return queueRef.current;
  }, []);

  const enqueue = useCallback((payloads: T[]) => getQueue().enqueue(payloads), [getQueue]);
  const start = useCallback(() => getQueue().start(), [getQueue]);
  const retryFailed = useCallback(() => getQueue().retryFailed(), [getQueue]);
  const clearDone = useCallback(() => getQueue().clearDone(), [getQueue]);
  const reset = useCallback(() => { getQueue().reset(); setJobs([]); }, [getQueue]);

  const isActive = queueRef.current?.isActive ?? false;

  const stats = {
    total: jobs.length,
    queued: jobs.filter((j) => j.status === "queued").length,
    uploading: jobs.filter((j) => j.status === "uploading").length,
    done: jobs.filter((j) => j.status === "done").length,
    errors: jobs.filter((j) => j.status === "error").length,
  };

  return { jobs, stats, isActive, enqueue, start, retryFailed, clearDone, reset };
}
