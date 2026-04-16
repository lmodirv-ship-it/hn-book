import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { action, ...params } = await req.json();

    // ── ACTION: train — Rebuild model from classification_data ──
    if (action === "train") {
      return await handleTrain(supabase);
    }

    // ── ACTION: predict — Use learned model to classify ──
    if (action === "predict") {
      return await handlePredict(supabase, params);
    }

    // ── ACTION: correct — Admin corrects a prediction ──
    if (action === "correct") {
      return await handleCorrect(supabase, params);
    }

    // ── ACTION: stats — Get model statistics ──
    if (action === "stats") {
      return await handleStats(supabase);
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("ML Classifier error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── TRAIN: Aggregate classification_data into classification_model ──
async function handleTrain(supabase: any) {
  console.log("🧠 Starting model training...");

  // Get all data where actual_type is set (confirmed or corrected)
  const { data: allData, error } = await supabase
    .from("classification_data")
    .select("*")
    .not("actual_type", "is", null);

  if (error) throw new Error("Failed to fetch training data: " + error.message);
  if (!allData || allData.length === 0) {
    return jsonResponse({ message: "No training data available", trained: false });
  }

  // Group by actual_type
  const groups: Record<string, any[]> = {};
  for (const row of allData) {
    const type = row.actual_type;
    if (!groups[type]) groups[type] = [];
    groups[type].push(row);
  }

  const modelEntries = [];

  for (const [designType, rows] of Object.entries(groups)) {
    const widths = rows.filter(r => r.width).map(r => r.width);
    const heights = rows.filter(r => r.height).map(r => r.height);
    const ratios = rows.filter(r => r.aspect_ratio).map(r => Number(r.aspect_ratio));
    const sizes = rows.filter(r => r.file_size_kb).map(r => r.file_size_kb);

    // Count correct predictions
    const correctCount = rows.filter(r => r.predicted_type === r.actual_type).length;

    // Extract common keywords from filenames
    const allKeywords = rows.flatMap(r => r.filename_keywords || []);
    const kwCount: Record<string, number> = {};
    for (const kw of allKeywords) {
      kwCount[kw] = (kwCount[kw] || 0) + 1;
    }
    const commonKw = Object.entries(kwCount)
      .filter(([_, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([kw]) => kw);

    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    modelEntries.push({
      design_type: designType,
      avg_width: Math.round(avg(widths)),
      avg_height: Math.round(avg(heights)),
      avg_aspect_ratio: Number(avg(ratios).toFixed(3)),
      min_width: widths.length ? Math.min(...widths) : 0,
      max_width: widths.length ? Math.max(...widths) : 99999,
      min_height: heights.length ? Math.min(...heights) : 0,
      max_height: heights.length ? Math.max(...heights) : 99999,
      common_keywords: commonKw,
      sample_count: rows.length,
      correct_predictions: correctCount,
      accuracy: rows.length > 0 ? Number((correctCount / rows.length * 100).toFixed(1)) : 0,
      avg_file_size_kb: Math.round(avg(sizes)),
    });
  }

  // Upsert model entries
  for (const entry of modelEntries) {
    await supabase
      .from("classification_model")
      .upsert(entry, { onConflict: "design_type" });
  }

  console.log(`✅ Trained model with ${allData.length} samples across ${modelEntries.length} types`);

  return jsonResponse({
    trained: true,
    totalSamples: allData.length,
    types: modelEntries.length,
    models: modelEntries.map(m => ({
      type: m.design_type,
      samples: m.sample_count,
      accuracy: m.accuracy,
    })),
  });
}

// ── Built-in rules (used when no model or as baseline) ──
interface RuleResult { type: string; confidence: number; reason: string }

function classifyByRules(width: number | null, height: number | null, fileType: string | null, fileSizeKB: number | null, filename: string | null): RuleResult {
  const w = width || 0, h = height || 0;
  const ratio = h > 0 ? w / h : 0;
  const maxDim = Math.max(w, h), minDim = Math.min(w, h);
  const name = (filename || "").toLowerCase();

  // Keyword rules (highest priority)
  const kwRules: [string[], string][] = [
    [["carte", "visite", "business-card", "card", "بطاقة"], "card"],
    [["logo", "logotype", "شعار", "icon"], "logo"],
    [["flyer", "tract", "leaflet", "فلاير", "نشرة", "brochure"], "flyer"],
    [["poster", "affiche", "ملصق"], "poster"],
    [["menu", "قائمة", "carte-menu"], "menu"],
    [["tablou", "tableau", "wall-art", "تابلو", "لوحة", "art"], "tablou"],
    [["banner", "بانر", "header"], "banner"],
    [["sticker", "ملصق-صغير"], "sticker"],
    [["social", "instagram", "facebook", "post", "story"], "social"],
  ];

  for (const [keywords, type] of kwRules) {
    for (const kw of keywords) {
      if (name.includes(kw)) {
        return { type, confidence: 0.85, reason: `كلمة مفتاحية: ${kw}` };
      }
    }
  }

  if (!w || !h) {
    // File type fallback
    if (fileType === "pdf") {
      if ((fileSizeKB || 0) > 5000) return { type: "book", confidence: 0.7, reason: "PDF كبير" };
      return { type: "document", confidence: 0.5, reason: "PDF عام" };
    }
    return { type: "other", confidence: 0.2, reason: "لا توجد أبعاد" };
  }

  // Card: small landscape ~85x55mm (1050x600px at 300dpi)
  if (minDim >= 400 && minDim <= 900 && maxDim >= 700 && maxDim <= 1400 && ratio >= 1.3 && ratio <= 2.2) {
    return { type: "card", confidence: 0.8, reason: `أبعاد بطاقة: ${w}×${h}px` };
  }

  // Logo: square-ish, small
  if (ratio >= 0.8 && ratio <= 1.25 && maxDim <= 1200 && minDim >= 100) {
    return { type: "logo", confidence: 0.7, reason: `شعار مربع: ${w}×${h}px` };
  }

  // Social story: 9:16
  if (ratio >= 0.5 && ratio <= 0.6 && h >= 1800) {
    return { type: "social", confidence: 0.75, reason: `ستوري: ${w}×${h}px` };
  }

  // Tablou/Poster: large high-res
  if (maxDim >= 3000) {
    return { type: "tablou", confidence: 0.75, reason: `صورة عالية الدقة: ${w}×${h}px` };
  }

  // Flyer A4: ratio ~0.7, 2400-4200px
  if (ratio >= 0.6 && ratio <= 0.8 && maxDim >= 2400 && maxDim <= 4200) {
    return { type: "flyer", confidence: 0.65, reason: `أبعاد A4: ${w}×${h}px` };
  }

  // Banner: very wide or tall
  if (ratio >= 3 || ratio <= 0.33) {
    return { type: "banner", confidence: 0.7, reason: `بانر: ${w}×${h}px` };
  }

  // Large landscape
  if (maxDim >= 2000 && ratio >= 1.2) {
    return { type: "poster", confidence: 0.55, reason: `صورة أفقية كبيرة: ${w}×${h}px` };
  }

  // Medium image
  if ((fileSizeKB || 0) > 500 && maxDim >= 1000) {
    return { type: "tablou", confidence: 0.45, reason: `صورة متوسطة: ${w}×${h}px` };
  }

  return { type: "other", confidence: 0.2, reason: `أبعاد غير محددة: ${w}×${h}px` };
}

// ── PREDICT: Use model stats + rules to classify ──
async function handlePredict(supabase: any, params: any) {
  const { width, height, file_type, file_size_kb, filename } = params;

  // Always run rules first as baseline
  const ruleResult = classifyByRules(width, height, file_type, file_size_kb, filename);

  // Load learned model
  const { data: models } = await supabase
    .from("classification_model")
    .select("*")
    .gt("sample_count", 0);

  if (!models || models.length === 0) {
    // No model trained — return rules result
    return jsonResponse({
      predicted_type: ruleResult.type,
      confidence: ruleResult.confidence,
      reason: ruleResult.reason,
      source: "rules",
      needs_confirmation: ruleResult.confidence < 0.5,
    });
  }

  const ratio = width && height ? width / height : null;
  const nameLower = (filename || "").toLowerCase();

  // Extract keywords from filename
  const nameKeywords = nameLower
    .replace(/\.[^.]+$/, "")
    .split(/[-_\s.]+/)
    .filter((w: string) => w.length > 2);

  let bestType = "other";
  let bestScore = 0;
  let bestReason = "";

  for (const model of models) {
    let score = 0;
    const reasons: string[] = [];

    // Keyword matching (strongest signal)
    const kwMatches = nameKeywords.filter((kw: string) =>
      (model.common_keywords || []).some((mk: string) => mk.includes(kw) || kw.includes(mk))
    );
    if (kwMatches.length > 0) {
      score += 0.4 * Math.min(kwMatches.length / 2, 1);
      reasons.push(`كلمات: ${kwMatches.join(", ")}`);
    }

    // Dimension range matching
    if (width && height) {
      const inWidthRange = width >= (model.min_width * 0.8) && width <= (model.max_width * 1.2);
      const inHeightRange = height >= (model.min_height * 0.8) && height <= (model.max_height * 1.2);
      if (inWidthRange && inHeightRange) {
        score += 0.25;
        reasons.push("أبعاد متطابقة");
      }

      // Aspect ratio similarity
      if (ratio && model.avg_aspect_ratio > 0) {
        const ratioDiff = Math.abs(ratio - Number(model.avg_aspect_ratio));
        if (ratioDiff < 0.3) {
          score += 0.15 * (1 - ratioDiff / 0.3);
          reasons.push(`نسبة عرض/ارتفاع قريبة (${ratio.toFixed(2)} vs ${Number(model.avg_aspect_ratio).toFixed(2)})`);
        }
      }
    }

    // File size similarity
    if (file_size_kb && model.avg_file_size_kb > 0) {
      const sizeRatio = file_size_kb / Number(model.avg_file_size_kb);
      if (sizeRatio >= 0.3 && sizeRatio <= 3) {
        score += 0.1;
        reasons.push("حجم ملف مشابه");
      }
    }

    // Boost by model accuracy (reward well-performing models)
    score *= (0.5 + Number(model.accuracy) / 200);

    // Boost by sample count (more data = more trust)
    const sampleBoost = Math.min(model.sample_count / 50, 1) * 0.1;
    score += sampleBoost;

    if (score > bestScore) {
      bestScore = score;
      bestType = model.design_type;
      bestReason = reasons.join(" | ");
    }
  }

  const confidence = Math.min(bestScore, 0.99);

  return jsonResponse({
    predicted_type: bestType,
    confidence: Number(confidence.toFixed(3)),
    reason: bestReason || "تطابق ضعيف",
    source: "ml_model",
    needs_confirmation: confidence < 0.5,
  });
}

// ── CORRECT: Save admin correction ──
async function handleCorrect(supabase: any, params: any) {
  const { classification_id, actual_type, corrected_by } = params;

  if (!classification_id || !actual_type) {
    return jsonResponse({ error: "classification_id and actual_type required" }, 400);
  }

  const { error } = await supabase
    .from("classification_data")
    .update({
      actual_type,
      was_corrected: true,
      corrected_by: corrected_by || null,
    })
    .eq("id", classification_id);

  if (error) throw new Error("Failed to save correction: " + error.message);

  return jsonResponse({ success: true, message: "تم حفظ التصحيح" });
}

// ── STATS: Return model overview ──
async function handleStats(supabase: any) {
  const [modelRes, dataRes, correctionsRes] = await Promise.all([
    supabase.from("classification_model").select("*").order("sample_count", { ascending: false }),
    supabase.from("classification_data").select("id", { count: "exact", head: true }),
    supabase.from("classification_data").select("id", { count: "exact", head: true }).eq("was_corrected", true),
  ]);

  const models = modelRes.data || [];
  const totalSamples = dataRes.count || 0;
  const totalCorrections = correctionsRes.count || 0;

  const totalCorrect = models.reduce((sum: number, m: any) => sum + (m.correct_predictions || 0), 0);
  const totalModelSamples = models.reduce((sum: number, m: any) => sum + (m.sample_count || 0), 0);
  const overallAccuracy = totalModelSamples > 0 ? Number((totalCorrect / totalModelSamples * 100).toFixed(1)) : 0;

  return jsonResponse({
    totalSamples,
    totalCorrections,
    overallAccuracy,
    modelCount: models.length,
    models: models.map((m: any) => ({
      type: m.design_type,
      samples: m.sample_count,
      accuracy: Number(m.accuracy),
      correctPredictions: m.correct_predictions,
      avgWidth: Number(m.avg_width),
      avgHeight: Number(m.avg_height),
      avgRatio: Number(m.avg_aspect_ratio),
      commonKeywords: m.common_keywords || [],
      avgFileSizeKB: Number(m.avg_file_size_kb),
    })),
  });
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
