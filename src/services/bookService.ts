/**
 * Book Service — abstracts all book/product CRUD.
 * 
 * Import: import { bookService } from "@/services/bookService"
 * 
 * Uses apiClient for REST-ready calls + db for current Supabase queries.
 * Migration: remove db calls, uncomment apiClient alternatives.
 */

import { db, apiClient, ok, fail, type ApiResult } from "@/api/client";
import type {
  Book,
  BookCreateInput,
  BookUpdateInput,
  BookFilter,
} from "./types";

const QUERY_TIMEOUT_MS = 5000;

function createAbortController(timeoutMs = QUERY_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  return {
    controller,
    clear: () => window.clearTimeout(timeoutId),
  };
}

function buildProductsRestUrl(filter?: BookFilter, maxLimit = 100) {
  const limit = Math.max(1, Math.min(filter?.limit ?? 50, maxLimit));
  const offset = Math.max(filter?.offset ?? 0, 0);
  const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/products`);

  url.searchParams.set("select", "id,name,description,short_description,price,original_price,category,image,badge,is_flash_deal,deal_ends_in,reference_code,pdf_url,slug");
  url.searchParams.set("order", "created_at.desc");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));

  // Only show books with valid PDF and cover image
  url.searchParams.append("pdf_url", "not.is.null");
  url.searchParams.append("pdf_url", "neq.");
  url.searchParams.append("image", "not.is.null");
  url.searchParams.append("image", "neq.");

  // Apply category filter
  if (filter?.category && filter.category !== "all") {
    url.searchParams.set("category", `eq.${filter.category}`);
  } else if (filter?.language === "ar") {
    url.searchParams.set("category", `in.(الطب,التاريخ,العلوم,الأدب العربي,الدين الإسلامي,كتب,تطوير الذات,أخرى)`);
  } else if (filter?.language === "en") {
    url.searchParams.set("category", `in.(Literature,Arabic literature,Philosophy,Biography & Autobiography)`);
  }

  if (filter?.search?.trim()) {
    const escapedSearch = filter.search.trim().replace(/[,%]/g, " ");
    url.searchParams.set("or", `(name.ilike.*${escapedSearch}*,category.ilike.*${escapedSearch}*)`);
  }

  return { url: url.toString(), limit, offset };
}

// ─── Cache ───────────────────────────────────────────────────

const cache = new Map<string, { data: ApiResult<Book[]>; ts: number }>();
const CACHE_TTL_MS = 30_000; // 30 seconds

function cacheKey(filter?: BookFilter): string {
  return `${filter?.limit ?? 50}:${filter?.offset ?? 0}:${filter?.search ?? ""}:${filter?.category ?? ""}:${filter?.language ?? ""}`;
}

/** Clear all cached book queries — call after creating/updating books */
export function invalidateBookCache() {
  cache.clear();
}

async function fetchProductsViaRest(filter?: BookFilter): Promise<ApiResult<Book[]>> {
  const key = cacheKey(filter);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }
  const { url, limit, offset } = buildProductsRestUrl(filter, 100);
  const { controller, clear } = createAbortController();

  try {
    console.log("[bookService.getAll] REST fallback request", { limit, offset, url });

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("[bookService.getAll] REST fallback failed", {
        status: response.status,
        body,
      });
      return fail(`REST fallback failed: ${response.status}`);
    }

    const data = await response.json();

    console.log("[bookService.getAll] REST fallback success", {
      limit,
      offset,
      count: Array.isArray(data) ? data.length : 0,
    });

    const result = ok((Array.isArray(data) ? data : []).map(mapRow));
    cache.set(key, { data: result, ts: Date.now() });
    return result;
  } catch (error) {
    console.error("[bookService.getAll] REST fallback unexpected error", error);
    return fail(error instanceof Error ? error.message : "Failed to fetch books");
  } finally {
    clear();
  }
}

// ─── Mappers ─────────────────────────────────────────────────

function mapRow(row: any): Book {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    shortDescription: row.short_description ?? row.shortDescription ?? "",
    price: Number(row.price),
    originalPrice: row.original_price ?? row.originalPrice ? Number(row.original_price ?? row.originalPrice) : undefined,
    category: row.category,
    image: row.image ?? "",
    features: row.features ?? [],
    badge: row.badge ?? undefined,
    isFlashDeal: row.is_flash_deal ?? row.isFlashDeal ?? false,
    dealEndsIn: row.deal_ends_in ?? row.dealEndsIn ?? undefined,
    referenceCode: row.reference_code ?? row.referenceCode ?? undefined,
    pdfUrl: (row.pdf_url ?? row.pdfUrl) && (row.pdf_url ?? row.pdfUrl).trim() ? (row.pdf_url ?? row.pdfUrl) : undefined,
    slug: row.slug ?? undefined,
    isActive: row.is_active ?? row.isActive ?? true,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  };
}

function toDb(input: BookCreateInput | BookUpdateInput): Record<string, any> {
  const m: Record<string, any> = {};
  if ("name" in input && input.name !== undefined) m.name = input.name;
  if ("description" in input && input.description !== undefined) m.description = input.description;
  if ("shortDescription" in input && input.shortDescription !== undefined) m.short_description = input.shortDescription;
  if ("price" in input && input.price !== undefined) m.price = input.price;
  if ("originalPrice" in input && input.originalPrice !== undefined) m.original_price = input.originalPrice;
  if ("category" in input && input.category !== undefined) m.category = input.category;
  if ("image" in input && input.image !== undefined) m.image = input.image;
  if ("features" in input && input.features !== undefined) m.features = input.features;
  if ("badge" in input && input.badge !== undefined) m.badge = input.badge;
  if ("isFlashDeal" in input && input.isFlashDeal !== undefined) m.is_flash_deal = input.isFlashDeal;
  if ("pdfUrl" in input && input.pdfUrl !== undefined) m.pdf_url = input.pdfUrl;
  if ("referenceCode" in input && input.referenceCode !== undefined) m.reference_code = input.referenceCode;
  if ("isActive" in input && (input as BookUpdateInput).isActive !== undefined) m.is_active = (input as BookUpdateInput).isActive;
  return m;
}

// ─── Service ─────────────────────────────────────────────────

export const bookService = {
  /** Get all books with optional filtering */
  async getAll(filter?: BookFilter): Promise<ApiResult<Book[]>> {
    return fetchProductsViaRest(filter);

    // ── Future: REST API ──
    // const params = new URLSearchParams();
    // if (filter?.category && filter.category !== "all") params.set("category", filter.category);
    // if (filter?.search) params.set("search", filter.search);
    // if (filter?.limit) params.set("limit", String(filter.limit));
    // if (filter?.offset) params.set("offset", String(filter.offset));
    // const books = await apiClient.get<any[]>(`/books?${params}`);
    // return ok(books.map(mapRow));
  },

  /** Get a single book by ID */
  async getById(id: string): Promise<ApiResult<Book>> {
    const { data, error } = await db.from("products").select("*").eq("id", id).maybeSingle();
    if (error) return fail(error.message);
    if (!data) return fail("الكتاب غير موجود");
    return ok(mapRow(data));
  },

  /** Get a single book by slug, falling back to reference_code */
  async getBySlug(slug: string): Promise<ApiResult<Book>> {
    // Try slug first
    const { data, error } = await db.from("products").select("*").eq("slug", slug).maybeSingle();
    if (error) return fail(error.message);
    if (data) return ok(mapRow(data));

    // Fallback: try reference_code (case-insensitive: hnb-9669 → HNB-9669)
    const upper = slug.toUpperCase();
    const { data: refData, error: refError } = await db
      .from("products")
      .select("*")
      .ilike("reference_code", upper)
      .maybeSingle();
    if (refError) return fail(refError.message);
    if (!refData) return fail("الكتاب غير موجود");
    return ok(mapRow(refData));
  },

  /** Create a new book */
  async create(input: BookCreateInput): Promise<ApiResult<Book>> {
    if (!input.name?.trim()) return fail("اسم الكتاب مطلوب");
    // DB trigger enforces: name, pdf_url, image NOT NULL
    const dbInput = toDb(input) as any;
    const { data, error } = await db.from("products").insert(dbInput).select().single();
    if (error) {
      if (error.message.includes("pdf_url")) return fail("ملف PDF مطلوب — يرجى رفع ملف PDF");
      if (error.message.includes("image")) return fail("صورة الغلاف مطلوبة — يرجى رفع صورة");
      return fail(error.message);
    }
    return ok(mapRow(data));
  },

  /** Upload a book with file (FormData) */
  async upload(formData: FormData): Promise<ApiResult<Book>> {
    // ── Future: REST API (primary method) ──
    // const res = await fetch(`${API_BASE}/books`, { method: "POST", body: formData });
    // if (!res.ok) return fail("Upload failed");
    // const book = await res.json();
    // return ok(mapRow(book));

    // ── Current: handled by admin upload components directly ──
    return fail("Use admin upload components for file uploads");
  },

  /** Update an existing book */
  async update(id: string, input: BookUpdateInput): Promise<ApiResult<Book>> {
    // ── Current: Supabase ──
    const dbInput = toDb(input) as any;
    const { data, error } = await db.from("products").update(dbInput).eq("id", id).select().single();
    if (error) return fail(error.message);
    return ok(mapRow(data));

    // ── Future: REST API ──
    // const book = await apiClient.put(`/books/${id}`, input);
    // return ok(mapRow(book));
  },

  /** Delete a book */
  async delete(id: string): Promise<ApiResult<null>> {
    // ── Current: Supabase ──
    const { error } = await db.from("products").delete().eq("id", id);
    if (error) return fail(error.message);
    return ok(null);

    // ── Future: REST API ──
    // await apiClient.del(`/books/${id}`);
    // return ok(null);
  },

  /** Get total count of products (with optional category filter) */
  async getCount(filter?: BookFilter): Promise<ApiResult<number>> {
    const { controller, clear } = createAbortController();
    try {
      const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/products`);
      url.searchParams.set("select", "*");
      // Only count books with valid PDF and cover
      url.searchParams.append("pdf_url", "not.is.null");
      url.searchParams.append("pdf_url", "neq.");
      url.searchParams.append("image", "not.is.null");
      url.searchParams.append("image", "neq.");
      if (filter?.category && filter.category !== "all") {
        url.searchParams.set("category", `eq.${filter.category}`);
      } else if (filter?.language === "ar") {
        url.searchParams.set("category", `in.(الطب,التاريخ,العلوم,الأدب العربي,الدين الإسلامي,كتب,تطوير الذات,أخرى)`);
      } else if (filter?.language === "en") {
        url.searchParams.set("category", `in.(Literature,Arabic literature,Philosophy,Biography & Autobiography)`);
      }
      if (filter?.search?.trim()) {
        const s = filter.search.trim().replace(/[,%]/g, " ");
        url.searchParams.set("or", `(name.ilike.*${s}*,category.ilike.*${s}*)`);
      }

      const response = await fetch(url.toString(), {
        method: "HEAD",
        signal: controller.signal,
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          Prefer: "count=exact",
        },
      });
      const total = parseInt(response.headers.get("content-range")?.split("/")?.[1] ?? "0", 10);
      return ok(total);
    } catch (error) {
      console.error("[bookService.getCount] error", error);
      return fail(error instanceof Error ? error.message : "Failed to count books");
    } finally {
      clear();
    }
  },

  /** Get distinct categories */
  async getCategories(): Promise<ApiResult<string[]>> {
    const { data, error } = await db.from("products").select("category").order("category");
    if (error) return fail(error.message);
    return ok([...new Set((data || []).map((r) => r.category))]);
  },

  /** Get books that have PDF files */
  async getBooksWithPdf(): Promise<ApiResult<Book[]>> {
    const { data, error } = await db
      .from("products")
      .select("*")
      .not("pdf_url", "is", null)
      .neq("pdf_url", "")
      .order("created_at", { ascending: false });
    if (error) return fail(error.message);
    return ok((data || []).map(mapRow));
  },
};
