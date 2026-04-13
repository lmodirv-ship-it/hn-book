import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { JSZip } from "https://esm.sh/jszip@3.10.1";

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

function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

function getMimeCategory(mime: string, ext: string): string {
  if (mime.startsWith("image/") || ["jpg","jpeg","png","gif","bmp","webp","tiff","ico","svg","heic","avif"].includes(ext)) return "image";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (["doc","docx","txt","rtf","odt","md"].includes(ext)) return "document";
  if (["ppt","pptx","key","odp"].includes(ext)) return "presentation";
  if (["xls","xlsx","csv","ods"].includes(ext)) return "spreadsheet";
  if (["zip","rar","7z","tar","gz"].includes(ext)) return "archive";
  if (["svg","ai","eps","psd","fig","sketch"].includes(ext)) return "design";
  if (["mp4","avi","mkv","mov","webm"].includes(ext)) return "video";
  if (["mp3","wav","aac","flac","ogg"].includes(ext)) return "audio";
  return "other";
}

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
    webp: "image/webp", svg: "image/svg+xml", bmp: "image/bmp",
    pdf: "application/pdf", doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    txt: "text/plain", csv: "text/csv", md: "text/markdown",
  };
  return map[ext] || "application/octet-stream";
}

interface AnalyzedItem {
  fileName: string;
  fileExt: string;
  mimeCategory: string;
  mimeType: string;
  fileSizeKB: number;
  fileBytes: Uint8Array;
  classification: any;
  fromArchive?: string;
}

