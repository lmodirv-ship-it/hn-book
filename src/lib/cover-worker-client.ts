/**
 * Promise-based wrapper around the cover generation Web Worker.
 * Falls back to main-thread Canvas if Worker/OffscreenCanvas unavailable.
 */

import { generateBookCover as mainThreadGenerate } from "@/lib/cover-generator";

type PendingJob = {
  resolve: (blob: Blob) => void;
  reject: (err: Error) => void;
};

let worker: Worker | null = null;
let jobId = 0;
const pending = new Map<number, PendingJob>();
let supportsOffscreen: boolean | null = null;

function checkOffscreenSupport(): boolean {
  if (supportsOffscreen !== null) return supportsOffscreen;
  try {
    supportsOffscreen = typeof OffscreenCanvas !== "undefined" &&
      typeof Worker !== "undefined";
  } catch {
    supportsOffscreen = false;
  }
  return supportsOffscreen;
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(
      new URL("../workers/cover-generator.worker.ts", import.meta.url),
      { type: "module" }
    );
    worker.onmessage = (e: MessageEvent) => {
      const { id, success, buffer, error } = e.data;
      const job = pending.get(id);
      if (!job) return;
      pending.delete(id);

      if (success) {
        const blob = new Blob([buffer], { type: "image/jpeg" });
        job.resolve(blob);
      } else {
        job.reject(new Error(error));
      }
    };
    worker.onerror = () => {
      // If worker crashes, reject all pending and disable
      pending.forEach((j) => j.reject(new Error("Worker crashed")));
      pending.clear();
      worker = null;
      supportsOffscreen = false;
    };
  }
  return worker;
}

/**
 * Generate a book cover — uses Web Worker if available, falls back to main thread.
 */
export function generateCoverAsync(
  title: string,
  referenceCode: string
): Promise<Blob> {
  if (!checkOffscreenSupport()) {
    return mainThreadGenerate(title, referenceCode);
  }

  return new Promise<Blob>((resolve, reject) => {
    const id = jobId++;
    pending.set(id, { resolve, reject });

    try {
      getWorker().postMessage({ id, title, referenceCode });
    } catch {
      pending.delete(id);
      // Fallback
      mainThreadGenerate(title, referenceCode).then(resolve, reject);
    }
  });
}

/** Terminate the worker when no longer needed. */
export function terminateCoverWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
    pending.forEach((j) => j.reject(new Error("Worker terminated")));
    pending.clear();
  }
}
