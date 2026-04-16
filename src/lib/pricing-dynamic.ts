/**
 * Dynamic pricing engine — uses DB-backed pricing_rules.
 * 
 * Flow:
 *   1. Fetch rules from pricing_rules table (cached)
 *   2. Find matching rule by page_count range (highest priority wins)
 *   3. price = pageCount × rule.price_per_page
 *   4. If no rule matches → fallback to base_price_per_page from pricing_settings
 *   5. Round to nearest 5
 */

import { supabase } from "@/integrations/supabase/client";

interface PricingRule {
  country: string;
  paper_type: string;
  min_pages: number;
  max_pages: number;
  price_per_page: number;
  is_active: boolean;
  priority: number;
}

// ── Cache ──
let cachedRules: PricingRule[] | null = null;
let cachedBasePrice: number = 1;
let cacheTs = 0;
const CACHE_TTL = 60_000; // 1 min

async function loadPricingData() {
  if (cachedRules && Date.now() - cacheTs < CACHE_TTL) return;

  const [rulesRes, settingsRes] = await Promise.all([
    supabase.from("pricing_rules").select("country,paper_type,min_pages,max_pages,price_per_page,is_active,priority").eq("is_active", true),
    supabase.from("pricing_settings").select("value").eq("key", "base_price_per_page").single(),
  ]);

  cachedRules = (rulesRes.data as unknown as PricingRule[]) || [];
  if (settingsRes.data) {
    cachedBasePrice = (settingsRes.data.value as any)?.value ?? 1;
  }
  cacheTs = Date.now();
}

export function invalidatePricingCache() {
  cachedRules = null;
  cacheTs = 0;
}

function roundToNearest5(n: number): number {
  return Math.round(n / 5) * 5;
}

export interface PriceSuggestion {
  suggestedPrice: number;
  matchedRule: { country: string; paper_type: string; price_per_page: number } | null;
  breakdown: {
    pageCount: number;
    pricePerPage: number;
    rawPrice: number;
    source: "rule" | "base";
  };
}

/**
 * Calculate price for a book using dynamic rules.
 * Call with await — it may need to fetch rules from DB.
 */
export async function calculateDynamicPrice(
  pageCount: number | null | undefined,
  country = "MA",
  paperType = "standard"
): Promise<PriceSuggestion | null> {
  if (!pageCount || pageCount <= 0) return null;

  await loadPricingData();

  // Find best matching rule (highest priority)
  const matching = (cachedRules || [])
    .filter(r => 
      r.is_active &&
      pageCount >= r.min_pages &&
      pageCount <= r.max_pages &&
      (r.country === country || r.country === "ALL") &&
      (r.paper_type === paperType || r.paper_type === "all")
    )
    .sort((a, b) => b.priority - a.priority);

  const rule = matching[0];
  const pricePerPage = rule ? rule.price_per_page : cachedBasePrice;
  const rawPrice = pageCount * pricePerPage;
  const suggestedPrice = Math.max(0, roundToNearest5(rawPrice));

  return {
    suggestedPrice,
    matchedRule: rule ? { country: rule.country, paper_type: rule.paper_type, price_per_page: rule.price_per_page } : null,
    breakdown: {
      pageCount,
      pricePerPage,
      rawPrice: Math.round(rawPrice * 100) / 100,
      source: rule ? "rule" : "base",
    },
  };
}

/**
 * Synchronous version using cached data only (for display).
 * Returns null if cache is empty — caller should await calculateDynamicPrice first.
 */
export function calculatePriceCached(
  pageCount: number | null | undefined,
  country = "MA",
  paperType = "standard"
): PriceSuggestion | null {
  if (!pageCount || pageCount <= 0 || !cachedRules) return null;

  const matching = cachedRules
    .filter(r =>
      r.is_active &&
      pageCount >= r.min_pages &&
      pageCount <= r.max_pages &&
      (r.country === country || r.country === "ALL") &&
      (r.paper_type === paperType || r.paper_type === "all")
    )
    .sort((a, b) => b.priority - a.priority);

  const rule = matching[0];
  const pricePerPage = rule ? rule.price_per_page : cachedBasePrice;
  const rawPrice = pageCount * pricePerPage;
  const suggestedPrice = Math.max(0, roundToNearest5(rawPrice));

  return {
    suggestedPrice,
    matchedRule: rule ? { country: rule.country, paper_type: rule.paper_type, price_per_page: rule.price_per_page } : null,
    breakdown: {
      pageCount,
      pricePerPage,
      rawPrice: Math.round(rawPrice * 100) / 100,
      source: rule ? "rule" : "base",
    },
  };
}

// Keep the old static function as a legacy export
export { calculateSuggestedPrice } from "./pricing-static";
