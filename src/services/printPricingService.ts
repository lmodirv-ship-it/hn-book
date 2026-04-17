/**
 * Print Pricing Service — manages dynamic pricing rules per asset type / quantity / paper size.
 *
 * Lookup order: exact match on (asset_type, quantity, paper_size) → falls back
 * to the closest defined quantity for that asset_type/paper_size.
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

export const printPricingService = {
  async list(): Promise<PrintPricingRule[]> {
    const { data, error } = await supabase
      .from("print_pricing_rules" as any)
      .select("*")
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

  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from("print_pricing_rules" as any)
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  /**
   * Resolve a price for an order. Returns null if no rule found.
   * 1) Try exact (asset_type, quantity, paper_size).
   * 2) Try (asset_type, quantity, paper_size = null).
   * 3) Fallback: closest defined quantity (>= or nearest) for that asset_type+size.
   */
  async resolvePrice(
    assetType: string,
    quantity: number,
    paperSize?: string,
  ): Promise<{ base_price: number; shipping_price: number; matchedQuantity: number } | null> {
    const { data, error } = await supabase
      .from("print_pricing_rules" as any)
      .select("*")
      .eq("asset_type", assetType)
      .eq("is_active", true)
      .order("quantity", { ascending: true });
    if (error || !data || data.length === 0) return null;

    const rules = data as unknown as PrintPricingRule[];
    const sized = rules.filter((r) =>
      paperSize ? r.paper_size === paperSize || r.paper_size === null : r.paper_size === null,
    );
    const pool = sized.length > 0 ? sized : rules;

    // 1) Exact quantity
    const exact = pool.find((r) => r.quantity === quantity);
    if (exact) {
      return {
        base_price: Number(exact.base_price),
        shipping_price: Number(exact.shipping_price),
        matchedQuantity: exact.quantity,
      };
    }
    // 2) Closest by smallest absolute diff
    const closest = pool.reduce((best, r) =>
      Math.abs(r.quantity - quantity) < Math.abs(best.quantity - quantity) ? r : best,
    );
    return {
      base_price: Number(closest.base_price),
      shipping_price: Number(closest.shipping_price),
      matchedQuantity: closest.quantity,
    };
  },
};
