/**
 * Recommendation Service — suggests books based on category, popularity, and recency.
 */
import { db, ok, fail, type ApiResult } from "@/api/client";
import { mapProductRowToProduct } from "@/lib/product-utils";
import type { Product } from "@/lib/products";

export const recommendationService = {
  /** Admin-curated picks by type */
  async getManual(type: string, limit = 8): Promise<ApiResult<Product[]>> {
    const { data: recs, error: recErr } = await db
      .from("manual_recommendations")
      .select("book_id")
      .eq("type", type)
      .eq("is_active", true)
      .order("priority", { ascending: true })
      .limit(limit);

    if (recErr || !recs || recs.length === 0) return ok([]);

    const ids = recs.map((r: any) => r.book_id);
    const { data, error } = await db
      .from("products")
      .select("*")
      .eq("is_active", true)
      .in("id", ids);

    if (error) return fail(error.message);
    // Preserve priority order
    const map = new Map((data || []).map(d => [d.id, d]));
    const ordered = ids.map(id => map.get(id)).filter(Boolean);
    return ok(ordered.map(mapProductRowToProduct));
  },

  /** Books in the same category */
  async getSimilar(bookId: string, category: string, limit = 4): Promise<ApiResult<Product[]>> {
    const { data, error } = await db
      .from("products")
      .select("*")
      .eq("is_active", true)
      .eq("category", category)
      .neq("id", bookId)
      .limit(limit);

    if (error) return fail(error.message);
    return ok((data || []).map(mapProductRowToProduct));
  },

  /** Most purchased books (popular) */
  async getPopular(limit = 8): Promise<ApiResult<Product[]>> {
    // Use purchase count as a popularity signal
    const { data: purchaseData } = await db
      .from("purchases")
      .select("book_id");

    const counts: Record<string, number> = {};
    (purchaseData || []).forEach((p: any) => {
      counts[p.book_id] = (counts[p.book_id] || 0) + 1;
    });

    const topIds = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    if (topIds.length === 0) {
      // Fallback: newest books
      return this.getNewest(limit);
    }

    const { data, error } = await db
      .from("products")
      .select("*")
      .eq("is_active", true)
      .in("id", topIds);

    if (error) return fail(error.message);
    return ok((data || []).map(mapProductRowToProduct));
  },

  /** Newest books */
  async getNewest(limit = 8): Promise<ApiResult<Product[]>> {
    const { data, error } = await db
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return fail(error.message);
    return ok((data || []).map(mapProductRowToProduct));
  },

  /** Personalized: based on user's purchased categories */
  async getForUser(userId: string, limit = 8): Promise<ApiResult<Product[]>> {
    const { data: purchases } = await db
      .from("purchases")
      .select("book_id")
      .eq("user_id", userId);

    if (!purchases || purchases.length === 0) {
      return this.getPopular(limit);
    }

    const purchasedIds = purchases.map((p: any) => p.book_id);

    // Get categories of purchased books
    const { data: purchasedBooks } = await db
      .from("products")
      .select("category")
      .in("id", purchasedIds);

    const categories = [...new Set((purchasedBooks || []).map((b: any) => b.category))];

    if (categories.length === 0) return this.getPopular(limit);

    const { data, error } = await db
      .from("products")
      .select("*")
      .eq("is_active", true)
      .in("category", categories)
      .not("id", "in", `(${purchasedIds.join(",")})`)
      .limit(limit);

    if (error) return this.getPopular(limit);
    if (!data || data.length === 0) return this.getPopular(limit);
    return ok(data.map(mapProductRowToProduct));
  },
};
