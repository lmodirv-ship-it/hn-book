import { supabase } from "@/integrations/supabase/client";

export type AssetType = "CRD" | "TPL" | "LOG" | "FLY" | "PST" | "IMG" | "ART" | "DOC" | "PRE" | "LST" | "OTH";
export type AssetCategory = "DSN" | "MED" | "DOC" | "OTH";

export interface Asset {
  id: string;
  code: string;
  asset_type: AssetType;
  category: AssetCategory;
  title: string;
  description: string | null;
  image_url: string;
  file_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAssetInput {
  asset_type: AssetType;
  title: string;
  image_url: string;
  file_url?: string | null;
  description?: string;
  metadata?: Record<string, any>;
}

export const ASSET_TYPE_META: Record<AssetType, { label: string; category: AssetCategory; emoji: string }> = {
  CRD: { label: "بطاقات", category: "DSN", emoji: "💳" },
  TPL: { label: "قوالب", category: "DSN", emoji: "📐" },
  LOG: { label: "شعارات", category: "DSN", emoji: "🎯" },
  FLY: { label: "فلاير", category: "DSN", emoji: "📰" },
  PST: { label: "ملصقات", category: "DSN", emoji: "🖼️" },
  IMG: { label: "صور", category: "MED", emoji: "🖼️" },
  ART: { label: "أعمال فنية", category: "MED", emoji: "🎨" },
  DOC: { label: "وثائق", category: "DOC", emoji: "📄" },
  PRE: { label: "عروض", category: "DOC", emoji: "📊" },
  LST: { label: "قوائم", category: "DOC", emoji: "📋" },
  OTH: { label: "أخرى", category: "OTH", emoji: "📦" },
};

export const ASSET_CATEGORIES: Record<AssetCategory, string> = {
  DSN: "تصميم",
  MED: "وسائط",
  DOC: "وثائق",
  OTH: "أخرى",
};

export interface ListFilter {
  category?: AssetCategory | "all";
  asset_type?: AssetType | "all";
  search?: string;
  limit?: number;
}

export const assetService = {
  async create(input: CreateAssetInput): Promise<Asset> {
    const { data, error } = await supabase
      .from("assets" as never)
      .insert({
        asset_type: input.asset_type,
        category: ASSET_TYPE_META[input.asset_type].category,
        title: input.title,
        image_url: input.image_url,
        file_url: input.file_url ?? null,
        description: input.description ?? "",
      } as never)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as Asset;
  },

  async list(filter: ListFilter = {}): Promise<Asset[]> {
    let q = supabase.from("assets" as never).select("*").order("created_at", { ascending: false });
    if (filter.category && filter.category !== "all") q = q.eq("category", filter.category);
    if (filter.asset_type && filter.asset_type !== "all") q = q.eq("asset_type", filter.asset_type);
    if (filter.search) {
      const s = filter.search.trim();
      q = q.or(`code.ilike.%${s}%,title.ilike.%${s}%`);
    }
    if (filter.limit) q = q.limit(filter.limit);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as unknown as Asset[];
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("assets" as never).delete().eq("id", id);
    if (error) throw error;
  },

  async toggleActive(id: string, is_active: boolean): Promise<void> {
    const { error } = await supabase.from("assets" as never).update({ is_active } as never).eq("id", id);
    if (error) throw error;
  },
};
