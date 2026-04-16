/**
 * Access Control Service — determines who can read/download books.
 * 
 * Import: import { accessService } from "@/services/accessService"
 * 
 * Rules:
 *   - Free book (price === 0) → everyone can access
 *   - User purchased the book → can access
 *   - User has active subscription → can access all books
 *   - Otherwise → blocked (show paywall)
 */

import { db, ok, fail, type ApiResult } from "@/api/client";

export interface AccessResult {
  canAccess: boolean;
  reason: "free" | "purchased" | "subscribed" | "blocked";
  isLoggedIn: boolean;
}

export interface Purchase {
  id: string;
  userId: string;
  bookId: string;
  amount: number;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: string;
  status: "active" | "expired" | "cancelled";
  startDate: string;
  endDate: string;
  createdAt: string;
}

export const accessService = {
  /**
   * Check if the current user can access a book.
   */
  async canAccessBook(bookId: string, bookPrice: number): Promise<AccessResult> {
    // Free books are always accessible
    if (bookPrice === 0) {
      return { canAccess: true, reason: "free", isLoggedIn: false };
    }

    // Check if user is logged in
    const { data: { session } } = await db.auth.getSession();
    if (!session?.user) {
      return { canAccess: false, reason: "blocked", isLoggedIn: false };
    }

    const userId = session.user.id;

    // Admins can access all books
    const { data: adminRole } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (adminRole) {
      return { canAccess: true, reason: "subscribed", isLoggedIn: true };
    }

    // Check purchase and subscription in parallel
    const [purchaseRes, subRes] = await Promise.all([
      db.from("purchases").select("id").eq("user_id", userId).eq("book_id", bookId).maybeSingle(),
      db.from("subscriptions").select("id, status, end_date").eq("user_id", userId).eq("status", "active").gte("end_date", new Date().toISOString()).maybeSingle(),
    ]);

    if (purchaseRes.data) {
      return { canAccess: true, reason: "purchased", isLoggedIn: true };
    }

    if (subRes.data) {
      return { canAccess: true, reason: "subscribed", isLoggedIn: true };
    }

    return { canAccess: false, reason: "blocked", isLoggedIn: true };
  },

  /**
   * Purchase a book for the current user.
   */
  async purchaseBook(bookId: string, amount: number): Promise<ApiResult<Purchase>> {
    const { data: { session } } = await db.auth.getSession();
    if (!session?.user) return fail("يجب تسجيل الدخول أولاً");

    const { data, error } = await db
      .from("purchases")
      .insert({ user_id: session.user.id, book_id: bookId, amount } as any)
      .select()
      .single();

    if (error) {
      if (error.message.includes("duplicate") || error.message.includes("unique")) {
        return fail("تم شراء هذا الكتاب بالفعل");
      }
      return fail(error.message);
    }

    return ok({
      id: data.id,
      userId: data.user_id,
      bookId: data.book_id,
      amount: Number(data.amount),
      createdAt: data.created_at,
    });
  },

  /**
   * Create a subscription for the current user.
   */
  async subscribe(plan: "monthly" | "yearly"): Promise<ApiResult<Subscription>> {
    const { data: { session } } = await db.auth.getSession();
    if (!session?.user) return fail("يجب تسجيل الدخول أولاً");

    const now = new Date();
    const endDate = new Date(now);
    if (plan === "monthly") {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    const { data, error } = await db
      .from("subscriptions")
      .insert({
        user_id: session.user.id,
        plan,
        status: "active",
        start_date: now.toISOString(),
        end_date: endDate.toISOString(),
      } as any)
      .select()
      .single();

    if (error) return fail(error.message);

    return ok({
      id: data.id,
      userId: data.user_id,
      plan: data.plan,
      status: data.status as any,
      startDate: data.start_date,
      endDate: data.end_date,
      createdAt: data.created_at,
    });
  },

  /**
   * Get all purchases for current user.
   */
  async getMyPurchases(): Promise<ApiResult<Purchase[]>> {
    const { data: { session } } = await db.auth.getSession();
    if (!session?.user) return ok([]);

    const { data, error } = await db
      .from("purchases")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) return fail(error.message);
    return ok((data || []).map((p: any) => ({
      id: p.id,
      userId: p.user_id,
      bookId: p.book_id,
      amount: Number(p.amount),
      createdAt: p.created_at,
    })));
  },

  /**
   * Get active subscription for current user.
   */
  async getMySubscription(): Promise<ApiResult<Subscription | null>> {
    const { data: { session } } = await db.auth.getSession();
    if (!session?.user) return ok(null);

    const { data, error } = await db
      .from("subscriptions")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("status", "active")
      .gte("end_date", new Date().toISOString())
      .order("end_date", { ascending: false })
      .maybeSingle();

    if (error) return fail(error.message);
    if (!data) return ok(null);

    return ok({
      id: data.id,
      userId: data.user_id,
      plan: data.plan,
      status: data.status as any,
      startDate: data.start_date,
      endDate: data.end_date,
      createdAt: data.created_at,
    });
  },

  /**
   * Admin: Get all purchases.
   */
  async getAllPurchases(): Promise<ApiResult<any[]>> {
    const { data, error } = await db
      .from("purchases")
      .select("*, products(name, image)")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) return fail(error.message);
    return ok(data || []);
  },

  /**
   * Admin: Get all subscriptions.
   */
  async getAllSubscriptions(): Promise<ApiResult<any[]>> {
    const { data, error } = await db
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) return fail(error.message);
    return ok(data || []);
  },
};
