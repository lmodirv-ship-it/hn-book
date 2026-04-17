/**
 * Subscription & credits service.
 * - Read plans, current subscription, credit balance, transactions, export logs.
 * - Server-validated export consumption via edge function.
 */
import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  price_monthly: number;
  monthly_credits: number;
  is_unlimited: boolean;
  is_active: boolean;
  sort_order: number;
  features: string[];
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_code: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

export interface UserCredits {
  user_id: string;
  balance: number;
  total_earned: number;
  total_spent: number;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  delta: number;
  reason: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ExportLog {
  id: string;
  user_id: string | null;
  export_type: "pdf" | "png";
  cost: number;
  allowed: boolean;
  reason: string;
  template_id: string | null;
  created_at: string;
}

export interface ConsumeResult {
  allowed: boolean;
  reason: string;
  balance: number | null;
  cost?: number;
  plan?: string;
}

export const EXPORT_COST = { pdf: 2, png: 1 } as const;

export const subscriptionService = {
  async listPlans(): Promise<SubscriptionPlan[]> {
    const { data, error } = await supabase
      .from("subscription_plans" as any)
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw error;
    return ((data ?? []) as any[]).map((p) => ({
      ...p,
      features: Array.isArray(p.features) ? p.features : [],
    })) as SubscriptionPlan[];
  },

  async listAllPlans(): Promise<SubscriptionPlan[]> {
    const { data, error } = await supabase
      .from("subscription_plans" as any)
      .select("*")
      .order("sort_order");
    if (error) throw error;
    return ((data ?? []) as any[]).map((p) => ({
      ...p,
      features: Array.isArray(p.features) ? p.features : [],
    })) as SubscriptionPlan[];
  },

  async updatePlan(id: string, patch: Partial<SubscriptionPlan>) {
    const { error } = await supabase
      .from("subscription_plans" as any)
      .update(patch as any)
      .eq("id", id);
    if (error) throw error;
  },

  async getMySubscription(): Promise<UserSubscription | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("user_subscriptions" as any)
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as unknown as UserSubscription | null) ?? null;
  },

  async getMyCredits(): Promise<UserCredits | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("user_credits" as any)
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    return (data as unknown as UserCredits | null) ?? { user_id: user.id, balance: 0, total_earned: 0, total_spent: 0 };
  },

  async listMyTransactions(limit = 20): Promise<CreditTransaction[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("credit_transactions" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as unknown as CreditTransaction[];
  },

  async consumeExport(exportType: "pdf" | "png", templateId?: string | null): Promise<ConsumeResult> {
    const { data, error } = await supabase.functions.invoke("consume-export-credit", {
      body: { export_type: exportType, template_id: templateId ?? null },
    });
    if (error) {
      return { allowed: false, reason: error.message || "network_error", balance: null };
    }
    return data as ConsumeResult;
  },

  // --- Admin ---
  async grantCredits(userId: string, amount: number, reason = "admin_grant"): Promise<number> {
    const { data, error } = await supabase.rpc("grant_credits" as any, {
      _user_id: userId,
      _amount: amount,
      _reason: reason,
    });
    if (error) throw error;
    return Number(data ?? 0);
  },

  async listExportLogs(limit = 100): Promise<ExportLog[]> {
    const { data, error } = await supabase
      .from("export_logs" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as unknown as ExportLog[];
  },

  async listAllSubscriptions() {
    const { data, error } = await supabase
      .from("user_subscriptions" as any)
      .select("*")
      .eq("is_active", true)
      .order("start_date", { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data ?? []) as any[];
  },

  async listAllCredits() {
    const { data, error } = await supabase
      .from("user_credits" as any)
      .select("*")
      .order("balance", { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data ?? []) as any[];
  },
};
