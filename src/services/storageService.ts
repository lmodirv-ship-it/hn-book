/**
 * Storage Service — abstracts all file upload/delete operations.
 *
 * Import: import { storageService } from "@/services/storageService"
 *
 * Currently uses Supabase Storage.
 * Migration: swap internals with REST API calls.
 */

import { db, ok, fail, type ApiResult } from "@/api/client";
import {
  buildBookPdfStoragePath,
  ensureProductReferenceCode,
  getBookFilePublicUrl,
  isReferenceCodeValid,
} from "@/lib/reference-code";

// ─── Types ───────────────────────────────────────────────────

export interface UploadFileResult {
  publicUrl: string;
  referenceCode: string;
  storagePath: string;
}

// ─── Helpers ─────────────────────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

const buildImageStoragePath = (referenceCode: string, ext: string) =>
  `books/${referenceCode}/${referenceCode}.${ext}`;

const getImagePublicUrl = (storagePath: string) =>
  `${SUPABASE_URL}/storage/v1/object/public/book-images/${storagePath}`;

async function registerFile(
  productId: string,
  fileType: "pdf" | "image",
  fileName: string,
  fileSize: number,
  storageBucket: string,
  storagePath: string,
  publicUrl: string
) {
  // Remove old reference
  await db
    .from("product_files")
    .delete()
    .eq("product_id", productId)
    .eq("file_type", fileType as any);

  // Insert new reference
  await db.from("product_files").insert({
    product_id: productId,
    file_type: fileType as any,
    file_name: fileName,
    file_size: fileSize,
    storage_path: `${storageBucket}/${storagePath}`,
    public_url: publicUrl,
    is_primary: true,
  });
}

// ─── Service ─────────────────────────────────────────────────

export const storageService = {
  /**
   * Upload a PDF to storage WITHOUT requiring a product record.
   * Generates a reference code, uploads the file, and returns the public URL.
   * Use this for "upload first, create record later" flows.
   */
  async uploadPdfOnly(
    file: File
  ): Promise<ApiResult<UploadFileResult>> {
    try {
      // Generate a unique reference code (not tied to any product yet)
      const REFERENCE_PREFIX = "B";
      let resolvedRef = "";
      for (let attempt = 0; attempt < 20; attempt++) {
        const candidate = `${REFERENCE_PREFIX}${String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0")}`;
        // Check uniqueness
        const { data } = await db.from("products").select("id").eq("reference_code", candidate).maybeSingle();
        if (!data) { resolvedRef = candidate; break; }
      }
      if (!resolvedRef) throw new Error("تعذر إنشاء رقم مرجعي فريد");

      const storagePath = buildBookPdfStoragePath(resolvedRef);

      const { error: uploadError } = await db.storage
        .from("book-files")
        .upload(storagePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const publicUrl = getBookFilePublicUrl(storagePath);

      return ok({ publicUrl, referenceCode: resolvedRef, storagePath });
    } catch (err: any) {
      return fail(err.message || "فشل رفع ملف PDF");
    }
  },

  /**
   * Upload a book PDF file for a product.
   * Handles: reference code generation, storage upload, product update, file registration.
   */
  async uploadBookPdf(
    productId: string | null,
    file: File,
    referenceCode?: string | null
  ): Promise<ApiResult<UploadFileResult>> {
    try {
      const resolvedRef = productId
        ? await ensureProductReferenceCode(productId, referenceCode)
        : (referenceCode?.trim().toUpperCase() || (() => { throw new Error("الرقم المرجعي مطلوب"); })());
      const storagePath = buildBookPdfStoragePath(resolvedRef);

      const { error: uploadError } = await db.storage
        .from("book-files")
        .upload(storagePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const publicUrl = getBookFilePublicUrl(storagePath);

      if (productId) {
        const { error: updateError } = await db
          .from("products")
          .update({ pdf_url: publicUrl, reference_code: resolvedRef } as never)
          .eq("id", productId);
        if (updateError) throw updateError;

        await registerFile(productId, "pdf", `${resolvedRef}.pdf`, file.size, "book-files", storagePath, publicUrl);
      }

      return ok({ publicUrl, referenceCode: resolvedRef, storagePath });
    } catch (err: any) {
      return fail(err.message || "فشل رفع ملف PDF");
    }
  },

  /**
   * Remove the PDF file for a product.
   */
  async removeBookPdf(
    productId: string,
    currentPdfUrl?: string | null,
    referenceCode?: string | null
  ): Promise<ApiResult<null>> {
    try {
      if (isReferenceCodeValid(referenceCode)) {
        await db.storage
          .from("book-files")
          .remove([buildBookPdfStoragePath(referenceCode!.trim().toUpperCase())]);
      } else if (currentPdfUrl?.includes("book-files/")) {
        const path = currentPdfUrl.split("book-files/")[1];
        await db.storage.from("book-files").remove([path]);
      }

      await db.from("products").update({ pdf_url: null } as any).eq("id", productId);
      await db.from("product_files").delete().eq("product_id", productId).eq("file_type", "pdf" as any);

      return ok(null);

      // ── Future: REST API ──
      // await apiClient.del(`/books/${productId}/pdf`);
      // return ok(null);
    } catch (err: any) {
      return fail(err.message || "فشل حذف ملف PDF");
    }
  },

  /**
   * Upload a book cover image for a product.
   */
  async uploadBookImage(
    productId: string,
    file: File,
    referenceCode?: string | null
  ): Promise<ApiResult<UploadFileResult>> {
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const resolvedRef = await ensureProductReferenceCode(productId, referenceCode);
      const storagePath = buildImageStoragePath(resolvedRef, ext);

      const { error: uploadError } = await db.storage
        .from("book-images")
        .upload(storagePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const publicUrl = getImagePublicUrl(storagePath);

      // Update product
      const { error: updateError } = await db
        .from("products")
        .update({ image: publicUrl, reference_code: resolvedRef } as never)
        .eq("id", productId);
      if (updateError) throw updateError;

      // Register in product_files
      await registerFile(productId, "image", `${resolvedRef}.${ext}`, file.size, "book-images", storagePath, publicUrl);

      return ok({ publicUrl, referenceCode: resolvedRef, storagePath });

      // ── Future: REST API ──
      // const formData = new FormData();
      // formData.append("image", file);
      // const result = await fetch(`${API_BASE}/books/${productId}/image`, { method: "POST", body: formData });
      // return ok(await result.json());
    } catch (err: any) {
      return fail(err.message || "فشل رفع الصورة");
    }
  },

  /**
   * Remove the cover image for a product.
   */
  async removeBookImage(
    productId: string,
    currentImageUrl?: string | null,
    referenceCode?: string | null
  ): Promise<ApiResult<null>> {
    try {
      if (isReferenceCodeValid(referenceCode)) {
        const ref = referenceCode!.trim().toUpperCase();
        for (const ext of ["jpg", "jpeg", "png", "webp"]) {
          await db.storage.from("book-images").remove([buildImageStoragePath(ref, ext)]);
        }
      } else if (currentImageUrl?.includes("book-images/")) {
        const path = currentImageUrl.split("book-images/")[1];
        await db.storage.from("book-images").remove([path]);
      }

      await db.from("products").update({ image: null }).eq("id", productId);
      await db
        .from("product_files")
        .delete()
        .eq("product_id", productId)
        .eq("file_type", "image" as any)
        .eq("is_primary", true);

      return ok(null);

      // ── Future: REST API ──
      // await apiClient.del(`/books/${productId}/image`);
      // return ok(null);
    } catch (err: any) {
      return fail(err.message || "فشل حذف الصورة");
    }
  },
};
