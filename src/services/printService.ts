/**
 * Print Service — manages card templates, logos, and print orders.
 */
import { supabase } from "@/integrations/supabase/client";

export interface CardTemplate {
  id: string;
  name: string;
  image_url: string;
  category: string;
  is_active: boolean;
  created_at: string;
  layout_config?: any;
}

export interface Logo {
  id: string;
  name: string;
  image_url: string;
  category: string;
  is_active: boolean;
}

export interface PrintOrder {
  id: string;
  order_code: string;
  user_id: string | null;
  template_id: string;
  logo_id: string | null;
  quantity: number;
  paper_type: string;
  paper_size: string;        // A4 / A3
  print_type: string;
  total_price: number;
  customer_name: string;
  job_title: string;
  email: string;
  company: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  notes: string;
  status: string;
  pdf_url: string | null;
  template_design: Record<string, any> | null;
  created_at: string;
  template?: CardTemplate;
}

// Pricing logic
const BASE_PRICES: Record<number, number> = {
  100: 80,
  250: 150,
  500: 250,
  1000: 400,
};

const PAPER_MULTIPLIER: Record<string, number> = {
  standard: 1,
  premium: 1.4,
  glossy: 1.6,
};

const PRINT_MULTIPLIER: Record<string, number> = {
  one_side: 1,
  double_side: 1.5,
};

const SIZE_MULTIPLIER: Record<string, number> = {
  A4: 1,
  A3: 1.6,
};

export const calculatePrice = (
  quantity: number,
  paperType: string,
  printType: string,
  paperSize: string = "A4",
): number => {
  const base = BASE_PRICES[quantity] || Math.round(quantity * 0.45);
  const paper = PAPER_MULTIPLIER[paperType] || 1;
  const print = PRINT_MULTIPLIER[printType] || 1;
  const size = SIZE_MULTIPLIER[paperSize] || 1;
  return Math.round(base * paper * print * size);
};

export const QUANTITIES = [100, 250, 500, 1000];

export const PAPER_SIZES = [
  { value: "A4", label: "A4 — 210×297mm" },
  { value: "A3", label: "A3 — 297×420mm" },
];

export const PAPER_TYPES = [
  { value: "standard", label: "عادي", description: "ورق أبيض 300g" },
  { value: "premium", label: "فاخر", description: "ورق سميك 400g" },
  { value: "glossy", label: "لامع", description: "ورق لامع 350g" },
];

export const PRINT_TYPES = [
  { value: "one_side", label: "وجه واحد" },
  { value: "double_side", label: "وجهين" },
];

export const ORDER_STATUSES = [
  { value: "pending", label: "قيد الانتظار" },
  { value: "processing", label: "قيد المعالجة" },
  { value: "printing", label: "جاري الطباعة" },
  { value: "completed", label: "مكتمل" },
];

export const TEMPLATE_CATEGORIES = [
  { value: "business", label: "أعمال" },
  { value: "modern", label: "عصري" },
  { value: "classic", label: "كلاسيكي" },
  { value: "creative", label: "إبداعي" },
  { value: "minimal", label: "بسيط" },
];

export const LOGO_CATEGORIES = [
  { value: "general", label: "عام" },
  { value: "tech", label: "تقنية" },
  { value: "medical", label: "طبي" },
  { value: "legal", label: "قانوني" },
  { value: "education", label: "تعليم" },
];

