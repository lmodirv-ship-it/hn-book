import { supabase } from "@/integrations/supabase/client";

export type IntegrationStatus = "not_configured" | "connected" | "error";

export interface IntegrationLog {
  id: string;
  integration_id: string | null;
  provider: string;
  action: string;
  success: boolean;
  status_code: number | null;
  duration_ms: number | null;
  message: string | null;
  metadata: Record<string, unknown>;
  triggered_by: string | null;
  created_at: string;
}

export interface ApiIntegration {
  id: string;
  name: string;
  base_url: string;
  api_key_name: string | null;
  secret_ref: string | null;
  key_hint: string | null;
  config: Record<string, unknown>;
  category: string;
  description: string | null;
  is_active: boolean;
  status?: IntegrationStatus;
  last_tested_at?: string | null;
  last_test_message?: string | null;
  created_at: string;
  updated_at: string;
}

export type ApiIntegrationInput = {
  name: string;
  base_url?: string;
  api_key_name?: string | null;
  secret_ref?: string | null;
  key_hint?: string | null;
  config?: Record<string, unknown>;
  category?: string;
  description?: string | null;
  is_active?: boolean;
  status?: IntegrationStatus;
};

export const integrationsService = {
  async list(): Promise<ApiIntegration[]> {
    const { data, error } = await supabase
      .from("api_integrations")
      .select("*")
      .order("category")
      .order("name");
    if (error) throw error;
    return (data ?? []) as unknown as ApiIntegration[];
  },

  async getByName(name: string): Promise<ApiIntegration | null> {
    const { data, error } = await supabase
      .from("api_integrations")
      .select("*")
      .ilike("name", name)
      .maybeSingle();
    if (error) throw error;
    return (data as unknown as ApiIntegration) ?? null;
  },

  async upsertByName(name: string, patch: Partial<ApiIntegrationInput>) {
    const existing = await this.getByName(name);
    if (existing) {
      const { error } = await supabase
        .from("api_integrations")
        .update(patch as never)
        .eq("id", existing.id);
      if (error) throw error;
      return existing.id;
    }
    const { data, error } = await supabase
      .from("api_integrations")
      .insert({ name, base_url: "", ...patch } as never)
      .select("id")
      .single();
    if (error) throw error;
    return (data as { id: string }).id;
  },

  async create(input: ApiIntegrationInput) {
    const { error } = await supabase.from("api_integrations").insert(input as never);
    if (error) throw error;
  },

  async update(id: string, patch: Partial<ApiIntegrationInput>) {
    const { error } = await supabase
      .from("api_integrations")
      .update(patch as never)
      .eq("id", id);
    if (error) throw error;
  },

  async toggle(id: string, is_active: boolean) {
    const { error } = await supabase
      .from("api_integrations")
      .update({ is_active })
      .eq("id", id);
    if (error) throw error;
  },

  async remove(id: string) {
    const { error } = await supabase.from("api_integrations").delete().eq("id", id);
    if (error) throw error;
  },

  async listLogs(opts?: { provider?: string; integration_id?: string; limit?: number }): Promise<IntegrationLog[]> {
    let q = supabase
      .from("integration_logs" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(opts?.limit ?? 100);
    if (opts?.provider) q = q.eq("provider" as never, opts.provider as never);
    if (opts?.integration_id) q = q.eq("integration_id" as never, opts.integration_id as never);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as unknown as IntegrationLog[];
  },

  async clearLogs(opts?: { provider?: string }) {
    let q = supabase.from("integration_logs" as never).delete();
    if (opts?.provider) q = q.eq("provider" as never, opts.provider as never);
    else q = q.gt("created_at" as never, "1970-01-01" as never);
    const { error } = await q;
    if (error) throw error;
  },


  async resolveSecure(name: string) {
    const { data, error } = await supabase.functions.invoke("get-integration-config", {
      body: { name },
    });
    if (error) throw error;
    return data as { integration: ApiIntegration & { secret_present: boolean } };
  },

  async testConnection(payload: {
    id?: string;
    name?: string;
    base_url?: string;
    secret_ref?: string;
    api_key_name?: string;
  }): Promise<TestConnectionResult> {
    const { data, error } = await supabase.functions.invoke("test-integration-connection", {
      body: payload,
    });
    if (error) return { ok: false, stage: "request", error: error.message };
    return data as TestConnectionResult;
  },

  /** Provider-specific test (Stripe / WhatsApp / Analytics). */
  async testProvider(payload: {
    provider: "stripe" | "whatsapp" | "analytics";
    integration_id?: string;
    secret_ref?: string;
    config?: Record<string, unknown>;
    test_to?: string;
  }): Promise<ProviderTestResult> {
    const { data, error } = await supabase.functions.invoke("test-provider-integration", {
      body: payload,
    });
    if (error) return { ok: false, status: 0, snippet: error.message, provider: payload.provider };
    return data as ProviderTestResult;
  },
};

export type TestConnectionResult = {
  ok: boolean;
  stage?: "validation" | "secret" | "request";
  name?: string;
  status?: number;
  snippet?: string;
  tested_url?: string;
  auth_header?: string | null;
  error?: string;
};

export type ProviderTestResult = {
  ok: boolean;
  provider: "stripe" | "whatsapp" | "analytics";
  status: number;
  snippet: string;
};

export function maskKey(value?: string | null): string {
  if (!value) return "—";
  const v = String(value);
  if (v.length <= 4) return "••••";
  return "••••" + v.slice(-4);
}
