import { useEffect, useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ensureProductReferenceCode,
  isReferenceCodeValid,
} from "@/lib/reference-code";

interface ProductImageUploadProps {
  productId: string;
  currentImage: string | null;
  referenceCode?: string | null;
  onImageUpdated: (url: string, referenceCode?: string) => void;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

const buildImageStoragePath = (referenceCode: string, ext: string) =>
  `books/${referenceCode}/${referenceCode}.${ext}`;

const getImagePublicUrl = (storagePath: string) =>
  `${SUPABASE_URL}/storage/v1/object/public/book-images/${storagePath}`;

export const ProductImageUpload = ({ productId, currentImage, referenceCode, onImageUpdated }: ProductImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreview(currentImage);
  }, [currentImage]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("يرجى اختيار ملف صورة");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الصورة يجب أن لا يتجاوز 5MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const resolvedRef = await ensureProductReferenceCode(productId, referenceCode);
      const storagePath = buildImageStoragePath(resolvedRef, ext || "jpg");

      const { error: uploadError } = await supabase.storage
        .from("book-images")
        .upload(storagePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const publicUrl = getImagePublicUrl(storagePath);

      // Update product image field
      const { error: updateError } = await supabase
        .from("products")
        .update({ image: publicUrl, reference_code: resolvedRef } as never)
        .eq("id", productId);

      if (updateError) throw updateError;

      // Register file in product_files with reference
      // First remove old primary image reference
      await supabase
        .from("product_files")
        .delete()
        .eq("product_id", productId)
        .eq("file_type", "image")
        .eq("is_primary", true);

      // Insert new reference
      await supabase.from("product_files").insert({
        product_id: productId,
        file_type: "image" as any,
        file_name: `${resolvedRef}.${ext}`,
        file_size: file.size,
        storage_path: `book-images/${storagePath}`,
        public_url: publicUrl,
        is_primary: true,
      });

      setPreview(publicUrl);
      onImageUpdated(publicUrl, resolvedRef);
      toast.success(`تم رفع الصورة بنجاح · المرجع ${resolvedRef}`);
    } catch (err: any) {
      console.error(err);
      toast.error("فشل رفع الصورة: " + (err.message || "خطأ غير معروف"));
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setUploading(true);
    try {
      if (isReferenceCodeValid(referenceCode)) {
        // Try removing common image extensions
        const ref = referenceCode!.trim().toUpperCase();
        for (const ext of ["jpg", "jpeg", "png", "webp"]) {
          await supabase.storage.from("book-images").remove([buildImageStoragePath(ref, ext)]);
        }
      } else if (preview?.includes("book-images/")) {
        const path = preview.split("book-images/")[1];
        await supabase.storage.from("book-images").remove([path]);
      }

      await supabase.from("products").update({ image: null }).eq("id", productId);

      // Remove reference from product_files
      await supabase
        .from("product_files")
        .delete()
        .eq("product_id", productId)
        .eq("file_type", "image")
        .eq("is_primary", true);

      setPreview(null);
      onImageUpdated("");
      toast.success("تم حذف الصورة");
    } catch (err: any) {
      toast.error("فشل حذف الصورة");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">صورة الكتاب</label>
      <p className="text-[11px] text-muted-foreground">
        {isReferenceCodeValid(referenceCode)
          ? `ستُحفظ الصورة بالمرجع: ${referenceCode}`
          : "سيُنشأ رقم مرجعي تلقائياً عند رفع الصورة"}
      </p>

      {preview ? (
        <div className="relative w-full aspect-square max-w-[200px] rounded-xl overflow-hidden border border-border bg-secondary/30">
          <img src={preview} alt="صورة المنتج" className="w-full h-full object-cover" />
          <button
            onClick={handleRemove}
            disabled={uploading}
            className="absolute top-2 left-2 p-1 rounded-full bg-destructive/80 text-white hover:bg-destructive transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full max-w-[200px] aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-secondary/20 flex flex-col items-center justify-center gap-2 transition-colors"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          ) : (
            <>
              <Upload className="w-6 h-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">اضغط لرفع صورة</span>
            </>
          )}
        </button>
      )}

      {preview && (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          تغيير الصورة
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  );
};
