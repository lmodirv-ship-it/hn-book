import { useState, useRef } from "react";
import { FileText, Upload, X, Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BookPdfUploadProps {
  productId: string;
  currentPdfUrl: string | null;
  onPdfUpdated: (url: string) => void;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export const BookPdfUpload = ({ productId, currentPdfUrl, onPdfUpdated }: BookPdfUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(currentPdfUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("يرجى اختيار ملف PDF فقط");
      return;
    }

    // No size limit - files of any size are supported

    setUploading(true);
    try {
      const storagePath = `${productId}/${Date.now()}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from("book-files")
        .upload(storagePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/book-files/${storagePath}`;

      // Update product pdf_url field
      const { error: updateError } = await supabase
        .from("products")
        .update({ pdf_url: publicUrl } as any)
        .eq("id", productId);

      if (updateError) throw updateError;

      // Remove old PDF reference
      await supabase
        .from("product_files")
        .delete()
        .eq("product_id", productId)
        .eq("file_type", "pdf");

      // Insert new reference
      await supabase.from("product_files").insert({
        product_id: productId,
        file_type: "pdf" as any,
        file_name: file.name,
        file_size: file.size,
        storage_path: `book-files/${storagePath}`,
        public_url: publicUrl,
        is_primary: true,
      });

      setPdfUrl(publicUrl);
      onPdfUpdated(publicUrl);
      toast.success("تم رفع ملف PDF بنجاح");
    } catch (err: any) {
      console.error(err);
      toast.error("فشل رفع الملف: " + (err.message || "خطأ غير معروف"));
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setUploading(true);
    try {
      if (pdfUrl?.includes("book-files/")) {
        const path = pdfUrl.split("book-files/")[1];
        await supabase.storage.from("book-files").remove([path]);
      }

      await supabase.from("products").update({ pdf_url: null } as any).eq("id", productId);

      // Remove reference
      await supabase
        .from("product_files")
        .delete()
        .eq("product_id", productId)
        .eq("file_type", "pdf");

      setPdfUrl(null);
      onPdfUpdated("");
      toast.success("تم حذف ملف PDF");
    } catch (err: any) {
      toast.error("فشل حذف الملف");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">ملف الكتاب (PDF)</label>

      {pdfUrl ? (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-secondary/20">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">ملف PDF مرفوع</p>
            <p className="text-[11px] text-muted-foreground truncate">{pdfUrl.split("/").pop()}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
              title="تحميل"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={handleRemove}
              disabled={uploading}
              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              title="حذف"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full py-6 rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-secondary/20 flex flex-col items-center justify-center gap-2 transition-colors"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          ) : (
            <>
              <FileText className="w-6 h-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">اضغط لرفع ملف PDF (حتى 50MB)</span>
            </>
          )}
        </button>
      )}

      {pdfUrl && (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          تغيير الملف
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  );
};
