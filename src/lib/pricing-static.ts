/**
 * Smart pricing engine for books.
 * 
 * Formula:
 *   base = pageCount × perPageRate
 *   adjusted = base × categoryMultiplier
 *   final = roundToNearest5(adjusted), clamped to [minPrice, maxPrice]
 */

const PER_PAGE_RATE = 0.15; // dirham per page
const MIN_PRICE = 0;
const MAX_PRICE = 500;

/** Category multipliers — higher for specialized content */
const CATEGORY_MULTIPLIERS: Record<string, number> = {
  "الطب": 1.8,
  "العلوم": 1.5,
  "الدين الإسلامي": 1.0,
  "التاريخ": 1.2,
  "الأدب العربي": 1.1,
  "تطوير الذات": 1.3,
  "كتب": 1.0,
  "أخرى": 1.0,
  "Literature": 1.2,
  "Philosophy": 1.3,
  "Biography & Autobiography": 1.2,
  "Arabic literature": 1.1,
};

function roundToNearest5(n: number): number {
  return Math.round(n / 5) * 5;
}

export interface PriceSuggestion {
  suggestedPrice: number;
  breakdown: {
    pageCount: number;
    perPageRate: number;
    categoryMultiplier: number;
    rawPrice: number;
  };
}

export function calculateSuggestedPrice(
  pageCount: number | null | undefined,
  category: string
): PriceSuggestion | null {
  if (!pageCount || pageCount <= 0) return null;

  const multiplier = CATEGORY_MULTIPLIERS[category] ?? 1.0;
  const rawPrice = pageCount * PER_PAGE_RATE * multiplier;
  const suggestedPrice = Math.min(MAX_PRICE, Math.max(MIN_PRICE, roundToNearest5(rawPrice)));

  return {
    suggestedPrice,
    breakdown: {
      pageCount,
      perPageRate: PER_PAGE_RATE,
      categoryMultiplier: multiplier,
      rawPrice: Math.round(rawPrice * 100) / 100,
    },
  };
}

/**
 * Same logic for Deno edge functions (copy-safe, no imports).
 */
export function calculatePriceSimple(pageCount: number, category: string): number {
  const multipliers: Record<string, number> = {
    "الطب": 1.8, "العلوم": 1.5, "الدين الإسلامي": 1.0,
    "التاريخ": 1.2, "الأدب العربي": 1.1, "تطوير الذات": 1.3,
    "كتب": 1.0, "أخرى": 1.0, "Literature": 1.2,
    "Philosophy": 1.3, "Biography & Autobiography": 1.2, "Arabic literature": 1.1,
  };
  const m = multipliers[category] ?? 1.0;
  const raw = pageCount * 0.15 * m;
  return Math.min(500, Math.max(0, Math.round(raw / 5) * 5));
}
