import { useEffect, useRef, useState } from "react";
import { FileText, Upload, X, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { storageService } from "@/services/storageService";
import { isReferenceCodeValid } from "@/lib/reference-code";

interface BookPdfUploadProps {
  productId: string;
  currentPdfUrl: string | null;
  referenceCode?: string | null;
  onPdfUpdated: (url: string, referenceCode?: string) => void;
}

export const BookPdfUpload = ({ productId, currentPdfUrl, referenceCode, onPdfUpdated }: BookPdfUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(currentPdfUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPdfUrl(currentPdfUrl);
  }, [currentPdfUrl]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("يرجى اختيار ملف PDF فقط");
      return;
    }

    setUploading(true);
    const result = await storageService.uploadBookPdf(productId, file, referenceCode);
    setUploading(false);

    if (result.error) {
      toast.error("فشل رفع الملف: " + result.error);
      return;
    }

    setPdfUrl(result.data!.publicUrl);
    onPdfUpdated(result.data!.publicUrl, result.data!.referenceCode);
    toast.success(`تم رفع ملف PDF بنجاح · المرجع ${result.data!.referenceCode}`);
  };

  const handleRemove = async () => {
    setUploading(true);
    const result = await storageService.removeBookPdf(productId, pdfUrl, referenceCode);
    setUploading(false);

    if (result.error) {
      toast.error("فشل حذف الملف");
      return;
    }

    setPdfUrl(null);
    onPdfUpdated("");
    toast.success("تم حذف ملف PDF");
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">ملف الكتاب (PDF)</label>
      <p className="text-[11px] text-muted-foreground">
        {isReferenceCodeValid(referenceCode)
          ? `سيتم حفظ الملف داخل المجلد المرجعي: ${referenceCode}`
          : "سيُنشأ رقم مرجعي تلقائياً عند رفع ملف PDF"}
      </p>

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
