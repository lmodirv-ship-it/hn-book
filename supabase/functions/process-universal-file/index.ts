import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const CATEGORY_PREFIXES: Record<string, string> = {
  "كتب": "HNB", "بطاقات": "HNC", "قوالب": "HNT", "صور": "HNI",
  "وثائق": "HND", "عروض": "HNP", "تابلوهات": "HNA", "أخرى": "HNX",
  "شعارات": "HNL", "فلاير": "HNF", "ملصقات": "HNS", "قوائم": "HNM",
};

// Maps design_type to target system
const DESIGN_TARGET: Record<string, string> = {
  card: "cards", logo: "logo", tablou: "tablou", poster: "tablou",
  flyer: "books", menu: "books", book: "books", document: "books",
  social: "books", banner: "books", sticker: "books", other: "books",
};

// Maps design_type to Arabic category
const DESIGN_CATEGORY: Record<string, string> = {
  card: "بطاقات", logo: "شعارات", tablou: "تابلوهات", poster: "ملصقات",
  flyer: "فلاير", menu: "قوائم", book: "كتب", document: "وثائق",
  social: "قوالب", banner: "صور", sticker: "صور", other: "أخرى",
};

// Smart pricing by design type
const DESIGN_PRICES: Record<string, number> = {
  card: 50, logo: 0, tablou: 120, poster: 80, flyer: 30,
  menu: 60, book: 0, document: 0, social: 25, banner: 40, sticker: 15, other: 0,
};

function getExt(name: string): string {
  return name.split(".").pop()?.toLowerCase() || "";
}

function getMimeCat(mime: string, ext: string): string {
  if (mime.startsWith("image/") || ["jpg","jpeg","png","gif","bmp","webp","tiff","ico","svg","heic","avif"].includes(ext)) return "image";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (["doc","docx","txt","rtf","odt","md"].includes(ext)) return "document";
  if (["ppt","pptx","key","odp"].includes(ext)) return "presentation";
  if (["xls","xlsx","csv","ods"].includes(ext)) return "spreadsheet";
  if (["zip","rar","7z","tar","gz"].includes(ext)) return "archive";
  if (["ai","eps","psd","fig","sketch","cdr"].includes(ext)) return "design";
  return "other";
}

function getMime(ext: string): string {
  const m: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
    webp: "image/webp", svg: "image/svg+xml", bmp: "image/bmp",
    pdf: "application/pdf", txt: "text/plain", csv: "text/csv",
  };
  return m[ext] || "application/octet-stream";
}

interface RawItem {
  fileName: string; fileExt: string; mimeCategory: string; mimeType: string;
  fileSizeKB: number; fileBytes: Uint8Array; fromArchive?: string;
  folderPath?: string;
}

// ── Image dimension detection ────────────────────────────────
interface ImageDimensions { width: number; height: number; }

function readPngDimensions(bytes: Uint8Array): ImageDimensions | null {
  // PNG: bytes 16-19 = width, 20-23 = height (big-endian)
  if (bytes[0] !== 0x89 || bytes[1] !== 0x50) return null;
  const w = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
  const h = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
  return w > 0 && h > 0 ? { width: w, height: h } : null;
}

function readJpegDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) return null;
  let offset = 2;
  while (offset < bytes.length - 8) {
    if (bytes[offset] !== 0xFF) break;
    const marker = bytes[offset + 1];
    if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
      const h = (bytes[offset + 5] << 8) | bytes[offset + 6];
      const w = (bytes[offset + 7] << 8) | bytes[offset + 8];
      return w > 0 && h > 0 ? { width: w, height: h } : null;
    }
    const segLen = (bytes[offset + 2] << 8) | bytes[offset + 3];
    offset += 2 + segLen;
  }
  return null;
}

function readGifDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes[0] !== 0x47 || bytes[1] !== 0x49 || bytes[2] !== 0x46) return null;
  const w = bytes[6] | (bytes[7] << 8);
  const h = bytes[8] | (bytes[9] << 8);
  return w > 0 && h > 0 ? { width: w, height: h } : null;
}

function readWebpDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes[0] !== 0x52 || bytes[1] !== 0x49) return null; // "RI"
  // VP8 : offset 26-27 = width, 28-29 = height
  if (bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38 && bytes[15] === 0x20) {
    const w = (bytes[26] | (bytes[27] << 8)) & 0x3FFF;
    const h = (bytes[28] | (bytes[29] << 8)) & 0x3FFF;
    return w > 0 && h > 0 ? { width: w, height: h } : null;
  }
  return null;
}

function detectImageDimensions(bytes: Uint8Array, ext: string): ImageDimensions | null {
  if (ext === "png") return readPngDimensions(bytes);
  if (ext === "jpg" || ext === "jpeg") return readJpegDimensions(bytes);
  if (ext === "gif") return readGifDimensions(bytes);
  if (ext === "webp") return readWebpDimensions(bytes);
  // Try all parsers as fallback
  return readPngDimensions(bytes) || readJpegDimensions(bytes) || readGifDimensions(bytes) || readWebpDimensions(bytes);
}

// ── Design type classification by dimensions + filename ──────
interface DesignClassification {
  designType: string; // card, flyer, poster, logo, menu, tablou, social, banner, sticker
  confidence: number; // 0-1
  reason: string;
}

function classifyByDimensions(dims: ImageDimensions | null, fileName: string, fileSizeKB: number): DesignClassification {
  const nameLower = fileName.toLowerCase();

  // Keyword-based (highest priority)
  const keywordMap: [string[], string][] = [
    [["carte", "visite", "business-card", "card", "بطاقة"], "card"],
    [["logo", "logotype", "شعار"], "logo"],
    [["flyer", "tract", "leaflet", "فلاير", "نشرة"], "flyer"],
    [["poster", "affiche", "ملصق"], "poster"],
    [["menu", "قائمة", "carte-menu"], "menu"],
    [["tablou", "tableau", "wall-art", "تابلو", "لوحة"], "tablou"],
    [["banner", "بانر", "header"], "banner"],
    [["sticker", "ملصق-صغير"], "sticker"],
    [["social", "instagram", "facebook", "post", "story"], "social"],
    [["cv", "resume", "سيرة"], "document"],
    [["invoice", "فاتورة", "letterhead"], "document"],
  ];

  for (const [keywords, type] of keywordMap) {
    for (const kw of keywords) {
      if (nameLower.includes(kw)) {
        return { designType: type, confidence: 0.9, reason: `كلمة مفتاحية: ${kw}` };
      }
    }
  }

  if (!dims) {
    return { designType: "other", confidence: 0.3, reason: "لم يتم اكتشاف الأبعاد" };
  }

  const { width: w, height: h } = dims;
  const ratio = w / h;
  const area = w * h;
  const maxDim = Math.max(w, h);
  const minDim = Math.min(w, h);

  // Business Card: ~1050x600 pixels (~85x55mm at 300dpi) or similar small landscape
  if (minDim >= 400 && minDim <= 900 && maxDim >= 700 && maxDim <= 1400 && ratio >= 1.3 && ratio <= 2.2) {
    return { designType: "card", confidence: 0.85, reason: `أبعاد بطاقة: ${w}×${h}px (نسبة ${ratio.toFixed(2)})` };
  }

  // Logo: square-ish, moderate size, often < 2000px
  if (ratio >= 0.8 && ratio <= 1.25 && maxDim <= 2500 && minDim >= 100) {
    // Small square = likely icon/logo
    if (maxDim <= 1200) {
      return { designType: "logo", confidence: 0.75, reason: `أبعاد شعار: ${w}×${h}px (مربع صغير)` };
    }
    // Medium square + high resolution = could be social post
    if (maxDim <= 2500 && fileSizeKB < 2000) {
      return { designType: "social", confidence: 0.6, reason: `أبعاد منشور اجتماعي: ${w}×${h}px` };
    }
  }

  // Social story: ~1080x1920 (9:16 ratio)
  if (ratio >= 0.5 && ratio <= 0.6 && h >= 1800) {
    return { designType: "social", confidence: 0.8, reason: `أبعاد ستوري: ${w}×${h}px` };
  }

  // Poster / Tablou: large image, high resolution
  if (maxDim >= 3000 && area >= 6_000_000) {
    return { designType: "tablou", confidence: 0.8, reason: `صورة عالية الدقة: ${w}×${h}px (تابلو/ملصق)` };
  }

  // Flyer A4-ish: ~2480x3508 at 300dpi (ratio ~0.7)
  if (ratio >= 0.6 && ratio <= 0.8 && maxDim >= 2400 && maxDim <= 4200) {
    return { designType: "flyer", confidence: 0.7, reason: `أبعاد فلاير/A4: ${w}×${h}px` };
  }

  // Banner: very wide or very tall
  if (ratio >= 3 || ratio <= 0.33) {
    return { designType: "banner", confidence: 0.75, reason: `أبعاد بانر: ${w}×${h}px (نسبة ${ratio.toFixed(2)})` };
  }

  // Large landscape image = poster/tablou
  if (maxDim >= 2000 && ratio >= 1.2) {
    return { designType: "poster", confidence: 0.6, reason: `صورة أفقية كبيرة: ${w}×${h}px` };
  }

  // Large vertical = flyer/poster
  if (maxDim >= 2000 && ratio < 0.85) {
    return { designType: "flyer", confidence: 0.55, reason: `صورة عمودية كبيرة: ${w}×${h}px` };
  }

  // Medium/default = tablou for nice images
  if (fileSizeKB > 500 && maxDim >= 1000) {
    return { designType: "tablou", confidence: 0.5, reason: `صورة متوسطة/كبيرة: ${w}×${h}px` };
  }

  return { designType: "other", confidence: 0.3, reason: `أبعاد غير محددة: ${w}×${h}px` };
}