async function classifyWithAI(fileBytes: Uint8Array, fileName: string, mimeType: string, mimeCategory: string): Promise<any> {
  if (mimeCategory !== "image" && mimeCategory !== "pdf") {
    const typeMap: Record<string, string> = {
      document: "وثائق", presentation: "عروض", spreadsheet: "وثائق",
      design: "قوالب", archive: "أخرى", image: "صور", pdf: "كتب",
      video: "أخرى", audio: "أخرى", other: "أخرى",
    };
    return {
      type: typeMap[mimeCategory] || "أخرى",
      name_ar: fileName.replace(/\.[^.]+$/, ""),
      name_fr: fileName.replace(/\.[^.]+$/, ""),
      name_en: fileName.replace(/\.[^.]+$/, ""),
      description_ar: `ملف ${fileName}`,
      description_fr: `Fichier ${fileName}`,
      description_en: `File ${fileName}`,
      author: "", tags: [], suggested_price: 0,
    };
  }

  try {
    let base64 = "";
    const chunkSize = 8192;
    for (let i = 0; i < fileBytes.length; i += chunkSize) {
      base64 += String.fromCharCode(...fileBytes.slice(i, i + chunkSize));
    }
    base64 = btoa(base64);

    const mediaType = mimeCategory === "pdf" ? "application/pdf" : mimeType;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this file and classify it. Return ONLY valid JSON:
{
  "type": "one of: كتب, بطاقات, قوالب, صور, وثائق, عروض, أخرى",
  "name_ar": "Arabic name/title for this content",
  "name_fr": "French name/title",
  "name_en": "English name/title",
  "description_ar": "Short Arabic description (1-2 sentences)",
  "description_fr": "Short French description",
  "description_en": "Short English description",
  "author": "Author if detectable, otherwise empty string",
  "tags": ["tag1", "tag2"],
  "suggested_price": 0
}

Classification rules:
- كتب = books, ebooks, PDF documents with chapters/pages
- بطاقات = business cards, invitation cards, greeting cards, ID cards
- قوالب = design templates, CV templates, social media templates
- صور = photos, illustrations, graphics, icons, wallpapers
- وثائق = documents, contracts, forms, certificates, invoices
- عروض = presentations, slideshows, pitch decks
- أخرى = anything that doesn't fit above

File name: ${fileName}`,
            },
            {
              type: "image_url",
              image_url: { url: `data:${mediaType};base64,${base64}` },
            },
          ],
        }],
        max_tokens: 2000,
        temperature: 0.1,
      }),
    });

    if (aiRes.ok) {
      const aiData = await aiRes.json();
      const content = aiData.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { return JSON.parse(jsonMatch[0]); } catch { /* fall through */ }
      }
    }
  } catch (e) {
    console.error("AI classification error:", e);
  }

  return null;
}

async function extractZipItems(fileBytes: Uint8Array, parentName: string): Promise<AnalyzedItem[]> {
  const items: AnalyzedItem[] = [];
  try {
    const zip = new JSZip();
    await zip.loadAsync(fileBytes);

    for (const [path, entry] of Object.entries(zip.files)) {
      const zipEntry = entry as any;
      if (zipEntry.dir) continue;
      // Skip hidden/system files
      const name = path.split("/").pop() || path;
      if (name.startsWith(".") || name.startsWith("__MACOSX") || path.includes("__MACOSX")) continue;

      const ext = getFileExtension(name);
      const mime = getMimeType(ext);
      const category = getMimeCategory(mime, ext);

      // Skip very small files (< 1KB, likely metadata)
      const bytes = new Uint8Array(await zipEntry.async("arraybuffer"));
      if (bytes.length < 512) continue;

      items.push({
        fileName: name,
        fileExt: ext,
        mimeCategory: category,
        mimeType: mime,
        fileSizeKB: Math.round(bytes.length / 1024),
        fileBytes: bytes,
        classification: null,
        fromArchive: parentName,
      });
    }
  } catch (e) {
    console.error("ZIP extraction error:", e);
  }
  return items;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") || "analyze"; // "analyze" or "save"

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ---- SAVE MODE: receive pre-analyzed items and persist them ----
    if (mode === "save") {
      const body = await req.json();
      const items = body.items as any[];
      if (!items || items.length === 0) {
        return new Response(JSON.stringify({ error: "No items to save" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results = [];
      for (const item of items) {
        try {
          const categoryType = item.category || "أخرى";
          const prefix = CATEGORY_PREFIXES[categoryType] || "HNX";

          // Get next number
          const { data: existingProducts } = await supabase
            .from("products")
            .select("badge")
            .like("badge", `${prefix}-%`);

          let maxNum = 0;
          if (existingProducts) {
            for (const p of existingProducts) {
              const match = p.badge?.match(new RegExp(`${prefix}-(\\d+)`));
              if (match) {
                const num = parseInt(match[1]);
                if (num > maxNum) maxNum = num;
              }
            }
          }
          const itemCode = `${prefix}-${String(maxNum + 1).padStart(4, "0")}`;

          const productName = `${itemCode} - ${item.name_ar}`;
          const descParts = [
            item.description_ar,
            item.author ? `المؤلف: ${item.author}` : "",
            `\n---\n🇫🇷 ${item.name_fr}: ${item.description_fr || ""}`,
            `🇬🇧 ${item.name_en}: ${item.description_en || ""}`,
          ].filter(Boolean);

          const { data: product, error: insertErr } = await supabase.from("products").insert({
            name: productName,
            short_description: item.description_ar || null,
            description: descParts.join("\n"),
            category: CATEGORY_LABELS[prefix] || categoryType,
            price: item.suggested_price || 0,
            image: item.cover_url || null,
            pdf_url: item.file_url && item.mimeCategory === "pdf" ? item.file_url : null,
            badge: itemCode,
            is_active: true,
            features: [
              item.author ? `المؤلف: ${item.author}` : "",
              `النوع: ${categoryType}`,
              `الصيغة: ${(item.fileExt || "").toUpperCase()}`,
              `الحجم: ${item.fileSizeKB || 0}KB`,
              ...(item.tags || []),
            ].filter(Boolean),
          }).select("id").single();

          if (insertErr) throw insertErr;

          // Insert file reference
          if (item.file_url) {
            const fileType = item.mimeCategory === "image" ? "image" : item.mimeCategory === "pdf" ? "pdf" : "other";
            await supabase.from("product_files").insert({
              product_id: product.id,
              file_type: fileType as any,
              file_name: `${itemCode}.${item.fileExt || "bin"}`,
              storage_path: item.storage_path || "",
              public_url: item.file_url,
              file_size: (item.fileSizeKB || 0) * 1024,
              is_primary: true,
            });
          }

          results.push({ success: true, id: product.id, code: itemCode, name: productName, index: item.index });
        } catch (e: any) {
          results.push({ success: false, error: e.message, index: item.index });
        }
      }

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- ANALYZE MODE: extract, classify, upload files, return analysis ----
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fileName = file.name;
    const fileExt = getFileExtension(fileName);
    const mimeType = file.type || "application/octet-stream";
    const mimeCategory = getMimeCategory(mimeType, fileExt);
    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const fileSizeKB = Math.round(fileBytes.length / 1024);

    console.log(`Analyzing: ${fileName} (${mimeType}, ${fileSizeKB}KB, category: ${mimeCategory})`);

    // Build list of items to analyze
    let items: AnalyzedItem[] = [];

    if (mimeCategory === "archive" && fileExt === "zip") {
      // Extract ZIP contents
      console.log("Extracting ZIP archive...");
      items = await extractZipItems(fileBytes, fileName);
      console.log(`Extracted ${items.length} files from ZIP`);
    } else {
      // Single file
      items.push({
        fileName, fileExt, mimeCategory, mimeType, fileSizeKB, fileBytes,
        classification: null,
      });
    }

    // Process each item: classify with AI + upload to storage
    const analyzedResults = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(`Analyzing item ${i + 1}/${items.length}: ${item.fileName}`);

      // Classify
      const classification = await classifyWithAI(item.fileBytes, item.fileName, item.mimeType, item.mimeCategory);
      const fallbackClassification = {
        type: "أخرى",
        name_ar: item.fileName.replace(/\.[^.]+$/, ""),
        name_fr: item.fileName.replace(/\.[^.]+$/, ""),
        name_en: item.fileName.replace(/\.[^.]+$/, ""),
        description_ar: `ملف ${item.fileName}`,
        description_fr: `Fichier ${item.fileName}`,
        description_en: `File ${item.fileName}`,
        author: "", tags: [], suggested_price: 0,
      };
      const cls = classification || fallbackClassification;

      // Upload file to storage
      const storageBucket = item.mimeCategory === "image" ? "book-images" : "book-files";
      const tempPath = `staging/${Date.now()}-${i}.${item.fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from(storageBucket)
        .upload(tempPath, item.fileBytes, { contentType: item.mimeType, upsert: true });

      let fileUrl: string | null = null;
      let storagePath = "";
      if (!uploadErr) {
        fileUrl = `${SUPABASE_URL}/storage/v1/object/public/${storageBucket}/${tempPath}`;
        storagePath = `${storageBucket}/${tempPath}`;
      } else {
        console.error("Upload error for", item.fileName, uploadErr);
      }

      // Use the image itself as cover if it's an image
      let coverUrl: string | null = null;
      if (item.mimeCategory === "image" && fileUrl) {
        coverUrl = fileUrl;
      }

      analyzedResults.push({
        index: i,
        fileName: item.fileName,
        fileExt: item.fileExt,
        mimeCategory: item.mimeCategory,
        fileSizeKB: item.fileSizeKB,
        fromArchive: item.fromArchive || null,
        category: cls.type,
        name_ar: cls.name_ar,
        name_fr: cls.name_fr,
        name_en: cls.name_en,
        description_ar: cls.description_ar,
        description_fr: cls.description_fr,
        description_en: cls.description_en,
        author: cls.author || "",
        tags: cls.tags || [],
        suggested_price: cls.suggested_price || 0,
        file_url: fileUrl,
        storage_path: storagePath,
        cover_url: coverUrl,
      });
    }

    return new Response(JSON.stringify({
      mode: "analyzed",
      source: fileName,
      total: analyzedResults.length,
      items: analyzedResults,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Process error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
