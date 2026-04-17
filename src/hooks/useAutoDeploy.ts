import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "lovable_last_build_hash";

/**
 * On app load, fetches /index.html, extracts the main JS bundle hash,
 * compares to localStorage. If changed AND deploy_auto_enabled is true,
 * fires the trigger-deploy edge function once per real publish.
 *
 * Only runs for authenticated admin sessions to avoid wasted calls.
 */
export function useAutoDeploy() {
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        // Need an authenticated session — auto-deploy requires admin auth
        const { data: sess } = await supabase.auth.getSession();
        if (!sess.session) return;

        // Fetch index.html and extract first hashed asset filename
        const html = await fetch("/index.html", { cache: "no-store" }).then((r) => r.text());
        const match = html.match(/\/assets\/[a-zA-Z0-9_-]+\.[a-f0-9]{8,}\.(?:js|css)/);
        const hash = match?.[0] ?? "";
        if (!hash) return;

        const previous = localStorage.getItem(STORAGE_KEY);
        if (previous === hash) return; // no new build
        const isFirstRun = previous === null;
        localStorage.setItem(STORAGE_KEY, hash);
        if (isFirstRun) return; // don't fire on very first visit ever

        // Check if auto is enabled
        const { data: cfg } = await supabase
          .from("system_config")
          .select("value")
          .eq("key", "deploy_auto_enabled")
          .maybeSingle();
        if (cancelled || cfg?.value !== true) return;

        // Fire (admin check happens server-side; non-admins get 403, harmless)
        await supabase.functions.invoke("trigger-deploy", {
          body: { trigger: "auto", build_hash: hash, notes: "auto on new build" },
        });
      } catch {
        // silent
      }
    };

    run();
    return () => { cancelled = true; };
  }, []);
}