// ── Filename-based keywords for non-image files ──
function classifyNonImageByName(fileName: string, ext: string, fileSizeKB: number): DesignClassification {
  const nameLower = fileName.toLowerCase();

  if (ext === "pdf") {
    // Large PDFs are likely books
    if (fileSizeKB > 5000) return { designType: "book", confidence: 0.8, reason: `PDF كبير (${(fileSizeKB/1024).toFixed(1)}MB) — كتاب` };
    // Small PDFs with keywords
    if (nameLower.match(/carte|card|بطاقة|visite/)) return { designType: "card", confidence: 0.85, reason: "PDF بطاقة أعمال" };
    if (nameLower.match(/flyer|tract|نشرة|فلاير/)) return { designType: "flyer", confidence: 0.85, reason: "PDF فلاير" };
    if (nameLower.match(/menu|قائمة/)) return { designType: "menu", confidence: 0.85, reason: "PDF قائمة" };
    if (nameLower.match(/poster|affiche|ملصق/)) return { designType: "poster", confidence: 0.8, reason: "PDF ملصق" };
    return { designType: "book", confidence: 0.6, reason: "PDF عام — كتاب" };
  }

  if (["psd", "ai", "cdr", "eps"].includes(ext)) {
    if (nameLower.match(/carte|card|بطاقة|visite/)) return { designType: "card", confidence: 0.9, reason: `${ext.toUpperCase()} بطاقة` };
    if (nameLower.match(/logo|شعار/)) return { designType: "logo", confidence: 0.9, reason: `${ext.toUpperCase()} شعار` };
    if (nameLower.match(/flyer|tract|فلاير/)) return { designType: "flyer", confidence: 0.9, reason: `${ext.toUpperCase()} فلاير` };
    if (nameLower.match(/menu|قائمة/)) return { designType: "menu", confidence: 0.85, reason: `${ext.toUpperCase()} قائمة` };
    if (nameLower.match(/poster|affiche|ملصق/)) return { designType: "poster", confidence: 0.85, reason: `${ext.toUpperCase()} ملصق` };
    if (nameLower.match(/tablou|tableau|لوحة/)) return { designType: "tablou", confidence: 0.85, reason: `${ext.toUpperCase()} تابلو` };
    return { designType: "other", confidence: 0.4, reason: `ملف تصميم ${ext.toUpperCase()}` };
  }

  return { designType: "other", confidence: 0.2, reason: "نوع غير محدد" };
}

function isReadableTextFile(mime: string, ext: string): boolean {
  return mime.startsWith("text/") || [
    "txt", "md", "json", "csv", "xml", "html", "htm", "css", "js", "ts", "jsx", "tsx",
    "yml", "yaml", "toml", "ini", "log", "sql"
  ].includes(ext);
}

