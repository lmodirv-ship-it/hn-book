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
  "وثائق": "HND", "عروض": "HNP", "أخرى": "HNX",
};
const CATEGORY_LABELS: Record<string, string> = {
  HNB: "كتب", HNC: "بطاقات", HNT: "قوالب", HNI: "صور",
  HND: "وثائق", HNP: "عروض", HNX: "أخرى",
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
}

async function classifyAI(bytes: Uint8Array, name: string, mime: string, cat: string): Promise<any> {
  if (cat !== "image" && cat !== "pdf") {
    const map: Record<string, string> = {
      document: "وثائق", presentation: "عروض", spreadsheet: "وثائق",
      design: "قوالب", image: "صور", pdf: "كتب", other: "أخرى",
    };
    return {
      type: map[cat] || "أخرى",
      name_ar: name.replace(/\.[^.]+$/, ""),
      name_en: name.replace(/\.[^.]+$/, ""),
      description_ar: `ملف ${name}`,
      author: "", tags: [], suggested_price: 0,
    };
  }

  try {
    let b64 = "";
    const cs = 8192;
    for (let i = 0; i < bytes.length; i += cs) {
      b64 += String.fromCharCode(...bytes.slice(i, i + cs));
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
{"type":"one of: كتب, بطاقات, قوالب, صور, وثائق, عروض, أخرى","name_ar":"Arabic title","name_en":"English title","description_ar":"Short Arabic description","author":"author or empty","tags":["tag1"],"suggested_price":0}
Rules: كتب=books/ebooks, بطاقات=cards, قوالب=templates, صور=photos/graphics, وثائق=documents/forms, عروض=presentations, أخرى=other. File: ${name}` },
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
      items.push({ fileName: name, fileExt: ext, mimeCategory: cat, mimeType: mime, fileSizeKB: Math.round(b.length / 1024), fileBytes: b, fromArchive: parent });
    }
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ===== FULL MODE (default): analyze + classify + upload + number + save =====
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fileName = file.name;
    const fileExt = getExt(fileName);
    const mimeType = file.type || "application/octet-stream";
    const mimeCategory = getMimeCat(mimeType, fileExt);
    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const fileSizeKB = Math.round(fileBytes.length / 1024);

    console.log(`📦 Processing: ${fileName} (${mimeType}, ${fileSizeKB}KB, ${mimeCategory})`);

    // 1. Extract items (ZIP → multiple, others → single)
    let rawItems: RawItem[] = [];
    if (mimeCategory === "archive" && fileExt === "zip") {
      rawItems = await extractZip(fileBytes, fileName);
      console.log(`📂 Extracted ${rawItems.length} files from ZIP`);
    } else {
      rawItems.push({ fileName, fileExt, mimeCategory, mimeType, fileSizeKB, fileBytes });
    }

    // 2. Process each item: classify → upload → number → save → create references
    const results = [];

    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i];
      console.log(`🔍 [${i+1}/${rawItems.length}] ${item.fileName}`);

      try {
        // AI Classification
        const cls = await classifyAI(item.fileBytes, item.fileName, item.mimeType, item.mimeCategory) || {
          type: "أخرى", name_ar: item.fileName.replace(/\.[^.]+$/, ""),
          name_en: item.fileName.replace(/\.[^.]+$/, ""),
          description_ar: `ملف ${item.fileName}`, author: "", tags: [], suggested_price: 0,
        };

        const categoryType = cls.type || "أخرى";
        const prefix = CATEGORY_PREFIXES[categoryType] || "HNX";

        // Generate unique code
        const itemCode = await getNextCode(supabase, prefix);

        // Upload file to storage
        const bucket = item.mimeCategory === "image" ? "book-images" : "book-files";
        const storagePath = `products/${itemCode}/${itemCode}.${item.fileExt}`;

        const { error: uploadErr } = await supabase.storage
          .from(bucket)
          .upload(storagePath, item.fileBytes, { contentType: item.mimeType, upsert: true });

        if (uploadErr) {
          console.error("Upload failed:", uploadErr);
          results.push({ success: false, fileName: item.fileName, error: "فشل رفع الملف" });
          continue;
        }

        const fileUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${storagePath}`;

        // Cover: use image itself, or null for others
        const coverUrl = item.mimeCategory === "image" ? fileUrl : null;

        // Build product name and description
        const productName = `${itemCode} - ${cls.name_ar}`;
        const description = [
          cls.description_ar,
          cls.author ? `المؤلف: ${cls.author}` : "",
          cls.name_en ? `\n---\n🇬🇧 ${cls.name_en}` : "",
        ].filter(Boolean).join("\n");

        // Insert product
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
            `الحجم: ${item.fileSizeKB}KB`,
            ...(cls.tags || []),
          ].filter(Boolean),
        }).select("id").single();

        if (insertErr) {
          console.error("DB insert failed:", insertErr);
          results.push({ success: false, fileName: item.fileName, error: "فشل الحفظ في قاعدة البيانات" });
          continue;
        }

        // Insert file reference
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

        console.log(`✅ ${itemCode} saved: ${productName}`);

        results.push({
          success: true,
          id: product.id,
          code: itemCode,
          category: categoryType,
          name: productName,
          cover: coverUrl,
          file_url: fileUrl,
          fileName: item.fileName,
          fromArchive: item.fromArchive || null,
          fileSizeKB: item.fileSizeKB,
          fileExt: item.fileExt,
        });
      } catch (e: any) {
        console.error(`❌ Failed ${item.fileName}:`, e);
        results.push({ success: false, fileName: item.fileName, error: e.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
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
