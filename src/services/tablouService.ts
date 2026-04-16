/**
 * Tablou (Wall Art) Service
 */
import { supabase } from "@/integrations/supabase/client";

export interface Tablou {
  id: string;
  title: string;
  image_url: string;
  category: string;
  description: string;
  base_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  sizes?: TablouSize[];
}

export interface TablouSize {
  id: string;
  tablou_id: string;
  size: string;
  width_cm: number;
  height_cm: number;
  price_multiplier: number;
  is_available: boolean;
}

export const TABLOU_CATEGORIES = [
  { value: "modern", label: "عصري" },
  { value: "islamic", label: "إسلامي" },
  { value: "nature", label: "طبيعة" },
  { value: "abstract", label: "تجريدي" },
  { value: "classic", label: "كلاسيكي" },
  { value: "minimalist", label: "بسيط" },
  { value: "photography", label: "تصوير" },
];

export const SIZE_LABELS: Record<string, string> = {
  small: "صغير",
  medium: "متوسط",
  large: "كبير",
};

const titleFromFilename = (filename: string): string => {
  return filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim() || "Untitled";
};

const suggestPrice = (): number => {
  const prices = [79, 99, 120, 149, 199];
  return prices[Math.floor(Math.random() * prices.length)];
};

export const tablouService = {
  // Public
  async getAll(filters?: { category?: string; limit?: number; offset?: number }): Promise<{ data: Tablou[]; count: number }> {
    let query = supabase
      .from("tablous")
      .select("*", { count: "exact" })
      .eq("is_active", true);

    if (filters?.category && filters.category !== "all") {
      query = query.eq("category", filters.category);
    }
    query = query.order("created_at", { ascending: false });
    if (filters?.limit) query = query.limit(filters.limit);
    if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);

    const { data, count } = await query as any;
    return { data: data || [], count: count || 0 };
  },

  async getById(id: string): Promise<Tablou | null> {
    const { data: tablou } = await supabase
      .from("tablous")
      .select("*")
      .eq("id", id)
      .single() as any;
    if (!tablou) return null;

    const { data: sizes } = await supabase
      .from("tablou_sizes")
      .select("*")
      .eq("tablou_id", id)
      .eq("is_available", true) as any;

    return { ...tablou, sizes: sizes || [] };
  },

  // Admin
  async getAllAdmin(): Promise<Tablou[]> {
    const { data } = await supabase
      .from("tablous")
      .select("*")
      .order("created_at", { ascending: false }) as any;
    return data || [];
  },

  async create(title: string, image_url: string, category: string = "modern", base_price?: number): Promise<string> {
    const { data, error } = await supabase
      .from("tablous")
      .insert({
        title,
        image_url,
        category,
        base_price: base_price ?? suggestPrice(),
      } as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return (data as any).id;
  },

  async smartUpload(file: File, category?: string): Promise<string> {
    const ext = file.name.split(".").pop();
    const path = `tablou/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("book-images").upload(path, file);
    if (uploadErr) throw new Error(uploadErr.message);
    const { data: urlData } = supabase.storage.from("book-images").getPublicUrl(path);
    const title = titleFromFilename(file.name);
    return await tablouService.create(title, urlData.publicUrl, category || "modern");
  },

  async update(id: string, updates: Partial<Tablou>): Promise<void> {
    const { error } = await supabase.from("tablous").update(updates as any).eq("id", id);
    if (error) throw new Error(error.message);
  },

  async delete(id: string): Promise<void> {
    await supabase.from("tablous").delete().eq("id", id);
  },

  async getSizes(tablouId: string): Promise<TablouSize[]> {
    const { data } = await supabase
      .from("tablou_sizes")
      .select("*")
      .eq("tablou_id", tablouId) as any;
    return data || [];
  },

  async updateSize(id: string, updates: Partial<TablouSize>): Promise<void> {
    await supabase.from("tablou_sizes").update(updates as any).eq("id", id);
  },
};
