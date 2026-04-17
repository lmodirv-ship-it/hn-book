/**
 * ContentContext — global CMS content cache.
 * Loads all cms_content entries once, exposes useContent('page.key', fallback).
 */
import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type ContentMap = Record<string, string>; // "page.key" -> value

interface ContentContextValue {
  map: ContentMap;
  loading: boolean;
  refresh: () => Promise<void>;
}

const ContentContext = createContext<ContentContextValue>({
  map: {},
  loading: true,
  refresh: async () => {},
});

export const ContentProvider = ({ children }: { children: ReactNode }) => {
  const [map, setMap] = useState<ContentMap>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.from("cms_content").select("page,key,value");
    if (!error && data) {
      const next: ContentMap = {};
      for (const row of data as any[]) {
        next[`${row.page}.${row.key}`] = row.value ?? "";
      }
      setMap(next);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    // Realtime updates so admins see CMS edits instantly across tabs
    const channel = supabase
      .channel("cms-content-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cms_content" },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const value = useMemo(() => ({ map, loading, refresh }), [map, loading, refresh]);
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
};

/** Get a CMS string. Returns fallback while loading or if missing. */
export function useContent(pageDotKey: string, fallback: string = ""): string {
  const { map } = useContext(ContentContext);
  const v = map[pageDotKey];
  return v && v.length > 0 ? v : fallback;
}

export function useContentRaw() {
  return useContext(ContentContext);
}
