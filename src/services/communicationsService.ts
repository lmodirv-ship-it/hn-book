import { supabase } from "@/integrations/supabase/client";

export interface WhatsAppConfig {
  enabled: boolean;
  phone_number: string;
  default_message: string;
}

export interface EmailConfig {
  enabled: boolean;
  email_address: string;
  subject_template: string;
  body_template: string;
}

const DEFAULT_WHATSAPP: WhatsAppConfig = {
  enabled: false,
  phone_number: "",
  default_message: "🖨️ طلب طباعة جديد\nرقم الطلب: {orderNumber}\nالمبلغ: {totalAmount} د.م\nملف PDF: {pdfUrl}",
};

const DEFAULT_EMAIL: EmailConfig = {
  enabled: false,
  email_address: "",
  subject_template: "طلب طباعة - {orderNumber}",
  body_template: "🖨️ طلب طباعة جديد\nرقم الطلب: {orderNumber}\nالمبلغ: {totalAmount} د.م\nملف PDF: {pdfUrl}",
};

async function getConfig<T>(key: string, fallback: T): Promise<T> {
  const { data, error } = await supabase
    .from("system_config")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error || !data) return fallback;
  return { ...fallback, ...(data.value as any) };
}

async function saveConfig(key: string, value: any, category = "communications") {
  const { error } = await supabase
    .from("system_config")
    .upsert({ key, value, category }, { onConflict: "key" });
  if (error) throw error;
}

export const communicationsService = {
  getWhatsApp: () => getConfig<WhatsAppConfig>("whatsapp_config", DEFAULT_WHATSAPP),
  getEmail: () => getConfig<EmailConfig>("email_config", DEFAULT_EMAIL),
  saveWhatsApp: (cfg: WhatsAppConfig) => saveConfig("whatsapp_config", cfg),
  saveEmail: (cfg: EmailConfig) => saveConfig("email_config", cfg),
};

export function applyTemplate(
  template: string,
  vars: Record<string, string | number | undefined>
): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}
