/**
 * Jobs Service — Queue worker client
 * Wraps the jobs-api edge function for typed job creation, retry, and status.
 */
import { supabase } from "@/integrations/supabase/client";

export type JobType = "pdf_generation" | "eps_to_svg" | "import" | "whatsapp_send" | "generate_pdf" | "convert_eps_to_svg" | "import_designs" | "send_whatsapp" | string;
export type JobStatus = "pending" | "processing" | "completed" | "failed" | "cancelled" | "dead";

export interface JobAttempt {
  id: number;
  job_id: string;
  attempt: number;
  status: "started" | "succeeded" | "failed" | "dead";
  error: string | null;
  duration_ms: number | null;
  created_at: string;
}

export interface JobRetryPolicy {
  id: string;
  job_type: string;
  max_attempts: number;
  backoff_seconds: number;
  enabled: boolean;
}

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  priority: number;
  data: Record<string, any>;
  result: Record<string, any> | null;
  error: string | null;
  attempts: number;
  max_attempts: number;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateJobInput {
  type: JobType;
  data?: Record<string, any>;
  priority?: number;
  max_attempts?: number;
  scheduled_at?: string;
}

async function call(action: string, body: Record<string, any> = {}) {
  const { data, error } = await supabase.functions.invoke("jobs-api", {
    body: { action, ...body },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export const jobsService = {
  create: async (input: CreateJobInput): Promise<Job> => {
    const res = await call("create", input);
    return res.job as Job;
  },

  retry: async (jobId: string): Promise<void> => {
    await call("retry", { jobId });
  },

  retryAllFailed: async (): Promise<number> => {
    const res = await call("retry_all_failed");
    return res.retried ?? 0;
  },

  status: async (jobId: string): Promise<Job> => {
    const res = await call("status", { jobId });
    return res.job as Job;
  },

  list: async (filter?: { status?: JobStatus | "retrying"; type?: JobType; limit?: number }): Promise<Job[]> => {
    let q = supabase.from("jobs" as any).select("*").order("created_at", { ascending: false });
    // "retrying" = pending jobs with attempts > 0
    if (filter?.status === "retrying") {
      q = q.eq("status", "pending").gt("attempts", 0);
    } else if (filter?.status) {
      q = q.eq("status", filter.status);
    }
    if (filter?.type) q = q.eq("type", filter.type);
    q = q.limit(filter?.limit ?? 100);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data || []) as unknown as Job[];
  },

  // Manually revive a dead job (resets attempts, requeues)
  reviveDead: async (jobId: string): Promise<void> => {
    const { error } = await supabase
      .from("jobs" as any)
      .update({
        status: "pending",
        error: null,
        attempts: 0,
        scheduled_at: new Date().toISOString(),
        started_at: null,
        completed_at: null,
        last_notified_at: null,
      })
      .eq("id", jobId);
    if (error) throw new Error(error.message);
  },

  // Per-job attempt history
  attempts: async (jobId: string): Promise<JobAttempt[]> => {
    const { data, error } = await supabase
      .from("job_attempts" as any)
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []) as unknown as JobAttempt[];
  },

  // Retry policies (per type)
  listPolicies: async (): Promise<JobRetryPolicy[]> => {
    const { data, error } = await supabase
      .from("job_retry_policies" as any)
      .select("*")
      .order("job_type");
    if (error) throw new Error(error.message);
    return (data || []) as unknown as JobRetryPolicy[];
  },

  upsertPolicy: async (p: Pick<JobRetryPolicy, "job_type" | "max_attempts" | "backoff_seconds" | "enabled">): Promise<void> => {
    const { error } = await supabase
      .from("job_retry_policies" as any)
      .upsert(p, { onConflict: "job_type" });
    if (error) throw new Error(error.message);
  },
};