function extractTextPreview(bytes: Uint8Array): string {
  try {
    const slice = bytes.slice(0, 256 * 1024);
    return new TextDecoder("utf-8", { fatal: false })
      .decode(slice)
      .replace(/\0/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 12000);
  } catch {
    return "";
  }
}

async function classifyAI(bytes: Uint8Array, name: string, mime: string, cat: string, dims: ImageDimensions | null): Promise<any> {
  const ext = getExt(name);
  const dimInfo = dims ? `Image dimensions: ${dims.width}x${dims.height}px, aspect ratio: ${(dims.width/dims.height).toFixed(2)}` : "";

  if (cat !== "image" && cat !== "pdf") {
    const textPreview = isReadableTextFile(mime, ext) ? extractTextPreview(bytes) : "";

    if (textPreview) {
      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{
              role: "user",
              content: `Analyze this file and return ONLY valid JSON:
{"type":"one of: كتب, بطاقات, قوالب, صور, وثائق, عروض, تابلوهات, شعارات, فلاير, ملصقات, قوائم, أخرى","design_type":"card|logo|flyer|poster|menu|tablou|social|banner|sticker|book|document|other","name_ar":"Arabic title","name_en":"English title","description_ar":"Short Arabic description","author":"author or empty","tags":["tag1"],"suggested_price":0}
Rules: كتب=books, بطاقات=business cards, قوالب=templates, صور=photos, وثائق=documents, عروض=presentations, تابلوهات=wall art, شعارات=logos, فلاير=flyers, ملصقات=posters, قوائم=menus. File: ${name}
${dimInfo}
Content preview:\n${textPreview}`,
            }],
            max_tokens: 900,
            temperature: 0.1,
          }),
        });
        if (res.ok) {
          const d = await res.json();
          const c = d.choices?.[0]?.message?.content || "";
          const m = c.match(/\{[\s\S]*\}/);
          if (m) { try { return JSON.parse(m[0]); } catch {} }
        }
      } catch (e) {
        console.error("AI text classification error:", e);
      }
    }

    const map: Record<string, string> = {
      document: "وثائق", presentation: "عروض", spreadsheet: "وثائق",
      design: "قوالب", image: "صور", pdf: "كتب", other: "أخرى",
    };
    return {
      type: map[cat] || "أخرى", design_type: "other",
      name_ar: name.replace(/\.[^.]+$/, ""), name_en: name.replace(/\.[^.]+$/, ""),
      description_ar: `ملف ${name}`, author: "", tags: [], suggested_price: 0,
    };
  }

  try {
    const maxBytes = 4 * 1024 * 1024;
    const classifyBytes = bytes.length > maxBytes ? bytes.slice(0, maxBytes) : bytes;
    
    let b64 = "";
    const cs = 8192;
    for (let i = 0; i < classifyBytes.length; i += cs) {
      b64 += String.fromCharCode(...classifyBytes.slice(i, i + cs));
    }
    b64 = btoa(b64);
    const mediaType = cat === "pdf" ? "application/pdf" : mime;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `Analyze this design file. Return ONLY valid JSON:
{"type":"one of: كتب, بطاقات, قوالب, صور, وثائق, عروض, تابلوهات, شعارات, فلاير, ملصقات, قوائم, أخرى","design_type":"card|logo|flyer|poster|menu|tablou|social|banner|sticker|book|document|other","name_ar":"Arabic title","name_en":"English title","description_ar":"Short Arabic description","author":"","tags":["tag1"],"suggested_price":0}

Classification rules:
- card: business cards, visit cards (small landscape ~85x55mm)
- logo: logos, icons, brand marks (square, small, often transparent)
- flyer: flyers, tracts, leaflets (A4/A5 portrait)
- poster: posters, large prints (large format)
- menu: restaurant menus, price lists
- tablou: wall art, decorative art, artistic images (high-res)
- social: social media posts, stories (1080x1080 or 1080x1920)
- banner: web banners, headers (very wide)
- sticker: small stickers, labels
- book: books, ebooks, long documents
- document: forms, invoices, CVs

${dimInfo}
File: ${name}` },
            { type: "image_url", image_url: { url: `data:${mediaType};base64,${b64}` } },
          ],
        }],
        max_tokens: 1500, temperature: 0.1,
      }),
    });
    if (res.ok) {
      const d = await res.json();
      const c = d.choices?.[0]?.message?.content || "";
      const m = c.match(/\{[\s\S]*\}/);
      if (m) { try { return JSON.parse(m[0]); } catch {} }
    }
  } catch (e) { console.error("AI error:", e); }
  return null;
}

