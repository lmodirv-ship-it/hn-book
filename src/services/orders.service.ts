/**
 * Orders Service — abstracts order operations.
 * Currently backed by Supabase via Lovable Cloud.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Order, OrderCreateInput, OrderStatus, ServiceResult } from "./types";

function mapRow(row: any): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerId: row.customer_id ?? undefined,
    productId: row.product_id ?? undefined,
    amount: Number(row.amount),
    status: row.status as OrderStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customerName: row.customers?.name,
    productName: row.products?.name,
  };
}

export const ordersService = {
  async getAll(): Promise<ServiceResult<Order[]>> {
    const { data, error } = await supabase
      .from("orders")
      .select("*, customers(name), products(name)")
      .order("created_at", { ascending: false });
    if (error) return { data: null, error: error.message };
    return { data: (data || []).map(mapRow), error: null };
  },

  async create(input: OrderCreateInput): Promise<ServiceResult<Order>> {
    const { data, error } = await supabase
      .from("orders")
      .insert({
        order_number: input.orderNumber,
        customer_id: input.customerId,
        product_id: input.productId,
        amount: input.amount,
        status: input.status ?? "pending",
      })
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    return { data: mapRow(data), error: null };
  },

  async updateStatus(id: string, status: OrderStatus): Promise<ServiceResult<null>> {
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id);
    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  },

  async delete(id: string): Promise<ServiceResult<null>> {
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  },
};
