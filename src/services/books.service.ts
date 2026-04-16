/**
 * Books Service — abstracts all book/product CRUD operations.
 * Currently backed by Supabase (products table) via Lovable Cloud.
 * To migrate: replace the implementation, keep the interface.
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  Book,
  BookCreateInput,
  BookUpdateInput,
  BookFilter,
  ServiceResult,
} from "./types";

// ─── Mappers (internal) ─────────────────────────────────────

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

function toDbInput(input: BookCreateInput | BookUpdateInput): Record<string, any> {
  const map: Record<string, any> = {};
  if ("name" in input && input.name !== undefined) map.name = input.name;
  if ("description" in input && input.description !== undefined) map.description = input.description;
  if ("shortDescription" in input && input.shortDescription !== undefined) map.short_description = input.shortDescription;
  if ("price" in input && input.price !== undefined) map.price = input.price;
  if ("originalPrice" in input && input.originalPrice !== undefined) map.original_price = input.originalPrice;
  if ("category" in input && input.category !== undefined) map.category = input.category;
  if ("image" in input && input.image !== undefined) map.image = input.image;
  if ("features" in input && input.features !== undefined) map.features = input.features;
  if ("badge" in input && input.badge !== undefined) map.badge = input.badge;
  if ("isFlashDeal" in input && input.isFlashDeal !== undefined) map.is_flash_deal = input.isFlashDeal;
  if ("pdfUrl" in input && input.pdfUrl !== undefined) map.pdf_url = input.pdfUrl;
  if ("isActive" in input && (input as BookUpdateInput).isActive !== undefined) map.is_active = (input as BookUpdateInput).isActive;
  return map;
}

// ─── Service ─────────────────────────────────────────────────

export const booksService = {
  /** Get all books with optional filtering */
  async getAll(filter?: BookFilter): Promise<ServiceResult<Book[]>> {
    let query = supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (filter?.category && filter.category !== "all") {
      query = query.eq("category", filter.category);
    }
    if (filter?.search) {
      query = query.or(`name.ilike.%${filter.search}%,category.ilike.%${filter.search}%`);
    }
    if (filter?.limit) {
      query = query.limit(filter.limit);
    }
    if (filter?.offset) {
      query = query.range(filter.offset, filter.offset + (filter?.limit ?? 50) - 1);
    }

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data: (data || []).map(mapRow), error: null };
  },

  /** Get a single book by ID */
  async getById(id: string): Promise<ServiceResult<Book>> {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return { data: null, error: error.message };
    return { data: mapRow(data), error: null };
  },

  /** Create a new book */
  async create(input: BookCreateInput): Promise<ServiceResult<Book>> {
    const dbInput = toDbInput(input) as any;
    const { data, error } = await supabase
      .from("products")
      .insert(dbInput)
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    return { data: mapRow(data), error: null };
  },

  /** Update an existing book */
  async update(id: string, input: BookUpdateInput): Promise<ServiceResult<Book>> {
    const dbInput = toDbInput(input) as any;
    const { data, error } = await supabase
      .from("products")
      .update(dbInput)
      .eq("id", id)
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    return { data: mapRow(data), error: null };
  },

  /** Delete a book */
  async delete(id: string): Promise<ServiceResult<null>> {
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);
    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  },

  /** Get distinct categories */
  async getCategories(): Promise<ServiceResult<string[]>> {
    const { data, error } = await supabase
      .from("products")
      .select("category")
      .order("category");
    if (error) return { data: null, error: error.message };
    const unique = [...new Set((data || []).map((r) => r.category))];
    return { data: unique, error: null };
  },

  /** Get books that have PDF files */
  async getBooksWithPdf(): Promise<ServiceResult<Book[]>> {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .not("pdf_url", "is", null)
      .neq("pdf_url", "")
      .order("created_at", { ascending: false });
    if (error) return { data: null, error: error.message };
    return { data: (data || []).map(mapRow), error: null };
  },
};
