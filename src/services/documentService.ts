/**
 * Document Processing Service
 * Handles OCR processing, history, and document management.
 */

import { db, ok, fail, type ApiResult } from "@/api/client";

export interface ProcessingResult {
  engine: string;
  text: string;
  structured_data?: any;
  confidence?: number;
  metadata?: any;
}

export interface SavedDoc {
  id: string;
  file_name: string;
  engines_used: string[];
  extracted_text: string;
  structured_data: any;
  confidence: number;
  created_at: string;
}

export const documentService = {
  async getHistory(limit = 20): Promise<SavedDoc[]> {
    const { data, error } = await db
      .from("processed_documents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) { console.error("Load history error:", error); return []; }
    return (data ?? []) as unknown as SavedDoc[];
  },

  async saveResult(params: {
    fileName: string;
    result: ProcessingResult;
    engines: string[];
    fileSizeKb?: number;
    fileType?: string;
    customPrompt?: string;
  }): Promise<void> {
    const { data: { user } } = await db.auth.getUser();
    const { error } = await db.from("processed_documents").insert({
      user_id: user?.id || null,
      file_name: params.fileName,
      file_type: params.fileType || "url",
      file_size_kb: params.fileSizeKb || null,
      engines_used: params.engines,
      extracted_text: params.result.text,
      structured_data: params.result.structured_data || {},
      confidence: params.result.confidence || null,
      metadata: params.result.metadata || {},
      custom_prompt: params.customPrompt || null,
    } as any);
    if (error) console.error("Save result error:", error);
  },

  async processFile(file: File, engines: string[], customPrompt?: string): Promise<ApiResult<{ result: ProcessingResult; engines_used: string[] }>> {
    const tempPath = `temp-ocr/${crypto.randomUUID()}-${file.name}`;
    const { error: uploadErr } = await db.storage
      .from("book-files")
      .upload(tempPath, file, { contentType: file.type, upsert: true });
    if (uploadErr) return fail("فشل رفع الملف");

    const response = await db.functions.invoke("process-document", {
      body: {
        storage_path: tempPath,
        file_name: file.name,
        bucket: "book-files",
        engines,
        prompt: customPrompt || undefined,
      },
    });
    if (response.error) return fail(response.error.message);
    const data = response.data;
    if (data?.success) return ok({ result: data.result, engines_used: data.engines_used || [] });
    return fail(data?.error || "فشلت المعالجة");
  },

  async processUrl(url: string, engines: string[], customPrompt?: string): Promise<ApiResult<{ result: ProcessingResult; engines_used: string[] }>> {
    const response = await db.functions.invoke("process-document", {
      body: { url, engines, prompt: customPrompt || undefined },
    });
    if (response.error) return fail(response.error.message);
    const data = response.data;
    if (data?.success) return ok({ result: data.result, engines_used: data.engines_used || [] });
    return fail(data?.error || "فشلت المعالجة");
  },
};
