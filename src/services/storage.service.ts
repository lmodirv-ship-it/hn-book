/**
 * Storage Service — abstracts file upload/download.
 * Currently backed by Supabase Storage via Lovable Cloud.
 */

import { supabase } from "@/integrations/supabase/client";
import type { UploadResult, ServiceResult } from "./types";

export const storageService = {
  /** Upload a file to a bucket */
  async upload(
    bucket: string,
    path: string,
    file: File
  ): Promise<ServiceResult<UploadResult>> {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true });
    if (error) return { data: null, error: error.message };

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return {
      data: { path, publicUrl: urlData.publicUrl },
      error: null,
    };
  },

  /** Delete a file from a bucket */
  async delete(bucket: string, path: string): Promise<ServiceResult<null>> {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  },

  /** Get public URL for a file */
  getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },
};
