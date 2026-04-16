/**
 * Order Service — handles creating orders and order items.
 */

import { db, ok, fail, type ApiResult } from "@/api/client";

export interface CreateOrderInput {
  items: { bookId: string; price: number }[];
  totalAmount: number;
  shippingName: string;
  shippingEmail: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCountry: string;
  paymentMethod: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

function generateOrderNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `HN-${y}${m}${d}-${rand}`;
}

export const orderService = {
  async createOrder(input: CreateOrderInput): Promise<ApiResult<Order>> {
    const { data: { session } } = await db.auth.getSession();
    if (!session?.user) return fail("يجب تسجيل الدخول أولاً");

    const orderNumber = generateOrderNumber();

    // Create order
    const { data: order, error: orderErr } = await db
      .from("orders")
      .insert({
        order_number: orderNumber,
        user_id: session.user.id,
        total_amount: input.totalAmount,
        amount: input.totalAmount,
        status: "pending" as any,
        shipping_name: input.shippingName,
        shipping_email: input.shippingEmail,
        shipping_phone: input.shippingPhone,
        shipping_address: input.shippingAddress,
        shipping_country: input.shippingCountry,
        payment_method: input.paymentMethod,
      } as any)
      .select()
      .single();

    if (orderErr) return fail(orderErr.message);

    // Create order items
    const orderItems = input.items.map((item) => ({
      order_id: (order as any).id,
      book_id: item.bookId,
      price: item.price,
    }));

    const { error: itemsErr } = await db
      .from("order_items")
      .insert(orderItems as any);

    if (itemsErr) return fail(itemsErr.message);

    return ok({
      id: (order as any).id,
      orderNumber: (order as any).order_number,
      totalAmount: Number((order as any).total_amount || (order as any).amount),
      status: (order as any).status,
      createdAt: (order as any).created_at,
    });
  },

  async getMyOrders(): Promise<ApiResult<any[]>> {
    const { data: { session } } = await db.auth.getSession();
    if (!session?.user) return ok([]);

    const { data, error } = await db
      .from("orders")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) return fail(error.message);
    return ok(data || []);
  },

  async getOrderItems(orderId: string): Promise<ApiResult<any[]>> {
    const { data, error } = await db
      .from("order_items")
      .select("*, products(name, image, category)")
      .eq("order_id", orderId);

    if (error) return fail(error.message);
    return ok(data || []);
  },
};
