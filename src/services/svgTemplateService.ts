import { supabase } from "@/integrations/supabase/client";

export type SvgFieldType = "text" | "color" | "image";
export type SvgSide = "front" | "back";

export interface SvgField {
  key: string;            // placeholder key e.g. "name"
  label: string;          // human label
  side: SvgSide;
  type: SvgFieldType;
  defaultValue: string;   // default text or color
}

export interface SvgTemplate {
  id: string;
  asset_id: string | null;
  name: string;
  category: string;
  front_svg_url: string;
  front_svg_content: string | null;
  back_svg_url: string | null;
  back_svg_content: string | null;
  fields: SvgField[];
  preview_image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_\-]+)\s*\}\}/g;

/** Extract unique {{placeholders}} from raw SVG XML */
export function extractPlaceholders(svg: string): string[] {
  const set = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = PLACEHOLDER_RE.exec(svg)) !== null) set.add(m[1]);
  return [...set];
}

const LABEL_MAP: Record<string, string> = {
  name: "الاسم الكامل",
  job: "المسمى الوظيفي",
  job_title: "المسمى الوظيفي",
  title: "المسمى الوظيفي",
  company: "الشركة",
  phone: "الهاتف",
  mobile: "الجوال",
  email: "البريد الإلكتروني",
  website: "الموقع",
  address: "العنوان",
  city: "المدينة",
};

export function buildFieldsFromSvg(frontSvg: string, backSvg?: string | null): SvgField[] {
  const out: SvgField[] = [];
  const front = extractPlaceholders(frontSvg);
  const back = backSvg ? extractPlaceholders(backSvg) : [];
  for (const k of front) {
    out.push({ key: k, label: LABEL_MAP[k.toLowerCase()] ?? k, side: "front", type: "text", defaultValue: "" });
  }
  for (const k of back) {
    if (out.some((f) => f.key === k)) continue;
    out.push({ key: k, label: LABEL_MAP[k.toLowerCase()] ?? k, side: "back", type: "text", defaultValue: "" });
  }
  return out;
}

/** Replace placeholders in SVG with provided values (XML-safe) */
export function renderSvg(svg: string, values: Record<string, string>): string {
  return svg.replace(PLACEHOLDER_RE, (_, key) => {
    const v = values[key] ?? "";
    return v
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  });
}

export const svgTemplateService = {
  async list(): Promise<SvgTemplate[]> {
    const { data, error } = await supabase
      .from("svg_templates" as never)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as SvgTemplate[];
  },

  async get(id: string): Promise<SvgTemplate | null> {
    const { data, error } = await supabase
      .from("svg_templates" as never)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as unknown as SvgTemplate) ?? null;
  },

  async create(input: {
    name: string;
    category: string;
    front_svg_url: string;
    front_svg_content: string;
    back_svg_url?: string | null;
    back_svg_content?: string | null;
    preview_image_url?: string | null;
    fields: SvgField[];
    asset_id?: string | null;
  }): Promise<SvgTemplate> {
    const { data, error } = await supabase
      .from("svg_templates" as never)
      .insert(input as never)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as SvgTemplate;
  },

  async update(id: string, patch: Partial<SvgTemplate>): Promise<void> {
    const { error } = await supabase
      .from("svg_templates" as never)
      .update(patch as never)
      .eq("id", id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("svg_templates" as never).delete().eq("id", id);
    if (error) throw error;
  },

  async uploadSvg(file: File, name: string): Promise<{ url: string; content: string }> {
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "_");
    const path = `${Date.now()}-${safeName}.svg`;
    const content = await file.text();
    const { error } = await supabase.storage.from("svg-templates").upload(path, file, {
      contentType: "image/svg+xml",
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("svg-templates").getPublicUrl(path);
    return { url: data.publicUrl, content };
  },
};
