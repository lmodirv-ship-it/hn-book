/**
 * Print Service — manages card templates and print orders.
 */
import { supabase } from "@/integrations/supabase/client";

export interface CardTemplate {
  id: string;
  name: string;
  image_url: string;
  is_active: boolean;
  created_at: string;
}

export interface PrintOrder {
  id: string;
  user_id: string | null;
  template_id: string;
  quantity: number;
  paper_type: string;
  print_type: string;
  total_price: number;
  customer_name: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  notes: string;
  status: string;
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

export const calculatePrice = (quantity: number, paperType: string, printType: string): number => {
  const base = BASE_PRICES[quantity] || Math.round(quantity * 0.45);
  const paper = PAPER_MULTIPLIER[paperType] || 1;
  const print = PRINT_MULTIPLIER[printType] || 1;
  return Math.round(base * paper * print);
};

export const QUANTITIES = [100, 250, 500, 1000];

export const PAPER_TYPES = [
  { value: "standard", label: "عادي", description: "ورق أبيض 300g" },
  { value: "premium", label: "فاخر", description: "ورق سميك 400g" },
  { value: "glossy", label: "لامع", description: "ورق لامع 350g" },
];

export const PRINT_TYPES = [
  { value: "one_side", label: "وجه واحد" },
  { value: "double_side", label: "وجهين" },
];

export const printService = {
  async getTemplates(): Promise<CardTemplate[]> {
    const { data } = await supabase
      .from("card_templates")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false }) as any;
    return data || [];
  },

  async getAllTemplates(): Promise<CardTemplate[]> {
    const { data } = await supabase
      .from("card_templates")
      .select("*")
      .order("created_at", { ascending: false }) as any;
    return data || [];
  },

  async createOrder(order: Omit<PrintOrder, "id" | "created_at" | "status" | "template">): Promise<{ id: string } | null> {
    const { data, error } = await supabase
      .from("print_orders")
      .insert(order as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return data as any;
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

    const templateIds = [...new Set(orders.map((o: any) => o.template_id))];
    const { data: templates } = await supabase
      .from("card_templates")
      .select("*")
      .in("id", templateIds) as any;

    const tMap = new Map((templates || []).map((t: any) => [t.id, t]));
    return orders.map((o: any) => ({ ...o, template: tMap.get(o.template_id) }));
  },

  async updateOrderStatus(id: string, status: string): Promise<void> {
    await supabase.from("print_orders").update({ status } as any).eq("id", id);
  },

  async createTemplate(name: string, image_url: string): Promise<void> {
    const { error } = await supabase.from("card_templates").insert({ name, image_url } as any);
    if (error) throw new Error(error.message);
  },

  async updateTemplate(id: string, data: Partial<CardTemplate>): Promise<void> {
    await supabase.from("card_templates").update(data as any).eq("id", id);
  },

  async deleteTemplate(id: string): Promise<void> {
    await supabase.from("card_templates").delete().eq("id", id);
  },
};
