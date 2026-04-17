import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  subscriptionService,
  type SubscriptionPlan,
  type UserCredits,
  type UserSubscription,
  type ConsumeResult,
  EXPORT_COST,
} from "@/services/subscriptionService";

interface UseBillingResult {
  loading: boolean;
  authed: boolean;
  plan: SubscriptionPlan | null;
  subscription: UserSubscription | null;
  credits: UserCredits | null;
  /** Can the user export this type without contacting the server? Used for UI hint only. */
  canExport: (type: "pdf" | "png") => boolean;
  reload: () => Promise<void>;
  /** Server-validated consume. Caller must only proceed when allowed === true. */
  consume: (type: "pdf" | "png", templateId?: string | null) => Promise<ConsumeResult>;
}

export function useBilling(): UseBillingResult {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [credits, setCredits] = useState<UserCredits | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setAuthed(false);
        setPlan(null);
        setSubscription(null);
        setCredits(null);
        return;
      }
      setAuthed(true);
      const [sub, bal, plans] = await Promise.all([
        subscriptionService.getMySubscription(),
        subscriptionService.getMyCredits(),
        subscriptionService.listPlans(),
      ]);
      setSubscription(sub);
      setCredits(bal);
      setPlan(plans.find((p) => p.code === sub?.plan_code) ?? plans.find((p) => p.code === "free") ?? null);
    } catch (e) {
      console.error("[useBilling]", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(() => reload());
    return () => sub.unsubscribe();
  }, [reload]);

  const canExport = useCallback(
    (type: "pdf" | "png") => {
      if (!authed) return false;
      if (plan?.is_unlimited) return true;
      return (credits?.balance ?? 0) >= EXPORT_COST[type];
    },
    [authed, plan, credits],
  );

  const consume = useCallback(
    async (type: "pdf" | "png", templateId?: string | null) => {
      const result = await subscriptionService.consumeExport(type, templateId);
      if (result.allowed) await reload();
      return result;
    },
    [reload],
  );

  return { loading, authed, plan, subscription, credits, canExport, reload, consume };
}
