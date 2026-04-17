/**
 * Jobs Service — Queue worker client
 * Wraps the jobs-api edge function for typed job creation, retry, and status.
 */
import { supabase } from "@/integrations/supabase/client";

export type JobType = "pdf_generation" | "eps_to_svg" | "import" | "whatsapp_send" | string;
export type JobStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

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

  list: async (filter?: { status?: JobStatus; type?: JobType; limit?: number }): Promise<Job[]> => {
    let q = supabase.from("jobs" as any).select("*").order("created_at", { ascending: false });
    if (filter?.status) q = q.eq("status", filter.status);
    if (filter?.type) q = q.eq("type", filter.type);
    q = q.limit(filter?.limit ?? 100);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data || []) as unknown as Job[];
  },
};
