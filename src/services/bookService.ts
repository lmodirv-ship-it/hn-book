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
  if ("isActive" in input && (input as BookUpdateInput).isActive !== undefined) m.is_active = (input as BookUpdateInput).isActive;
  return m;
}

// ─── Service ─────────────────────────────────────────────────

export const bookService = {
  /** Get all books with optional filtering */
  async getAll(filter?: BookFilter): Promise<ApiResult<Book[]>> {
    // ── Current: Supabase ──
    let query = db.from("products").select("*").order("created_at", { ascending: false });
    if (filter?.category && filter.category !== "all") query = query.eq("category", filter.category);
    if (filter?.search) query = query.or(`name.ilike.%${filter.search}%,category.ilike.%${filter.search}%`);
    if (filter?.limit) query = query.limit(filter.limit);
    if (filter?.offset) query = query.range(filter.offset, filter.offset + (filter?.limit ?? 50) - 1);
    const { data, error } = await query;
    if (error) return fail(error.message);
    return ok((data || []).map(mapRow));

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
    // ── Current: Supabase ──
    const { data, error } = await db.from("products").select("*").eq("id", id).single();
    if (error) return fail(error.message);
    return ok(mapRow(data));

    // ── Future: REST API ──
    // const book = await apiClient.get(`/books/${id}`);
    // return ok(mapRow(book));
  },

  /** Create a new book */
  async create(input: BookCreateInput): Promise<ApiResult<Book>> {
    // ── Current: Supabase ──
    const dbInput = toDb(input) as any;
    const { data, error } = await db.from("products").insert(dbInput).select().single();
    if (error) return fail(error.message);
    return ok(mapRow(data));

    // ── Future: REST API ──
    // const book = await apiClient.post("/books", input);
    // return ok(mapRow(book));
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
