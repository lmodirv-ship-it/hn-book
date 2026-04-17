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

export type SvgTemplateType =
  | "CRD"  // Business card
  | "FLY"  // Flyer
  | "LOG"  // Logo
  | "PST"  // Poster
  | "TPL"  // Generic template
  | "INV"  // Invitation
  | "BAN"  // Banner
  | "OTH"; // Other

export const SVG_TEMPLATE_TYPES: { value: SvgTemplateType; label: string; folder: string }[] = [
  { value: "CRD", label: "بطاقة عمل", folder: "cards" },
  { value: "FLY", label: "فلاير", folder: "flyers" },
  { value: "LOG", label: "شعار", folder: "logos" },
  { value: "PST", label: "بوستر", folder: "posters" },
  { value: "INV", label: "دعوة", folder: "invitations" },
  { value: "BAN", label: "بانر", folder: "banners" },
  { value: "TPL", label: "قالب عام", folder: "templates" },
  { value: "OTH", label: "أخرى", folder: "other" },
];

const TYPE_FOLDER: Record<SvgTemplateType, string> = Object.fromEntries(
  SVG_TEMPLATE_TYPES.map((t) => [t.value, t.folder])
) as Record<SvgTemplateType, string>;

export interface SvgTemplate {
  id: string;
  asset_id: string | null;
  name: string;
  category: string;
  template_type: SvgTemplateType;
  code: string | null;
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

/** Suggest a template type from filename + SVG dimensions. */
export function suggestTemplateType(fileName: string, svgContent: string): SvgTemplateType {
  const n = fileName.toLowerCase();
  if (/(logo|brand|mark)/.test(n)) return "LOG";
  if (/(card|carte|visit|business)/.test(n)) return "CRD";
  if (/(flyer|flayer|leaflet)/.test(n)) return "FLY";
  if (/(poster|affiche)/.test(n)) return "PST";
  if (/(invit|invitation|wedding)/.test(n)) return "INV";
  if (/(banner|bannière|banniere)/.test(n)) return "BAN";

  // Heuristic from viewBox aspect ratio
  const m = svgContent.match(/viewBox\s*=\s*"([\d.\s\-]+)"/i);
  if (m) {
    const parts = m[1].trim().split(/\s+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      const ratio = parts[2] / parts[3];
      if (ratio > 1.6 && ratio < 1.95) return "CRD";    // ~1.75 business card
      if (ratio > 0.6 && ratio < 0.85) return "FLY";    // A4 portrait ~0.707
      if (ratio > 1.3 && ratio < 1.5) return "FLY";     // A4 landscape
      if (Math.abs(ratio - 1) < 0.15) return "LOG";     // square-ish
      if (ratio > 2.5) return "BAN";
    }
  }
  return "TPL";
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

  /** Find a template attached to an asset (gallery cards expose asset.id, not template.id). */
  async getByAssetId(assetId: string): Promise<SvgTemplate | null> {
    const { data, error } = await supabase
      .from("svg_templates" as never)
      .select("*")
      .eq("asset_id", assetId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as unknown as SvgTemplate) ?? null;
  },

  /** Resolve by either template id or asset id — used by the editor route. */
  async resolve(id: string): Promise<SvgTemplate | null> {
    const direct = await this.get(id);
    if (direct) return direct;
    return await this.getByAssetId(id);
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
