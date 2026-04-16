/**
 * Concurrent upload queue with retry support and batch completion callback.
 * Framework-agnostic — used by React hook wrapper.
 */

export type JobStatus = "queued" | "uploading" | "done" | "error";

export interface JobState<T = unknown> {
  id: number;
  payload: T;
  status: JobStatus;
  error?: string;
  retries: number;
  /** Arbitrary result data stored after successful processing */
  result?: any;
}

export interface QueueOptions<T> {
  concurrency?: number;    // default 5
  maxRetries?: number;     // default 2
  processor: (payload: T) => Promise<any>;
  onUpdate: (jobs: JobState<T>[]) => void;
  onComplete?: (stats: { success: number; failed: number }, jobs: JobState<T>[]) => void;
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

  start() {
    if (this.active) return;
    this.active = true;
    this.drain();
  }

  retryFailed() {
    this.jobs = this.jobs.map((j) =>
      j.status === "error" ? { ...j, status: "queued" as const, error: undefined } : j
    );
    this.notify();
    if (this.active) this.drain();
    else this.start();
  }

  clearDone() {
    this.jobs = this.jobs.filter((j) => j.status !== "done");
    this.notify();
  }

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

    if (this.running === 0 && !this.jobs.some((j) => j.status === "queued")) {
      this.active = false;
      this.opts.onComplete?.(
        {
          success: this.jobs.filter((j) => j.status === "done").length,
          failed: this.jobs.filter((j) => j.status === "error").length,
        },
        [...this.jobs]
      );
    }
  }

  private async runJob(job: JobState<T>) {
    this.running++;
    this.updateJob(job.id, { status: "uploading" });

    try {
      const result = await this.opts.processor(job.payload);
      this.updateJob(job.id, { status: "done", result });
    } catch (err: any) {
      const retries = (this.jobs.find((j) => j.id === job.id)?.retries ?? 0) + 1;
      if (retries <= this.opts.maxRetries) {
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
