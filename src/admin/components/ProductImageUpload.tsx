import { useEffect, useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { storageService } from "@/services/storageService";
import { isReferenceCodeValid } from "@/lib/reference-code";

interface ProductImageUploadProps {
  productId: string;
  currentImage: string | null;
  referenceCode?: string | null;
  onImageUpdated: (url: string, referenceCode?: string) => void;
}

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
    const result = await storageService.uploadBookImage(productId, file, referenceCode);
    setUploading(false);

    if (result.error) {
      toast.error("فشل رفع الصورة: " + result.error);
      return;
    }

    setPreview(result.data!.publicUrl);
    onImageUpdated(result.data!.publicUrl, result.data!.referenceCode);
    toast.success(`تم رفع الصورة بنجاح · المرجع ${result.data!.referenceCode}`);
  };

  const handleRemove = async () => {
    setUploading(true);
    const result = await storageService.removeBookImage(productId, preview, referenceCode);
    setUploading(false);

    if (result.error) {
      toast.error("فشل حذف الصورة");
      return;
    }

    setPreview(null);
    onImageUpdated("");
    toast.success("تم حذف الصورة");
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
