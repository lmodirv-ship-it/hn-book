import { supabase } from "@/integrations/supabase/client";

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
  created_at: string;
  updated_at: string;
}

export type ApiIntegrationInput = {
  name: string;
  base_url: string;
  api_key_name?: string | null;
  secret_ref?: string | null;
  key_hint?: string | null;
  config?: Record<string, unknown>;
  category?: string;
  description?: string | null;
  is_active?: boolean;
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

  /** Backend-only: resolves config + secret presence via secure edge function. */
  async resolveSecure(name: string) {
    const { data, error } = await supabase.functions.invoke("get-integration-config", {
      body: { name },
    });
    if (error) throw error;
    return data as {
      integration: ApiIntegration & { secret_present: boolean };
    };
  },

  /** Test a connection. Pass either { id } / { name } or an ad-hoc payload. */
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
    if (error) {
      return { ok: false, stage: "request", error: error.message };
    }
    return data as TestConnectionResult;
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

/** Mask any sensitive string for display (keeps last 4 chars). */
export function maskKey(value?: string | null): string {
  if (!value) return "—";
  const v = String(value);
  if (v.length <= 4) return "••••";
  return "••••" + v.slice(-4);
}
