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
};
const CATEGORY_LABELS: Record<string, string> = {
  HNB: "كتب", HNC: "بطاقات", HNT: "قوالب", HNI: "صور",
  HND: "وثائق", HNP: "عروض", HNA: "تابلوهات", HNX: "أخرى",
};

// Maps category to a target system for smart routing
const CATEGORY_TARGET: Record<string, string> = {
  "كتب": "books", "وثائق": "books", "عروض": "books",
  "تابلوهات": "tablou", "صور": "tablou",
  "بطاقات": "cards", "قوالب": "cards",
  "أخرى": "books",
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
  if (["svg","ai","eps","psd","fig","sketch"].includes(ext)) return "design";
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

async function classifyAI(bytes: Uint8Array, name: string, mime: string, cat: string): Promise<any> {
  const ext = getExt(name);

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
              content: `Analyze this text-based file and return ONLY valid JSON:\n{"type":"one of: كتب, بطاقات, قوالب, صور, وثائق, عروض, تابلوهات, أخرى","name_ar":"Arabic title","name_en":"English title","description_ar":"Short Arabic description","author":"author or empty","tags":["tag1"],"suggested_price":0}\nRules: كتب=books/ebooks, بطاقات=cards, قوالب=templates, صور=photos/graphics, وثائق=documents/forms, عروض=presentations, تابلوهات=wall art/posters, أخرى=other. File name: ${name}\nFile type: ${mime}\nExtracted content preview:\n${textPreview}`,
            }],
            max_tokens: 900,
            temperature: 0.1,
          }),
        });
        if (res.ok) {
          const d = await res.json();
          const c = d.choices?.[0]?.message?.content || "";
          const m = c.match(/\{[\s\S]*\}/);
          if (m) {
            try { return JSON.parse(m[0]); } catch {}
          }
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
      type: map[cat] || "أخرى",
      name_ar: name.replace(/\.[^.]+$/, ""),
      name_en: name.replace(/\.[^.]+$/, ""),
      description_ar: textPreview ? `ملف ${name} يحتوي على محتوى نصي قابل للقراءة` : `ملف ${name}`,
      author: "", tags: [], suggested_price: 0,
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
            { type: "text", text: `Analyze this file. Return ONLY valid JSON:
{"type":"one of: كتب, بطاقات, قوالب, صور, وثائق, عروض, تابلوهات, أخرى","name_ar":"Arabic title","name_en":"English title","description_ar":"Short Arabic description","author":"author or empty","tags":["tag1"],"suggested_price":0}
Rules: كتب=books/ebooks, بطاقات=cards, قوالب=templates, صور=photos/graphics, وثائق=documents/forms, عروض=presentations, تابلوهات=wall art/posters/decorative art, أخرى=other. File: ${name}` },
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
  logo: "صور", logos: "صور", logotype: "صور",
  card: "بطاقات", cards: "بطاقات", "carte-visite": "بطاقات", "business-card": "بطاقات",
  "visit-card": "بطاقات", "carte_visite": "بطاقات", "cartes": "بطاقات",
  template: "قوالب", templates: "قوالب", mockup: "قوالب", mockups: "قوالب",
  image: "صور", images: "صور", photo: "صور", photos: "صور", picture: "صور", pictures: "صور",
  book: "كتب", books: "كتب", ebook: "كتب", ebooks: "كتب", pdf: "كتب",
  doc: "وثائق", docs: "وثائق", document: "وثائق", documents: "وثائق",
  presentation: "عروض", presentations: "عروض", slides: "عروض", slide: "عروض",
  flyer: "بطاقات", flyers: "بطاقات", brochure: "وثائق", brochures: "وثائق",
  banner: "صور", banners: "صور", cover: "صور", covers: "صور",
  icon: "صور", icons: "صور", sticker: "صور", stickers: "صور",
  cv: "قوالب", resume: "قوالب", invoice: "قوالب", letterhead: "قوالب",
  social: "قوالب", "social-media": "قوالب", post: "قوالب", posts: "قوالب",
  tablou: "تابلوهات", tableau: "تابلوهات", "wall-art": "تابلوهات", wallart: "تابلوهات",
  art: "تابلوهات", poster: "تابلوهات", posters: "تابلوهات", print: "تابلوهات",
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
    const folders = [...new Set(items.map(i => i.folderPath?.split("/").slice(0, -1).join("/")).filter(Boolean))];
    if (folders.length > 0) console.log(`📁 Folders found: ${folders.join(", ")}`);
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

// Save item to the appropriate system based on target
async function saveToTarget(
  supabase: any, item: RawItem, cls: any, categoryType: string, target: string
): Promise<any> {
  const prefix = CATEGORY_PREFIXES[categoryType] || "HNX";

  if (target === "tablou" && item.mimeCategory === "image") {
    // Save directly to tablous table
    const storagePath = `tablou/${Date.now()}-${item.fileName}`;
    const { error: uploadErr } = await supabase.storage
      .from("book-images")
      .upload(storagePath, item.fileBytes, { contentType: item.mimeType, upsert: true });
    if (uploadErr) throw new Error("فشل رفع صورة التابلو");

    const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/book-images/${storagePath}`;
    const title = cls.name_ar || item.fileName.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
    const suggestedPrice = cls.suggested_price || Math.floor(Math.random() * 100 + 50);

    const { data: tablou, error: insertErr } = await supabase.from("tablous").insert({
      title,
      image_url: imageUrl,
      category: "modern",
      description: cls.description_ar || "",
      base_price: suggestedPrice,
      is_active: true,
    }).select("id").single();

    if (insertErr) throw new Error("فشل حفظ التابلو: " + insertErr.message);
    // Sizes are auto-created by trigger

    return {
      success: true, id: tablou.id, name: title, category: "تابلوهات",
      cover: imageUrl, file_url: imageUrl, fileName: item.fileName,
      fromArchive: item.fromArchive || null, fileSizeKB: item.fileSizeKB,
      fileExt: item.fileExt, targetType: "tablou",
    };
  }

  if (target === "cards" && item.mimeCategory === "image") {
    // Save to card_templates table
    const storagePath = `card-templates/${Date.now()}-${item.fileName}`;
    const { error: uploadErr } = await supabase.storage
      .from("book-images")
      .upload(storagePath, item.fileBytes, { contentType: item.mimeType, upsert: true });
    if (uploadErr) throw new Error("فشل رفع قالب البطاقة");

    const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/book-images/${storagePath}`;
    const name = cls.name_ar || item.fileName.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");

    const { data: template, error: insertErr } = await supabase.from("card_templates").insert({
      name,
      image_url: imageUrl,
      category: "business",
      is_active: true,
    }).select("id").single();

    if (insertErr) throw new Error("فشل حفظ القالب: " + insertErr.message);

    return {
      success: true, id: template.id, name, category: "بطاقات",
      cover: imageUrl, file_url: imageUrl, fileName: item.fileName,
      fromArchive: item.fromArchive || null, fileSizeKB: item.fileSizeKB,
      fileExt: item.fileExt, targetType: "cards",
    };
  }

  // Default: save to products table (books/docs/etc.)
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
    cls.name_en ? `\n---\n🇬🇧 ${cls.name_en}` : "",
  ].filter(Boolean).join("\n");

  const { data: product, error: insertErr } = await supabase.from("products").insert({
    name: productName,
    short_description: cls.description_ar || null,
    description,
    category: CATEGORY_LABELS[prefix] || categoryType,
    price: cls.suggested_price || 0,
    image: coverUrl,
    pdf_url: item.mimeCategory === "pdf" ? fileUrl : null,
    badge: itemCode,
    is_active: true,
    features: [
      cls.author ? `المؤلف: ${cls.author}` : "",
      `النوع: ${categoryType}`,
      `الصيغة: ${item.fileExt.toUpperCase()}`,
      `الحجم: ${item.fileSizeKB > 1024 ? `${(item.fileSizeKB / 1024).toFixed(1)}MB` : `${item.fileSizeKB}KB`}`,
      ...(cls.tags || []),
    ].filter(Boolean),
  }).select("id").single();

  if (insertErr) throw new Error("فشل الحفظ في قاعدة البيانات: " + insertErr.message);

  const fileType = item.mimeCategory === "image" ? "image" : item.mimeCategory === "pdf" ? "pdf" : "other";
  await supabase.from("product_files").insert({
    product_id: product.id,
    file_type: fileType as any,
    file_name: `${itemCode}.${item.fileExt}`,
    storage_path: `${bucket}/${storagePath}`,
    public_url: fileUrl,
    file_size: item.fileBytes.length,
    is_primary: true,
  });

  return {
    success: true, id: product.id, code: itemCode, category: categoryType,
    name: productName, cover: coverUrl, file_url: fileUrl, fileName: item.fileName,
    fromArchive: item.fromArchive || null, fileSizeKB: item.fileSizeKB,
    fileExt: item.fileExt, targetType: "books",
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
    let forceTarget: string | null = null; // "auto", "books", "tablou", "cards"

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
      console.log(`📥 Downloading from storage: ${bucketName}/${storage_path}`);

      const { data: fileData, error: dlError } = await supabase.storage
        .from(bucketName)
        .download(storage_path);

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

    // Extract ZIP archives into individual files
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
        const folderHint = item.folderPath ? getCategoryFromFolderPath(item.folderPath) : null;

        // AI Classification
        const cls = await classifyAI(item.fileBytes, item.fileName, item.mimeType, item.mimeCategory) || {
          type: folderHint || "أخرى", name_ar: item.fileName.replace(/\.[^.]+$/, ""),
          name_en: item.fileName.replace(/\.[^.]+$/, ""),
          description_ar: `ملف ${item.fileName}`, author: "", tags: [], suggested_price: 0,
        };

        const categoryType = folderHint || cls.type || "أخرى";

        // Determine target system
        let target = forceTarget;
        if (!target || target === "auto") {
          target = CATEGORY_TARGET[categoryType] || "books";
        }

        console.log(`🎯 ${item.fileName} → ${categoryType} → target: ${target}`);

        const result = await saveToTarget(supabase, item, cls, categoryType, target);
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
