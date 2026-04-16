/**
 * Coupon Service — validates and applies discount coupons.
 */
import { db, ok, fail, type ApiResult } from "@/api/client";

export interface CouponValidation {
  isValid: boolean;
  discountAmount: number;
  discountType: string;
  discountValue: number;
  code: string;
  message: string;
}

export const couponService = {
  async validate(code: string, orderTotal: number): Promise<ApiResult<CouponValidation>> {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return fail("أدخل رمز الكوبون");

    const { data, error } = await db
      .from("coupons")
      .select("*")
      .eq("code", trimmed)
      .eq("is_active", true)
      .maybeSingle();

    if (error) return fail("خطأ في التحقق من الكوبون");
    if (!data) return ok({ isValid: false, discountAmount: 0, discountType: "", discountValue: 0, code: trimmed, message: "كوبون غير صالح" });

    // Check expiry
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return ok({ isValid: false, discountAmount: 0, discountType: "", discountValue: 0, code: trimmed, message: "الكوبون منتهي الصلاحية" });
    }

    // Check usage limit
    if (data.max_uses > 0 && data.current_uses >= data.max_uses) {
      return ok({ isValid: false, discountAmount: 0, discountType: "", discountValue: 0, code: trimmed, message: "تم استنفاد الكوبون" });
    }

    // Check min order amount
    if (orderTotal < data.min_order_amount) {
      return ok({ isValid: false, discountAmount: 0, discountType: "", discountValue: 0, code: trimmed, message: `الحد الأدنى للطلب ${data.min_order_amount} د.م` });
    }

    // Calculate discount
    let discountAmount = 0;
    if (data.discount_type === "percentage") {
      discountAmount = (orderTotal * data.discount_value) / 100;
      if (data.max_discount && discountAmount > data.max_discount) {
        discountAmount = data.max_discount;
      }
    } else {
      discountAmount = Math.min(data.discount_value, orderTotal);
    }

    discountAmount = Math.round(discountAmount * 100) / 100;

    return ok({
      isValid: true,
      discountAmount,
      discountType: data.discount_type,
      discountValue: data.discount_value,
      code: trimmed,
      message: data.discount_type === "percentage"
        ? `خصم ${data.discount_value}%`
        : `خصم ${data.discount_value} د.م`,
    });
  },

  async incrementUsage(code: string): Promise<void> {
    await db.rpc("has_role" as any, {} as any); // no-op to keep import
    // Increment via raw update
    const { data } = await db
      .from("coupons")
      .select("current_uses")
      .eq("code", code)
      .single();
    if (data) {
      await db
        .from("coupons")
        .update({ current_uses: (data as any).current_uses + 1 } as any)
        .eq("code", code);
    }
  },
};
