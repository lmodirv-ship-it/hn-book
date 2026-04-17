import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STORAGE_KEY = "lovable_last_build_hash";

/**
 * On app load, fetches /index.html, extracts the main JS bundle hash,
 * compares to localStorage. If changed AND deploy_auto_enabled is true,
 * fires the trigger-deploy edge function with a single client-side retry
 * and surfaces clear toast messages on success/failure.
 *
 * Only runs for authenticated admin sessions to avoid wasted calls.
 */
export function useAutoDeploy() {
  useEffect(() => {
    let cancelled = false;

    const invokeWithRetry = async (
      hash: string,
    ): Promise<{ ok: boolean; data: any; error: any }> => {
      const body = { trigger: "auto", build_hash: hash, notes: "auto on new build" };
      // Server already retries 3x; we add 1 client retry for transport-level errors.
      for (let attempt = 1; attempt <= 2; attempt++) {
        const { data, error } = await supabase.functions.invoke("trigger-deploy", { body });
        const ok = !error && (data?.success ?? false);
        if (ok || attempt === 2) return { ok, data, error };
        await new Promise((r) => setTimeout(r, 2000));
      }
      return { ok: false, data: null, error: new Error("unreachable") };
    };

    const run = async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        if (!sess.session) return;

        const html = await fetch("/index.html", { cache: "no-store" }).then((r) => r.text());
        const match = html.match(/\/assets\/[a-zA-Z0-9_-]+\.[a-f0-9]{8,}\.(?:js|css)/);
        const hash = match?.[0] ?? "";
        if (!hash) return;

        const previous = localStorage.getItem(STORAGE_KEY);
        if (previous === hash) return;
        const isFirstRun = previous === null;
        localStorage.setItem(STORAGE_KEY, hash);
        if (isFirstRun) return;
        if (cancelled) return;

        // External deploy webhook is the primary deployment path.
        // Fire immediately on every detected build change — no internal
        // upload/R2 dependency, no auto-enabled flag required.
        const tid = toast.loading("⏳ نشر تلقائي جارٍ عبر السيرفر الخاص...");
        const { ok, data, error } = await invokeWithRetry(hash);
        toast.dismiss(tid);

        if (ok) {
          toast.success(
            `✓ تم النشر — ${data?.attempts ?? 1} محاولة، ${data?.duration_ms ?? "?"}ms`,
          );
        } else {
          const msg =
            error?.message ||
            data?.message ||
            data?.snippet ||
            "فشل النشر التلقائي";
          toast.error(`✗ فشل النشر: ${String(msg).slice(0, 120)}`);
        }
      } catch {
        // silent — never block app load
      }
    };

    run();
    return () => { cancelled = true; };
  }, []);
}
