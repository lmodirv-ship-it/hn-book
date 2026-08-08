import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface HnStats {
  visitors_total: number;
  visitors_today: number;
  visitors_online: number;
  members_total: number;
  members_today: number;
  server_time: string;
}

export function useHnStats(pollMs = 60000) {
  const [stats, setStats] = useState<HnStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.rpc("hn_public_stats" as any);
      if (!mounted) return;
      if (data) setStats(data as unknown as HnStats);
      setLoading(false);
    };
    load();
    const t = setInterval(load, pollMs);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, [pollMs]);

  return { stats, loading };
}
