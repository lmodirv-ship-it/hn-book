/**
 * Book Service — abstracts all book/product CRUD.
 * 
 * Import: import { bookService } from "@/services/bookService"
 * Migration: change only the implementation here, UI stays the same.
 */

import { db, ok, fail, type ApiResult } from "@/api/client";
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
    shortDescription: row.short_description ?? "",
    price: Number(row.price),
    originalPrice: row.original_price ? Number(row.original_price) : undefined,
    category: row.category,
    image: row.image ?? "",
    features: row.features ?? [],
    badge: row.badge ?? undefined,
    isFlashDeal: row.is_flash_deal ?? false,
    dealEndsIn: row.deal_ends_in ?? undefined,
    referenceCode: row.reference_code ?? undefined,
    pdfUrl: row.pdf_url && row.pdf_url.trim() ? row.pdf_url : undefined,
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
  async getAll(filter?: BookFilter): Promise<ApiResult<Book[]>> {
    let query = db.from("products").select("*").order("created_at", { ascending: false });
    if (filter?.category && filter.category !== "all") query = query.eq("category", filter.category);
    if (filter?.search) query = query.or(`name.ilike.%${filter.search}%,category.ilike.%${filter.search}%`);
    if (filter?.limit) query = query.limit(filter.limit);
    if (filter?.offset) query = query.range(filter.offset, filter.offset + (filter?.limit ?? 50) - 1);

    const { data, error } = await query;
    if (error) return fail(error.message);
    return ok((data || []).map(mapRow));
  },

  async getById(id: string): Promise<ApiResult<Book>> {
    const { data, error } = await db.from("products").select("*").eq("id", id).single();
    if (error) return fail(error.message);
    return ok(mapRow(data));
  },

  async create(input: BookCreateInput): Promise<ApiResult<Book>> {
    const dbInput = toDb(input) as any;
    const { data, error } = await db.from("products").insert(dbInput).select().single();
    if (error) return fail(error.message);
    return ok(mapRow(data));
  },

  async update(id: string, input: BookUpdateInput): Promise<ApiResult<Book>> {
    const dbInput = toDb(input) as any;
    const { data, error } = await db.from("products").update(dbInput).eq("id", id).select().single();
    if (error) return fail(error.message);
    return ok(mapRow(data));
  },

  async delete(id: string): Promise<ApiResult<null>> {
    const { error } = await db.from("products").delete().eq("id", id);
    if (error) return fail(error.message);
    return ok(null);
  },

  async getCategories(): Promise<ApiResult<string[]>> {
    const { data, error } = await db.from("products").select("category").order("category");
    if (error) return fail(error.message);
    return ok([...new Set((data || []).map((r) => r.category))]);
  },

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
