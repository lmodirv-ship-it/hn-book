/**
 * CMS Content Service
 * Reads/writes editable site content stored in cms_content.
 */
import { supabase } from "@/integrations/supabase/client";

export interface CmsEntry {
  id: string;
  page: string;
  key: string;
  value: string;
  value_type: string;
  label: string;
  description: string;
  updated_at: string;
}

export const cmsService = {
  async listAll(): Promise<CmsEntry[]> {
    const { data, error } = await supabase
      .from("cms_content")
      .select("*")
      .order("page", { ascending: true })
      .order("key", { ascending: true });
    if (error) throw error;
    return (data ?? []) as CmsEntry[];
  },

  async listByPage(page: string): Promise<CmsEntry[]> {
    const { data, error } = await supabase
      .from("cms_content")
      .select("*")
      .eq("page", page);
    if (error) throw error;
    return (data ?? []) as CmsEntry[];
  },

  async upsert(entry: Partial<CmsEntry> & { page: string; key: string; value: string }) {
    const { error } = await supabase.from("cms_content").upsert(
      {
        page: entry.page,
        key: entry.key,
        value: entry.value,
        value_type: entry.value_type ?? "text",
        label: entry.label ?? "",
        description: entry.description ?? "",
      },
      { onConflict: "page,key" },
    );
    if (error) throw error;
  },

  async remove(id: string) {
    const { error } = await supabase.from("cms_content").delete().eq("id", id);
    if (error) throw error;
  },
};
