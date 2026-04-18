import { supabase } from "@/integrations/supabase/client";

export type PaymentMethod = "manual" | "stripe" | "paddle" | "paypal";
export type PaymentPurpose = "credits" | "print_order" | "subscription" | "asset";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type ProofStatus = "pending" | "approved" | "rejected";

export interface Payment {
  id: string;
  user_id: string | null;
  print_order_id: string | null;
  method: PaymentMethod;
  purpose: PaymentPurpose;
  amount: number;
  currency: string;
  credits_to_add: number;
  status: PaymentStatus;
  transaction_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface PaymentProof {
  id: string;
  payment_id: string;
  user_id: string;
  image_url: string;
  storage_path: string;
  status: ProofStatus;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface CreateManualPaymentInput {
  amount: number;
  purpose: PaymentPurpose;
  credits_to_add?: number;
  print_order_id?: string;
  currency?: string;
  metadata?: Record<string, unknown>;
}

export const paymentService = {
  async createManualPayment(input: CreateManualPaymentInput): Promise<Payment> {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("payments")
      .insert({
        user_id: auth.user.id,
        method: "manual",
        purpose: input.purpose,
        amount: input.amount,
        currency: input.currency ?? "MAD",
        credits_to_add: input.credits_to_add ?? 0,
        print_order_id: input.print_order_id ?? null,
        status: "pending",
        metadata: input.metadata ?? {},
      })
      .select()
      .single();

    if (error) throw error;
    return data as Payment;
  },

  async uploadProof(paymentId: string, file: File): Promise<PaymentProof> {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Not authenticated");

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${auth.user.id}/${paymentId}-${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("payment-proofs")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) throw upErr;

    // signed URL (24h) for the user; admins use their own signed URL via list
    const { data: signed, error: signErr } = await supabase.storage
      .from("payment-proofs")
      .createSignedUrl(path, 60 * 60 * 24);
    if (signErr) throw signErr;

    const { data, error } = await supabase
      .from("payment_proofs")
      .insert({
        payment_id: paymentId,
        user_id: auth.user.id,
        image_url: signed.signedUrl,
        storage_path: path,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;
    return data as PaymentProof;
  },

  async getMyPayments(): Promise<Payment[]> {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Payment[];
  },

  // Admin
  async listAllPending(): Promise<(Payment & { proofs: PaymentProof[] })[]> {
    const { data: payments, error } = await supabase
      .from("payments")
      .select("*")
      .eq("status", "pending")
      .eq("method", "manual")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const ids = (payments ?? []).map((p) => p.id);
    if (ids.length === 0) return [];

    const { data: proofs } = await supabase
      .from("payment_proofs")
      .select("*")
      .in("payment_id", ids);

    // refresh signed URLs for admin viewing (1h)
    const proofsWithFresh = await Promise.all(
      ((proofs ?? []) as PaymentProof[]).map(async (pr) => {
        const { data: signed } = await supabase.storage
          .from("payment-proofs")
          .createSignedUrl(pr.storage_path, 60 * 60);
        return { ...pr, image_url: signed?.signedUrl ?? pr.image_url };
      })
    );

    return (payments as Payment[]).map((p) => ({
      ...p,
      proofs: proofsWithFresh.filter((pr) => pr.payment_id === p.id),
    }));
  },

  async listAll(filter?: { status?: PaymentStatus }): Promise<Payment[]> {
    let q = supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(200);
    if (filter?.status) q = q.eq("status", filter.status);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Payment[];
  },

  async approve(paymentId: string, note?: string) {
    const { data, error } = await supabase.rpc("approve_manual_payment", {
      _payment_id: paymentId,
      _admin_note: note ?? null,
    });
    if (error) throw error;
    return data as { ok: boolean; reason: string; credits_added?: number };
  },

  async reject(paymentId: string, note?: string) {
    const { data, error } = await supabase.rpc("reject_manual_payment", {
      _payment_id: paymentId,
      _admin_note: note ?? null,
    });
    if (error) throw error;
    return data as { ok: boolean; reason: string };
  },
};