const FOLDER_CATEGORY_HINTS: Record<string, string> = {
  logo: "شعارات", logos: "شعارات", logotype: "شعارات",
  card: "بطاقات", cards: "بطاقات", "carte-visite": "بطاقات", "business-card": "بطاقات",
  "visit-card": "بطاقات", "carte_visite": "بطاقات", "cartes": "بطاقات",
  template: "قوالب", templates: "قوالب", mockup: "قوالب", mockups: "قوالب",
  image: "صور", images: "صور", photo: "صور", photos: "صور",
  book: "كتب", books: "كتب", ebook: "كتب", ebooks: "كتب", pdf: "كتب",
  doc: "وثائق", docs: "وثائق", document: "وثائق", documents: "وثائق",
  presentation: "عروض", presentations: "عروض", slides: "عروض",
  flyer: "فلاير", flyers: "فلاير", brochure: "فلاير",
  banner: "صور", banners: "صور", cover: "صور", covers: "صور",
  icon: "شعارات", icons: "شعارات",
  sticker: "صور", stickers: "صور",
  cv: "قوالب", resume: "قوالب", invoice: "قوالب", letterhead: "قوالب",
  social: "قوالب", "social-media": "قوالب", post: "قوالب", posts: "قوالب",
  tablou: "تابلوهات", tableau: "تابلوهات", "wall-art": "تابلوهات", wallart: "تابلوهات",
  art: "تابلوهات", poster: "ملصقات", posters: "ملصقات", print: "تابلوهات",
  menu: "قوائم", menus: "قوائم",
};

function getCategoryFromFolderPath(folderPath: string): string | null {
  const parts = folderPath.toLowerCase().split("/").filter(Boolean);
  for (const part of parts) {
    const cleaned = part.replace(/[_\-\s]+/g, "-").trim();
    if (FOLDER_CATEGORY_HINTS[cleaned]) return FOLDER_CATEGORY_HINTS[cleaned];
    for (const [key, cat] of Object.entries(FOLDER_CATEGORY_HINTS)) {
      if (cleaned.includes(key)) return cat;
    }
  }
  return null;
}

async function extractZip(bytes: Uint8Array, parent: string): Promise<RawItem[]> {
  const items: RawItem[] = [];
  try {
    const zip = new JSZip();
    await zip.loadAsync(bytes);
    for (const [path, entry] of Object.entries(zip.files)) {
      const e = entry as any;
      if (e.dir) continue;
      const name = path.split("/").pop() || path;
      if (name.startsWith(".") || path.includes("__MACOSX")) continue;
      const ext = getExt(name);
      const mime = getMime(ext);
      const cat = getMimeCat(mime, ext);
      const b = new Uint8Array(await e.async("arraybuffer"));
      if (b.length < 512) continue;
      items.push({
        fileName: name, fileExt: ext, mimeCategory: cat, mimeType: mime,
        fileSizeKB: Math.round(b.length / 1024), fileBytes: b,
        fromArchive: parent, folderPath: path,
      });
    }
    console.log(`📂 Extracted ${items.length} files from ZIP`);
  } catch (e) { console.error("ZIP error:", e); }
  return items;
}