export const printService = {
  // Templates
  async getTemplates(): Promise<CardTemplate[]> {
    const { data } = await supabase
      .from("card_templates")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false }) as any;
    return data || [];
  },

  async getTemplatesByCategory(category: string): Promise<CardTemplate[]> {
    const query = supabase
      .from("card_templates")
      .select("*")
      .eq("is_active", true);
    if (category !== "all") {
      query.eq("category", category);
    }
    const { data } = await query.order("created_at", { ascending: false }) as any;
    return data || [];
  },

  async getAllTemplates(): Promise<CardTemplate[]> {
    const { data } = await supabase
      .from("card_templates")
      .select("*")
      .order("created_at", { ascending: false }) as any;
    return data || [];
  },

  async createTemplate(name: string, image_url: string, category: string = "business"): Promise<void> {
    const { error } = await supabase.from("card_templates").insert({ name, image_url, category } as any);
    if (error) throw new Error(error.message);
  },

  async updateTemplate(id: string, data: Partial<CardTemplate>): Promise<void> {
    await supabase.from("card_templates").update(data as any).eq("id", id);
  },

  async deleteTemplate(id: string): Promise<void> {
    await supabase.from("card_templates").delete().eq("id", id);
  },

  // Logos
  async getLogos(): Promise<Logo[]> {
    const { data } = await supabase
      .from("logos")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false }) as any;
    return data || [];
  },

  async getAllLogos(): Promise<Logo[]> {
    const { data } = await supabase
      .from("logos")
      .select("*")
      .order("created_at", { ascending: false }) as any;
    return data || [];
  },

  async createLogo(name: string, image_url: string, category: string = "general"): Promise<void> {
    const { error } = await supabase.from("logos").insert({ name, image_url, category } as any);
    if (error) throw new Error(error.message);
  },

  async updateLogo(id: string, data: Partial<Logo>): Promise<void> {
    await supabase.from("logos").update(data as any).eq("id", id);
  },

  async deleteLogo(id: string): Promise<void> {
    await supabase.from("logos").delete().eq("id", id);
  },

  // Orders
  async createOrder(order: Partial<PrintOrder>): Promise<{ id: string; order_code: string } | null> {
    const { data, error } = await supabase
      .from("print_orders")
      .insert(order as any)
      .select("id, order_code")
      .single();
    if (error) throw new Error(error.message);
    return data as any;
  },

  /** Upload a generated print PDF blob to public storage and return its URL. */
  async uploadPrintPdf(blob: Blob, fileName: string): Promise<string> {
    const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
    const { error } = await supabase.storage
      .from("print-pdfs")
      .upload(path, blob, { contentType: "application/pdf", upsert: false });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from("print-pdfs").getPublicUrl(path);
    return data.publicUrl;
  },

  async getMyOrders(userId: string): Promise<PrintOrder[]> {
    const { data } = await supabase
      .from("print_orders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }) as any;
    return data || [];
  },

  async getAllOrders(): Promise<PrintOrder[]> {
    const { data: orders } = await supabase
      .from("print_orders")
      .select("*")
      .order("created_at", { ascending: false }) as any;
    if (!orders) return [];

    const templateIds = [...new Set(orders.map((o: any) => o.template_id))] as string[];
    const { data: templates } = await supabase
      .from("card_templates")
      .select("*")
      .in("id", templateIds) as any;

    const tMap = new Map((templates || []).map((t: any) => [t.id, t]));
    return orders.map((o: any) => ({ ...o, template: tMap.get(o.template_id) }));
  },

  async getOrderByCode(code: string): Promise<PrintOrder | null> {
    const { data } = await supabase
      .from("print_orders")
      .select("*")
      .eq("order_code", code.trim())
      .maybeSingle() as any;
    if (!data) return null;
    const { data: tpl } = await supabase
      .from("card_templates")
      .select("*")
      .eq("id", data.template_id)
      .maybeSingle() as any;
    return { ...data, template: tpl } as PrintOrder;
  },

  async getPopularTemplates(): Promise<string[]> {
    const { data } = await supabase
      .from("print_orders")
      .select("template_id") as any;
    if (!data || data.length === 0) return [];
    const counts: Record<string, number> = {};
    data.forEach((o: any) => { counts[o.template_id] = (counts[o.template_id] || 0) + 1; });
    return Object.entries(counts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 4)
      .map(([id]) => id);
  },

  async updateOrderStatus(id: string, status: string): Promise<void> {
    await supabase.from("print_orders").update({ status } as any).eq("id", id);
  },
};
