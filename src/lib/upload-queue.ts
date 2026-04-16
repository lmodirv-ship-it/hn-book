/**
 * Concurrent upload queue with retry support.
 * Framework-agnostic — used by React hook wrapper.
 */

export type JobStatus = "queued" | "uploading" | "done" | "error";

export interface JobState<T = unknown> {
  id: number;
  payload: T;
  status: JobStatus;
  error?: string;
  retries: number;
}

export interface QueueOptions<T> {
  concurrency?: number;    // default 5
  maxRetries?: number;     // default 2
  processor: (payload: T) => Promise<void>;
  onUpdate: (jobs: JobState<T>[]) => void;
  onComplete?: (stats: { success: number; failed: number }) => void;
}

export class UploadQueue<T> {
  private jobs: JobState<T>[] = [];
  private running = 0;
  private active = false;
  private nextId = 0;
  private opts: Required<Pick<QueueOptions<T>, "concurrency" | "maxRetries">> &
    QueueOptions<T>;

  constructor(options: QueueOptions<T>) {
    this.opts = {
      concurrency: 5,
      maxRetries: 2,
      ...options,
    };
  }

  /** Add jobs to the queue (can be called while processing). */
  enqueue(payloads: T[]) {
    const newJobs: JobState<T>[] = payloads.map((payload) => ({
      id: this.nextId++,
      payload,
      status: "queued" as const,
      retries: 0,
    }));
    this.jobs = [...this.jobs, ...newJobs];
    this.notify();
    if (this.active) this.drain();
  }

  /** Start processing all queued jobs. */
  start() {
    if (this.active) return;
    this.active = true;
    this.drain();
  }

  /** Retry all failed jobs. */
  retryFailed() {
    this.jobs = this.jobs.map((j) =>
      j.status === "error" ? { ...j, status: "queued" as const, error: undefined } : j
    );
    this.notify();
    if (this.active) this.drain();
    else this.start();
  }

  /** Remove completed/failed jobs from list. */
  clearDone() {
    this.jobs = this.jobs.filter((j) => j.status !== "done");
    this.notify();
  }

  /** Clear everything and stop. */
  reset() {
    this.jobs = [];
    this.active = false;
    this.running = 0;
    this.notify();
  }

  get snapshot() {
    return this.jobs;
  }

  get isActive() {
    return this.active;
  }

  // ── Internals ──────────────────────────────

  private notify() {
    this.opts.onUpdate([...this.jobs]);
  }

  private updateJob(id: number, patch: Partial<JobState<T>>) {
    this.jobs = this.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j));
    this.notify();
  }

  private drain() {
    while (this.running < this.opts.concurrency) {
      const next = this.jobs.find((j) => j.status === "queued");
      if (!next) break;
      this.runJob(next);
    }

    // Check if completely done
    if (this.running === 0 && !this.jobs.some((j) => j.status === "queued")) {
      this.active = false;
      this.opts.onComplete?.({
        success: this.jobs.filter((j) => j.status === "done").length,
        failed: this.jobs.filter((j) => j.status === "error").length,
      });
    }
  }

  private async runJob(job: JobState<T>) {
    this.running++;
    this.updateJob(job.id, { status: "uploading" });

    try {
      await this.opts.processor(job.payload);
      this.updateJob(job.id, { status: "done" });
    } catch (err: any) {
      const retries = (this.jobs.find((j) => j.id === job.id)?.retries ?? 0) + 1;
      if (retries <= this.opts.maxRetries) {
        // Re-queue for retry
        this.updateJob(job.id, { status: "queued", retries, error: undefined });
      } else {
        this.updateJob(job.id, {
          status: "error",
          retries,
          error: err?.message || "خطأ غير متوقع",
        });
      }
    } finally {
      this.running--;
      this.drain();
    }
  }
}