async function getNextCode(supabase: any, prefix: string): Promise<string> {
  const { data } = await supabase.from("products").select("badge").like("badge", `${prefix}-%`);
  let max = 0;
  if (data) {
    for (const p of data) {
      const m = p.badge?.match(new RegExp(`${prefix}-(\\d+)`));
      if (m) { const n = parseInt(m[1]); if (n > max) max = n; }
    }
  }
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

// Save item to the appropriate system based on design classification
async function saveToTarget(
  supabase: any, item: RawItem, cls: any, designType: string, categoryType: string, target: string, dims: ImageDimensions | null, designReason: string
): Promise<any> {
  const prefix = CATEGORY_PREFIXES[categoryType] || "HNX";
  const suggestedPrice = cls.suggested_price || DESIGN_PRICES[designType] || 0;

  // LOGO → save to logos table
  if (target === "logo" && item.mimeCategory === "image") {
    const storagePath = `logos/${Date.now()}-${item.fileName}`;
    const { error: uploadErr } = await supabase.storage
      .from("book-images")
      .upload(storagePath, item.fileBytes, { contentType: item.mimeType, upsert: true });
    if (uploadErr) throw new Error("فشل رفع الشعار");

    const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/book-images/${storagePath}`;
    const name = cls.name_ar || item.fileName.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");

    const { data: logo, error: insertErr } = await supabase.from("logos").insert({
      name, image_url: imageUrl, category: "general", is_active: true,
    }).select("id").single();

    if (insertErr) throw new Error("فشل حفظ الشعار: " + insertErr.message);

    return {
      success: true, id: logo.id, name, category: "شعارات",
      cover: imageUrl, file_url: imageUrl, fileName: item.fileName,
      fromArchive: item.fromArchive || null, fileSizeKB: item.fileSizeKB,
      fileExt: item.fileExt, targetType: "logo",
      designType, designReason,
      dimensions: dims ? `${dims.width}×${dims.height}` : null,
    };
  }

  // TABLOU → save to tablous table
  if (target === "tablou" && item.mimeCategory === "image") {
    const storagePath = `tablou/${Date.now()}-${item.fileName}`;
    const { error: uploadErr } = await supabase.storage
      .from("book-images")
      .upload(storagePath, item.fileBytes, { contentType: item.mimeType, upsert: true });
    if (uploadErr) throw new Error("فشل رفع صورة التابلو");

    const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/book-images/${storagePath}`;
    const title = cls.name_ar || item.fileName.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");

    const tablouCategory = designType === "poster" ? "modern" : "art";
    const { data: tablou, error: insertErr } = await supabase.from("tablous").insert({
      title, image_url: imageUrl, category: tablouCategory,
      description: cls.description_ar || "", base_price: suggestedPrice, is_active: true,
    }).select("id").single();

    if (insertErr) throw new Error("فشل حفظ التابلو: " + insertErr.message);

    return {
      success: true, id: tablou.id, name: title, category: "تابلوهات",
      cover: imageUrl, file_url: imageUrl, fileName: item.fileName,
      fromArchive: item.fromArchive || null, fileSizeKB: item.fileSizeKB,
      fileExt: item.fileExt, targetType: "tablou",
      designType, designReason,
      dimensions: dims ? `${dims.width}×${dims.height}` : null,
    };
  }

  // CARDS → save to card_templates table
  if (target === "cards" && item.mimeCategory === "image") {
    const storagePath = `card-templates/${Date.now()}-${item.fileName}`;
    const { error: uploadErr } = await supabase.storage
      .from("book-images")
      .upload(storagePath, item.fileBytes, { contentType: item.mimeType, upsert: true });
    if (uploadErr) throw new Error("فشل رفع قالب البطاقة");

    const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/book-images/${storagePath}`;
    const name = cls.name_ar || item.fileName.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");

    const { data: template, error: insertErr } = await supabase.from("card_templates").insert({
      name, image_url: imageUrl, category: "business", is_active: true,
    }).select("id").single();

    if (insertErr) throw new Error("فشل حفظ القالب: " + insertErr.message);

    return {
      success: true, id: template.id, name, category: "بطاقات",
      cover: imageUrl, file_url: imageUrl, fileName: item.fileName,
      fromArchive: item.fromArchive || null, fileSizeKB: item.fileSizeKB,
      fileExt: item.fileExt, targetType: "cards",
      designType, designReason,
      dimensions: dims ? `${dims.width}×${dims.height}` : null,
    };
  }

  // Default: save to products table
  const itemCode = await getNextCode(supabase, prefix);
  const bucket = item.mimeCategory === "image" ? "book-images" : "book-files";
  const storagePath = `products/${itemCode}/${itemCode}.${item.fileExt}`;

  const { error: uploadErr } = await supabase.storage
    .from(bucket)
    .upload(storagePath, item.fileBytes, { contentType: item.mimeType, upsert: true });
  if (uploadErr) throw new Error("فشل رفع الملف");

  const fileUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${storagePath}`;
  const coverUrl = item.mimeCategory === "image" ? fileUrl : null;
  const productName = `${itemCode} - ${cls.name_ar}`;
  const description = [
    cls.description_ar,
    cls.author ? `المؤلف: ${cls.author}` : "",
    dims ? `الأبعاد: ${dims.width}×${dims.height}px` : "",
    cls.name_en ? `\n---\n🇬🇧 ${cls.name_en}` : "",
  ].filter(Boolean).join("\n");

  const { data: product, error: insertErr } = await supabase.from("products").insert({
    name: productName,
    short_description: cls.description_ar || null,
    description,
    category: categoryType,
    price: suggestedPrice,
    image: coverUrl,
    pdf_url: item.mimeCategory === "pdf" ? fileUrl : null,
    badge: itemCode,
    is_active: true,
    features: [
      cls.author ? `المؤلف: ${cls.author}` : "",
      `النوع: ${categoryType}`,
      `التصميم: ${designType}`,
      `الصيغة: ${item.fileExt.toUpperCase()}`,
      dims ? `الأبعاد: ${dims.width}×${dims.height}px` : "",
      `الحجم: ${item.fileSizeKB > 1024 ? `${(item.fileSizeKB / 1024).toFixed(1)}MB` : `${item.fileSizeKB}KB`}`,
      ...(cls.tags || []),
    ].filter(Boolean),
  }).select("id").single();

  if (insertErr) throw new Error("فشل الحفظ: " + insertErr.message);

  const fileType = item.mimeCategory === "image" ? "image" : item.mimeCategory === "pdf" ? "pdf" : "other";
  await supabase.from("product_files").insert({
    product_id: product.id, file_type: fileType as any,
    file_name: `${itemCode}.${item.fileExt}`,
    storage_path: `${bucket}/${storagePath}`, public_url: fileUrl,
    file_size: item.fileBytes.length, is_primary: true,
  });

  return {
    success: true, id: product.id, code: itemCode, category: categoryType,
    name: productName, cover: coverUrl, file_url: fileUrl, fileName: item.fileName,
    fromArchive: item.fromArchive || null, fileSizeKB: item.fileSizeKB,
    fileExt: item.fileExt, targetType: "books",
    designType, designReason,
    dimensions: dims ? `${dims.width}×${dims.height}` : null,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let fileName: string;
    let fileExt: string;
    let mimeType: string;
    let mimeCategory: string;
    let fileBytes: Uint8Array;
    let fileSizeKB: number;
    let forceTarget: string | null = null;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      const { storage_path, file_name, bucket, target } = body;
      if (!storage_path || !file_name) {
        return new Response(JSON.stringify({ error: "storage_path and file_name required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      forceTarget = target || null;
      const bucketName = bucket || "book-files";

      const { data: fileData, error: dlError } = await supabase.storage
        .from(bucketName).download(storage_path);
      if (dlError || !fileData) {
        return new Response(JSON.stringify({ error: "فشل تحميل الملف من التخزين" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      fileName = file_name;
      fileExt = getExt(fileName);
      mimeType = fileData.type || getMime(fileExt);
      mimeCategory = getMimeCat(mimeType, fileExt);
      fileBytes = new Uint8Array(await fileData.arrayBuffer());
      fileSizeKB = Math.round(fileBytes.length / 1024);
      await supabase.storage.from(bucketName).remove([storage_path]);
    } else {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      forceTarget = (formData.get("target") as string) || null;
      if (!file) {
        return new Response(JSON.stringify({ error: "No file provided" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      fileName = file.name;
      fileExt = getExt(fileName);
      mimeType = file.type || "application/octet-stream";
      mimeCategory = getMimeCat(mimeType, fileExt);
      fileBytes = new Uint8Array(await file.arrayBuffer());
      fileSizeKB = Math.round(fileBytes.length / 1024);
    }

    console.log(`📦 Processing: ${fileName} (${mimeType}, ${fileSizeKB}KB, ${mimeCategory}, target=${forceTarget || "auto"})`);

    let rawItems: RawItem[] = [];
    if (mimeCategory === "archive" && fileExt === "zip") {
      rawItems = await extractZip(fileBytes, fileName);
      if (rawItems.length === 0) {
        rawItems.push({ fileName, fileExt, mimeCategory, mimeType, fileSizeKB, fileBytes });
      }
    } else {
      rawItems.push({ fileName, fileExt, mimeCategory, mimeType, fileSizeKB, fileBytes });
    }

    const results = [];

    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i];
      console.log(`🔍 [${i+1}/${rawItems.length}] ${item.fileName}`);

      try {
        // Step 1: Detect image dimensions
        const dims = item.mimeCategory === "image"
          ? detectImageDimensions(item.fileBytes, item.fileExt)
          : null;
        if (dims) console.log(`📐 Dimensions: ${dims.width}×${dims.height}px`);

        // Step 2: Dimension-based classification
        const dimClassification = item.mimeCategory === "image"
          ? classifyByDimensions(dims, item.fileName, item.fileSizeKB)
          : classifyNonImageByName(item.fileName, item.fileExt, item.fileSizeKB);

        console.log(`📊 Dimension classification: ${dimClassification.designType} (${(dimClassification.confidence * 100).toFixed(0)}%) — ${dimClassification.reason}`);

        // Step 3: Folder-based hint (from ZIP)
        const folderHint = item.folderPath ? getCategoryFromFolderPath(item.folderPath) : null;

        // Step 4: AI Classification (enhanced with dimension info)
        const cls = await classifyAI(item.fileBytes, item.fileName, item.mimeType, item.mimeCategory, dims) || {
          type: "أخرى", design_type: dimClassification.designType,
          name_ar: item.fileName.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
          name_en: item.fileName.replace(/\.[^.]+$/, ""),
          description_ar: `ملف ${item.fileName}`, author: "", tags: [], suggested_price: 0,
        };

        // Step 5: Merge classifications — prefer AI if confident, else use dimension-based
        let finalDesignType = cls.design_type || dimClassification.designType;
        let designReason = dimClassification.reason;

        // If AI returned a valid design_type, prefer it (AI sees content)
        if (cls.design_type && cls.design_type !== "other") {
          finalDesignType = cls.design_type;
          designReason = `AI: ${cls.design_type} + ${dimClassification.reason}`;
        } else if (dimClassification.confidence >= 0.6) {
          finalDesignType = dimClassification.designType;
          designReason = dimClassification.reason;
        }

        // Folder hint can override for ZIP files
        if (folderHint) {
          // Map folder hint category back to design type
          const folderDesignMap: Record<string, string> = {
            "بطاقات": "card", "شعارات": "logo", "تابلوهات": "tablou",
            "فلاير": "flyer", "ملصقات": "poster", "قوائم": "menu",
            "كتب": "book", "وثائق": "document", "قوالب": "social",
          };
          const folderDesign = folderDesignMap[folderHint];
          if (folderDesign) {
            finalDesignType = folderDesign;
            designReason = `مجلد: ${item.folderPath} → ${folderHint}`;
          }
        }

        // Determine category and target
        const categoryType = DESIGN_CATEGORY[finalDesignType] || cls.type || "أخرى";
        let target = forceTarget;
        if (!target || target === "auto") {
          target = DESIGN_TARGET[finalDesignType] || "books";
        }

        console.log(`🎯 ${item.fileName} → design:${finalDesignType} → cat:${categoryType} → target:${target} (${designReason})`);

        const result = await saveToTarget(supabase, item, cls, finalDesignType, categoryType, target, dims, designReason);
        results.push(result);
      } catch (e: any) {
        console.error(`❌ Failed ${item.fileName}:`, e);
        results.push({ success: false, fileName: item.fileName, error: e.message });
      }
    }

    const successCount = results.filter((r: any) => r.success).length;
    console.log(`🏁 Done: ${successCount}/${results.length} saved`);

    return new Response(JSON.stringify({
      source: fileName,
      total: results.length,
      saved: successCount,
      failed: results.length - successCount,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Process error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
