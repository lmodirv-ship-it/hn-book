import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

interface ProcessingResult {
  engine: string;
  text: string;
  structured_data?: Record<string, any>;
  confidence?: number;
  metadata?: Record<string, any>;
}

async function processWithGemini(fileBytes: Uint8Array, mimeType: string, fileName: string, prompt?: string): Promise<ProcessingResult> {
  const maxBytes = 4 * 1024 * 1024;
  const processBytes = fileBytes.length > maxBytes ? fileBytes.slice(0, maxBytes) : fileBytes;

  let b64 = "";
  const cs = 8192;
  for (let i = 0; i < processBytes.length; i += cs) {
    b64 += String.fromCharCode(...processBytes.slice(i, i + cs));
  }
  b64 = btoa(b64);

  const systemPrompt = prompt || `أنت محلل مستندات ذكي. قم بتحليل هذا الملف واستخرج:
1. النص الكامل بالترتيب الصحيح
2. البيانات المنظمة (جداول، قوائم، عناوين)
3. معلومات وصفية (عنوان، مؤلف، تاريخ، لغة)

أرجع النتيجة بتنسيق JSON:
{
  "extracted_text": "النص الكامل",
  "title": "العنوان إن وجد",
  "author": "المؤلف إن وجد",
  "language": "اللغة",
  "tables": [{"headers": [], "rows": [[]]}],
  "key_points": ["نقطة 1"],
  "entities": [{"name": "", "type": "person|org|date|location"}],
  "summary": "ملخص قصير"
}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: systemPrompt },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${b64}` } },
        ],
      }],
      max_tokens: 4000,
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Gemini error:", res.status, errText);
    throw new Error(`Gemini API error: ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";

  let structured: Record<string, any> = {};
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { structured = JSON.parse(jsonMatch[0]); } catch {}
  }

  return {
    engine: "Gemini Vision",
    text: structured.extracted_text || content,
    structured_data: structured,
    confidence: 0.85,
    metadata: {
      title: structured.title,
      author: structured.author,
      language: structured.language,
    },
  };
}

async function processWithFirecrawl(fileUrl: string): Promise<ProcessingResult | null> {
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  if (!FIRECRAWL_API_KEY) {
    console.log("Firecrawl API key not available, skipping");
    return null;
  }

  try {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: fileUrl,
        formats: ["markdown"],
        onlyMainContent: false,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Firecrawl error:", res.status, errText);
      return null;
    }

    const data = await res.json();
    const markdown = data.data?.markdown || data.markdown || "";

    return {
      engine: "Firecrawl",
      text: markdown,
      structured_data: { markdown, metadata: data.data?.metadata || data.metadata },
      confidence: 0.80,
      metadata: data.data?.metadata || data.metadata,
    };
  } catch (e) {
    console.error("Firecrawl processing error:", e);
    return null;
  }
}

function mergeResults(results: ProcessingResult[]): ProcessingResult {
  if (results.length === 1) return results[0];

  // Prefer result with more text content
  const sorted = results.sort((a, b) => (b.text?.length || 0) - (a.text?.length || 0));
  const best = sorted[0];

  return {
    engine: results.map(r => r.engine).join(" + "),
    text: best.text,
    structured_data: {
      ...best.structured_data,
      alternative_engines: results.slice(1).map(r => ({
        engine: r.engine,
        text_length: r.text?.length || 0,
        confidence: r.confidence,
      })),
    },
    confidence: Math.max(...results.map(r => r.confidence || 0)),
    metadata: best.metadata,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const contentType = req.headers.get("content-type") || "";
    let fileBytes: Uint8Array;
    let fileName: string;
    let mimeType: string;
    let customPrompt: string | undefined;
    let useEngines: string[] = ["gemini"];
    let fileUrl: string | undefined;

    if (contentType.includes("application/json")) {
      const body = await req.json();
      const { storage_path, file_name, bucket, prompt, engines, url } = body;

      customPrompt = prompt;
      useEngines = engines || ["gemini"];
      fileUrl = url;

      if (url && !storage_path) {
        // URL-only mode for Firecrawl
        const results: ProcessingResult[] = [];
        const fcResult = await processWithFirecrawl(url);
        if (fcResult) results.push(fcResult);

        if (results.length === 0) {
          return new Response(JSON.stringify({ error: "لم يتمكن أي محرك من معالجة الرابط" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({
          success: true,
          result: mergeResults(results),
          engines_used: results.map(r => r.engine),
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (!storage_path || !file_name) {
        return new Response(JSON.stringify({ error: "storage_path and file_name required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const bucketName = bucket || "book-files";
      const { data: fileData, error: dlError } = await supabase.storage.from(bucketName).download(storage_path);

      if (dlError || !fileData) {
        return new Response(JSON.stringify({ error: "فشل تحميل الملف من التخزين" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      fileName = file_name;
      mimeType = fileData.type || "application/octet-stream";
      fileBytes = new Uint8Array(await fileData.arrayBuffer());
      fileUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucketName}/${storage_path}`;
    } else {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      customPrompt = formData.get("prompt") as string | undefined;
      const enginesParam = formData.get("engines") as string | undefined;
      useEngines = enginesParam ? enginesParam.split(",") : ["gemini"];

      if (!file) {
        return new Response(JSON.stringify({ error: "No file provided" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      fileName = file.name;
      mimeType = file.type || "application/octet-stream";
      fileBytes = new Uint8Array(await file.arrayBuffer());

      // Upload to temp storage for Firecrawl if needed
      if (useEngines.includes("firecrawl")) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const tempPath = `temp-ocr/${crypto.randomUUID()}-${fileName}`;
        await supabase.storage.from("book-files").upload(tempPath, fileBytes, { contentType: mimeType, upsert: true });
        fileUrl = `${SUPABASE_URL}/storage/v1/object/public/book-files/${tempPath}`;
      }
    }

    console.log(`📄 Processing document: ${fileName} (${mimeType}, ${Math.round(fileBytes!.length / 1024)}KB)`);
    console.log(`🔧 Engines: ${useEngines.join(", ")}`);

    const results: ProcessingResult[] = [];

    // Gemini Vision processing
    if (useEngines.includes("gemini")) {
      try {
        const geminiResult = await processWithGemini(fileBytes!, mimeType!, fileName!, customPrompt);
        results.push(geminiResult);
        console.log(`✅ Gemini: ${geminiResult.text?.length || 0} chars`);
      } catch (e) {
        console.error("❌ Gemini failed:", e);
      }
    }

    // Firecrawl processing
    if (useEngines.includes("firecrawl") && fileUrl) {
      try {
        const fcResult = await processWithFirecrawl(fileUrl);
        if (fcResult) {
          results.push(fcResult);
          console.log(`✅ Firecrawl: ${fcResult.text?.length || 0} chars`);
        }
      } catch (e) {
        console.error("❌ Firecrawl failed:", e);
      }
    }

    if (results.length === 0) {
      return new Response(JSON.stringify({ error: "فشلت جميع محركات المعالجة" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const merged = mergeResults(results);

    return new Response(JSON.stringify({
      success: true,
      file_name: fileName!,
      file_size_kb: Math.round(fileBytes!.length / 1024),
      result: merged,
      engines_used: results.map(r => r.engine),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("Process document error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
