/**
 * Print Pricing Service — manages dynamic pricing rules per asset type / quantity / paper size.
 *
 * Lookup order: exact match on (asset_type, quantity, paper_size) → falls back
 * to the closest defined quantity for that asset_type/paper_size.
 * Applies discount_percent and time-window validity (valid_from / valid_until).
 */
import { supabase } from "@/integrations/supabase/client";

export interface PrintPricingRule {
  id: string;
  asset_type: string;
  quantity: number;
  base_price: number;
  shipping_price: number;
  paper_size: string | null;
  is_active: boolean;
  discount_percent: number;
  promo_label: string | null;
  is_featured: boolean;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

export type PrintPricingInput = Omit<PrintPricingRule, "id" | "created_at" | "updated_at">;

export const ASSET_TYPES = [
  { value: "CRD", label: "CRD — بطاقة" },
  { value: "LOG", label: "LOG — شعار" },
  { value: "TPL", label: "TPL — قالب" },
  { value: "FLY", label: "FLY — فلاير" },
  { value: "PST", label: "PST — ملصق" },
  { value: "DOC", label: "DOC — مستند" },
  { value: "OTH", label: "OTH — آخر" },
] as const;

export const PAPER_SIZE_OPTIONS = [
  { value: "", label: "أي مقاس" },
  { value: "A4", label: "A4" },
  { value: "A3", label: "A3" },
] as const;

export interface ResolvedPrice {
  base_price: number;        // after discount
  original_price: number;    // before discount (for strike-through)
  discount_percent: number;
  shipping_price: number;
  matchedQuantity: number;
  promo_label: string | null;
  is_featured: boolean;
}

function isWithinWindow(rule: PrintPricingRule, now: Date): boolean {
  if (rule.valid_from && new Date(rule.valid_from) > now) return false;
  if (rule.valid_until && new Date(rule.valid_until) < now) return false;
  return true;
}

export const printPricingService = {
  async list(): Promise<PrintPricingRule[]> {
    const { data, error } = await supabase
      .from("print_pricing_rules" as any)
      .select("*")
      .order("is_featured", { ascending: false })
      .order("asset_type", { ascending: true })
      .order("quantity", { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []) as unknown as PrintPricingRule[];
  },

  async create(rule: PrintPricingInput): Promise<PrintPricingRule> {
    const { data, error } = await supabase
      .from("print_pricing_rules" as any)
      .insert(rule as any)
      .select()
      .single();
    if (error) {
      if (error.code === "23505") {
        throw new Error("قاعدة تسعير مماثلة موجودة بالفعل (نفس النوع والكمية والمقاس).");
      }
      throw new Error(error.message);
    }
    return data as unknown as PrintPricingRule;
  },

  async update(id: string, rule: Partial<PrintPricingInput>): Promise<void> {
    const { error } = await supabase
      .from("print_pricing_rules" as any)
      .update(rule as any)
      .eq("id", id);
    if (error) {
      if (error.code === "23505") {
        throw new Error("قاعدة تسعير مماثلة موجودة بالفعل.");
      }
      throw new Error(error.message);
    }
  },

  async toggleActive(id: string, is_active: boolean): Promise<void> {
    const { error } = await supabase
      .from("print_pricing_rules" as any)
      .update({ is_active } as any)
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from("print_pricing_rules" as any)
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  /**
   * Resolve a price for an order. Returns null if no rule found.
   * Filters out rules outside their valid_from / valid_until window.
   * Prefers featured rules when multiple match the same quantity.
   */
  async resolvePrice(
    assetType: string,
    quantity: number,
    paperSize?: string,
  ): Promise<ResolvedPrice | null> {
    const { data, error } = await supabase
      .from("print_pricing_rules" as any)
      .select("*")
      .eq("asset_type", assetType)
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("quantity", { ascending: true });
    if (error || !data || data.length === 0) return null;

    const now = new Date();
    const rules = (data as unknown as PrintPricingRule[]).filter((r) => isWithinWindow(r, now));
    if (rules.length === 0) return null;

    const sized = rules.filter((r) =>
      paperSize ? r.paper_size === paperSize || r.paper_size === null : r.paper_size === null,
    );
    const pool = sized.length > 0 ? sized : rules;

    // 1) Exact quantity match — featured first (already sorted)
    const exact = pool.find((r) => r.quantity === quantity);
    const chosen = exact ?? pool.reduce((best, r) =>
      Math.abs(r.quantity - quantity) < Math.abs(best.quantity - quantity) ? r : best,
    );

    const original = Number(chosen.base_price);
    const discountPct = Number(chosen.discount_percent) || 0;
    const discounted = Math.max(0, original * (1 - discountPct / 100));
    return {
      base_price: Math.round(discounted * 100) / 100,
      original_price: original,
      discount_percent: discountPct,
      shipping_price: Number(chosen.shipping_price),
      matchedQuantity: chosen.quantity,
      promo_label: chosen.promo_label,
      is_featured: chosen.is_featured,
    };
  },
};
