import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

let tracked = false;

export function useVisitorTracking() {
  useEffect(() => {
    if (tracked) return;
    tracked = true;

    supabase
      .from("visitors")
      .insert({
        page_path: window.location.pathname,
        user_agent: navigator.userAgent,
      })
      .then(() => {});
  }, []);
}
