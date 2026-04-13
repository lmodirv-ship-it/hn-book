import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

// Category prefixes for numbering
const CATEGORY_PREFIXES: Record<string, string> = {
  "كتب": "HNB",
  "بطاقات": "HNC",
  "قوالب": "HNT",
  "صور": "HNI",
  "وثائق": "HND",
  "عروض": "HNP",
  "أخرى": "HNX",
};

const CATEGORY_LABELS: Record<string, string> = {
  "HNB": "كتب",
  "HNC": "بطاقات",
  "HNT": "قوالب",
  "HNI": "صور",
  "HND": "وثائق",
  "HNP": "عروض",
  "HNX": "أخرى",
};

function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

function getMimeCategory(mime: string, ext: string): string {
  if (mime.startsWith("image/") || ["jpg","jpeg","png","gif","bmp","webp","tiff","ico","svg","heic","heif","avif"].includes(ext)) return "image";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (["doc","docx","txt","rtf","odt","md","tex","pages"].includes(ext)) return "document";
  if (["ppt","pptx","key","odp"].includes(ext)) return "presentation";
  if (["xls","xlsx","csv","ods","numbers","tsv"].includes(ext)) return "spreadsheet";
  if (["zip","rar","7z","tar","gz","bz2","xz","tgz","cab","iso","dmg"].includes(ext)) return "archive";
  if (["svg","ai","eps","psd","fig","sketch","xd","indd","cdr","afdesign"].includes(ext)) return "design";
  if (["mp4","avi","mkv","mov","wmv","flv","webm","m4v","3gp"].includes(ext)) return "video";
  if (["mp3","wav","aac","flac","ogg","wma","m4a","aiff"].includes(ext)) return "audio";
  if (["html","htm","css","js","ts","jsx","tsx","py","java","c","cpp","rb","go","rs","php","swift","kt","json","xml","yaml","yml","toml","ini","cfg","conf","sh","bat","ps1","sql"].includes(ext)) return "code";
  if (["ttf","otf","woff","woff2","eot"].includes(ext)) return "font";
  if (["exe","msi","apk","deb","rpm","app","bin"].includes(ext)) return "executable";
  return "other";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

    console.log(`Processing: ${fileName} (${mimeType}, ${fileSizeKB}KB, category: ${mimeCategory})`);

    // Step 1: Use AI to classify and describe the file
    let aiClassification: any = null;

    // For images and PDFs, send to AI for visual analysis
    if (mimeCategory === "image" || mimeCategory === "pdf") {
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
          try { aiClassification = JSON.parse(jsonMatch[0]); } catch { /* ignore */ }
        }
      }
    }

    // For non-visual files, classify by extension/mime
    if (!aiClassification) {
      const typeMap: Record<string, string> = {
        document: "وثائق",
        presentation: "عروض",
        spreadsheet: "وثائق",
        design: "قوالب",
        archive: "أخرى",
        other: "أخرى",
        image: "صور",
        pdf: "كتب",
      };
      aiClassification = {
        type: typeMap[mimeCategory] || "أخرى",
        name_ar: fileName.replace(/\.[^.]+$/, ""),
        name_fr: fileName.replace(/\.[^.]+$/, ""),
        name_en: fileName.replace(/\.[^.]+$/, ""),
        description_ar: `ملف ${fileName}`,
        description_fr: `Fichier ${fileName}`,
        description_en: `File ${fileName}`,
        author: "",
        tags: [],
        suggested_price: 0,
      };
    }

    const categoryType = aiClassification.type || "أخرى";
    const prefix = CATEGORY_PREFIXES[categoryType] || "HNX";

    // Step 2: Get next number for this category prefix
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

    // Step 3: Upload file to storage
    const storageBucket = mimeCategory === "image" ? "book-images" : "book-files";
    const storagePath = `universal/${itemCode}/${Date.now()}.${fileExt}`;

    const { error: uploadErr } = await supabase.storage
      .from(storageBucket)
      .upload(storagePath, fileBytes, { contentType: mimeType, upsert: true });

    if (uploadErr) {
      console.error("Upload error:", uploadErr);
      return new Response(JSON.stringify({ error: "Failed to upload file", detail: uploadErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const filePublicUrl = `${SUPABASE_URL}/storage/v1/object/public/${storageBucket}/${storagePath}`;

    // Step 4: Generate cover/thumbnail image
    let coverUrl: string | null = null;
    try {
      const coverPrompt = `Professional thumbnail/cover for "${aiClassification.name_en}". Category: ${categoryType}. Clean modern design. Type: ${mimeCategory}. Title text prominently displayed.`;
      const coverRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: coverPrompt }],
          modalities: ["image", "text"],
        }),
      });

      if (coverRes.ok) {
        const coverData = await coverRes.json();
        const imageUrl = coverData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (imageUrl && imageUrl.startsWith("data:")) {
          const b64Part = imageUrl.split(",")[1];
          if (b64Part) {
            const imgBytes = Uint8Array.from(atob(b64Part), c => c.charCodeAt(0));
            const imgPath = `universal/${itemCode}/cover.png`;
            const { error: imgErr } = await supabase.storage
              .from("book-images")
              .upload(imgPath, imgBytes, { contentType: "image/png", upsert: true });
            if (!imgErr) {
              coverUrl = `${SUPABASE_URL}/storage/v1/object/public/book-images/${imgPath}`;
            }
          }
        }
      }
    } catch (e) {
      console.error("Cover generation error:", e);
    }

    // If the file itself is an image, use it as cover
    if (mimeCategory === "image" && !coverUrl) {
      coverUrl = filePublicUrl;
    }

    // Step 5: Insert product
    const productName = `${itemCode} - ${aiClassification.name_ar}`;
    const descParts = [
      aiClassification.description_ar,
      aiClassification.author ? `المؤلف: ${aiClassification.author}` : "",
      `\n---\n🇫🇷 ${aiClassification.name_fr}: ${aiClassification.description_fr || ""}`,
      `🇬🇧 ${aiClassification.name_en}: ${aiClassification.description_en || ""}`,
    ].filter(Boolean);

    const { data: product, error: insertErr } = await supabase.from("products").insert({
      name: productName,
      short_description: aiClassification.description_ar || null,
      description: descParts.join("\n"),
      category: CATEGORY_LABELS[prefix] || categoryType,
      price: aiClassification.suggested_price || 0,
      image: coverUrl,
      pdf_url: mimeCategory === "pdf" ? filePublicUrl : null,
      badge: itemCode,
      is_active: true,
      features: [
        aiClassification.author ? `المؤلف: ${aiClassification.author}` : "",
        `النوع: ${categoryType}`,
        `الصيغة: ${fileExt.toUpperCase()}`,
        `الحجم: ${fileSizeKB}KB`,
        ...(aiClassification.tags || []),
      ].filter(Boolean),
    }).select("id").single();

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to save product", detail: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 6: Insert file reference
    const fileType = mimeCategory === "image" ? "image" : mimeCategory === "pdf" ? "pdf" : "other";
    await supabase.from("product_files").insert({
      product_id: product.id,
      file_type: fileType as any,
      file_name: `${itemCode}.${fileExt}`,
      storage_path: `${storageBucket}/${storagePath}`,
      public_url: filePublicUrl,
      file_size: fileBytes.length,
      is_primary: true,
    });

    // Insert cover reference
    if (coverUrl && coverUrl !== filePublicUrl) {
      await supabase.from("product_files").insert({
        product_id: product.id,
        file_type: "image" as any,
        file_name: `${itemCode}-cover.jpg`,
        storage_path: `book-images/universal/${itemCode}/cover.jpg`,
        public_url: coverUrl,
        is_primary: false,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      id: product.id,
      code: itemCode,
      category: categoryType,
      name: productName,
      cover: coverUrl,
      file_url: filePublicUrl,
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
