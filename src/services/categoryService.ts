/**
 * Category Service — dynamic category CRUD
 */

import { db, ok, fail, type ApiResult } from "@/api/client";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryCreateInput {
  name: string;
  description?: string;
  parentId?: string;
  sortOrder?: number;
}

export interface CategoryUpdateInput extends Partial<CategoryCreateInput> {
  isActive?: boolean;
}

function mapRow(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    parentId: row.parent_id ?? undefined,
    sortOrder: row.sort_order ?? 0,
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const categoryService = {
  async getAll(): Promise<ApiResult<Category[]>> {
    const { data, error } = await db
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .order("name");
    if (error) return fail(error.message);
    return ok((data || []).map(mapRow));
  },

  async getAllIncludingInactive(): Promise<ApiResult<Category[]>> {
    const { data, error } = await db
      .from("categories")
      .select("*")
      .order("sort_order")
      .order("name");
    if (error) return fail(error.message);
    return ok((data || []).map(mapRow));
  },

  async create(input: CategoryCreateInput): Promise<ApiResult<Category>> {
    const dbInput: Record<string, any> = { name: input.name };
    if (input.description) dbInput.description = input.description;
    if (input.parentId) dbInput.parent_id = input.parentId;
    if (input.sortOrder !== undefined) dbInput.sort_order = input.sortOrder;

    const { data, error } = await db.from("categories").insert(dbInput as any).select().single();
    if (error) return fail(error.message);
    return ok(mapRow(data));
  },

  async update(id: string, input: CategoryUpdateInput): Promise<ApiResult<Category>> {
    const dbInput: Record<string, any> = {};
    if (input.name !== undefined) dbInput.name = input.name;
    if (input.description !== undefined) dbInput.description = input.description;
    if (input.parentId !== undefined) dbInput.parent_id = input.parentId;
    if (input.sortOrder !== undefined) dbInput.sort_order = input.sortOrder;
    if (input.isActive !== undefined) dbInput.is_active = input.isActive;

    const { data, error } = await db.from("categories").update(dbInput as any).eq("id", id).select().single();
    if (error) return fail(error.message);
    return ok(mapRow(data));
  },

  async delete(id: string): Promise<ApiResult<null>> {
    const { error } = await db.from("categories").delete().eq("id", id);
    if (error) return fail(error.message);
    return ok(null);
  },

  /** Find or create a category by name */
  async findOrCreate(name: string): Promise<ApiResult<Category>> {
    const { data: existing } = await db
      .from("categories")
      .select("*")
      .eq("name", name)
      .maybeSingle();
    
    if (existing) return ok(mapRow(existing));
    return this.create({ name });
  },
};
