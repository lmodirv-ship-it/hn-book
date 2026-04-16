/**
 * AI Classification Service
 * 
 * Calls the ml-classifier edge function for intelligent design classification.
 * Falls back to local rule-based classification if the AI engine is unavailable.
 */

import { supabase } from "@/integrations/supabase/client";

export interface ClassifyInput {
  filename: string;
  width?: number | null;
  height?: number | null;
  file_type?: string | null;
  file_size_kb?: number | null;
}

export interface ClassifyResult {
  type: string;
  confidence: number;
  ratio: number | null;
  keywords: string[];
  source: "ml" | "rules" | "fallback";
  needs_confirmation: boolean;
}

export interface AIEngineStatus {
  running: boolean;
  totalSamples: number;
  overallAccuracy: number;
  modelCount: number;
}

// ─── Local fallback rules (mirrors Python logic) ───

function getRatio(w?: number | null, h?: number | null): number | null {
  if (!w || !h) return null;
  return Math.round((w / h) * 100) / 100;
}

function detectKeywords(filename: string): string[] {
  const name = filename.toLowerCase();
  const kw: string[] = [];
  if (/card|visite/.test(name)) kw.push("card");
  if (/flyer|poster/.test(name)) kw.push("flyer");
  if (/logo/.test(name)) kw.push("logo");
  if (/menu/.test(name)) kw.push("menu");
  if (/book|pdf/.test(name)) kw.push("book");
  if (/tablou|tableau|art/.test(name)) kw.push("tablou");
  if (/banner/.test(name)) kw.push("banner");
  return kw;
}

function localClassify(data: ClassifyInput): ClassifyResult {
  const ratio = getRatio(data.width, data.height);
  const keywords = detectKeywords(data.filename);
  let type = "other";
  let confidence = 0.5;

  if ((ratio && ratio >= 1.4 && ratio <= 1.8) || keywords.includes("card")) {
    type = "card"; confidence = 0.85;
  } else if ((ratio && ratio >= 0.9 && ratio <= 1.1) || keywords.includes("logo")) {
    type = "logo"; confidence = 0.8;
  } else if ((ratio && ratio >= 0.6 && ratio <= 0.8) || keywords.includes("flyer")) {
    type = "flyer"; confidence = 0.75;
  } else if (keywords.includes("menu")) {
    type = "menu"; confidence = 0.8;
  } else if (ratio && ratio > 1.8) {
    type = "tablou"; confidence = 0.7;
  } else if (keywords.includes("book")) {
    type = "book"; confidence = 0.75;
  }

  return { type, confidence, ratio, keywords, source: "fallback", needs_confirmation: confidence < 0.7 };
}

// ─── Main classify function ───

export async function classifyFile(data: ClassifyInput): Promise<ClassifyResult> {
  try {
    const { data: res, error } = await supabase.functions.invoke("ml-classifier", {
      body: {
        action: "predict",
        width: data.width ?? null,
        height: data.height ?? null,
        filename: data.filename,
        file_type: data.file_type ?? null,
        file_size_kb: data.file_size_kb ?? null,
      },
    });

    if (error || !res?.predicted_type) {
      console.warn("AI engine unavailable, using fallback:", error);
      return localClassify(data);
    }

    return {
      type: res.predicted_type,
      confidence: res.confidence ?? 0.5,
      ratio: getRatio(data.width, data.height),
      keywords: detectKeywords(data.filename),
      source: res.source === "model" ? "ml" : "rules",
      needs_confirmation: res.needs_confirmation ?? res.confidence < 0.7,
    };
  } catch (err) {
    console.warn("AI service error, using fallback:", err);
    return localClassify(data);
  }
}

// ─── Health check ───

export async function checkAIHealth(): Promise<AIEngineStatus> {
  try {
    const { data, error } = await supabase.functions.invoke("ml-classifier", {
      body: { action: "stats" },
    });

    if (error || !data) {
      return { running: false, totalSamples: 0, overallAccuracy: 0, modelCount: 0 };
    }

    return {
      running: true,
      totalSamples: data.totalSamples ?? 0,
      overallAccuracy: data.overallAccuracy ?? 0,
      modelCount: data.modelCount ?? 0,
    };
  } catch {
    return { running: false, totalSamples: 0, overallAccuracy: 0, modelCount: 0 };
  }
}

// ─── Log classification to DB ───

export async function logClassification(
  filename: string,
  predictedType: string,
  confidence: number,
  width?: number | null,
  height?: number | null,
  fileType?: string | null,
  fileSizeKb?: number | null,
): Promise<void> {
  try {
    await supabase.from("classification_data").insert({
      file_name: filename,
      predicted_type: predictedType,
      confidence,
      width: width ?? null,
      height: height ?? null,
      file_type: fileType ?? null,
      file_size_kb: fileSizeKb ?? null,
      aspect_ratio: width && height ? Math.round((width / height) * 100) / 100 : null,
      filename_keywords: detectKeywords(filename),
    });
  } catch (err) {
    console.error("Failed to log classification:", err);
  }
}

// ─── Correct a classification ───

export async function correctClassification(id: string, correctType: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke("ml-classifier", {
      body: { action: "correct", id, correct_type: correctType },
    });

    if (error) {
      console.error("Correction failed:", error);
      return false;
    }

    return data?.success ?? false;
  } catch {
    return false;
  }
}

export const aiService = {
  classifyFile,
  checkAIHealth,
  logClassification,
  correctClassification,
};
