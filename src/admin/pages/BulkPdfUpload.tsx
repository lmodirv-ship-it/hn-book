import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Upload, FileText, Check, X, Loader2, AlertCircle, BookOpen, Image,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { db } from "@/api/client";
import { storageService } from "@/services/storageService";
import { detectCategory } from "@/lib/category-detection";
import { extractPdfCover, getPdfPageCount, cleanFilenameToTitle } from "@/lib/pdf-cover-extractor";

type FileStatus = "queued" | "extracting" | "uploading" | "done" | "error";

interface SmartFile {
  file: File;
  title: string;
  category: string;
  pageCount: number | null;
  coverBlob: Blob | null;
  coverPreview: string | null;
  status: FileStatus;
  error?: string;
  progress: string;
}

const SmartBulkUpload = () => {
  const [files, setFiles] = useState<SmartFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateFile = (index: number, updates: Partial<SmartFile>) => {
    setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  };

  const handleFilesSelected = (selectedFiles: File[]) => {
    const pdfFiles = selectedFiles.filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );

    if (pdfFiles.length === 0) {
      toast.error("يرجى اختيار ملفات PDF فقط");
      return;
    }

    const newFiles: SmartFile[] = pdfFiles.map((file) => {
      const title = cleanFilenameToTitle(file.name);
      const { category } = detectCategory(title);
      return {
        file,
        title,
        category,
        pageCount: null,
        coverBlob: null,
        coverPreview: null,
        status: "queued" as const,
        progress: "في الانتظار",
      };
    });

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const processFile = async (index: number): Promise<boolean> => {
    const f = files[index] || (await new Promise<SmartFile>((r) => {
      setFiles((prev) => { r(prev[index]); return prev; });
    }));

    // Get latest state
    let current: SmartFile = f;
    setFiles((prev) => { current = prev[index]; return prev; });

    try {
      // Step 1: Extract cover from first page
      updateFile(index, { status: "extracting", progress: "استخراج الغلاف..." });

      let coverBlob: Blob;
      try {
        coverBlob = await extractPdfCover(current.file);
      } catch {
        updateFile(index, { status: "error", error: "فشل استخراج الغلاف من PDF", progress: "خطأ" });
        return false;
      }

      const coverPreview = URL.createObjectURL(coverBlob);
      updateFile(index, { coverBlob, coverPreview, progress: "حساب عدد الصفحات..." });

      // Step 2: Get page count
      let pageCount = 0;
      try {
        pageCount = await getPdfPageCount(current.file);
      } catch {
        // Non-critical — continue with 0
      }
      updateFile(index, { pageCount, progress: "رفع الملفات..." });

      // Step 3: Create product record first (with placeholder image to pass NOT NULL)
      updateFile(index, { status: "uploading", progress: "إنشاء سجل الكتاب..." });

      const desc = pageCount > 0 ? `عدد الصفحات: ${pageCount}` : "";
      const { data: product, error: createError } = await db
        .from("products")
        .insert({
          name: current.title,
          description: desc,
          category: current.category,
          price: 0,
          pdf_url: "pending",    // temporary — will be updated
          image: "pending",       // temporary — will be updated
        })
        .select("id, reference_code")
        .single();

      if (createError) throw new Error(createError.message);
      const productId = product.id;
      const refCode = product.reference_code;

      // Step 4: Upload PDF
      updateFile(index, { progress: "رفع ملف PDF..." });
      const pdfResult = await storageService.uploadBookPdf(productId, current.file, refCode);
      if (pdfResult.error) throw new Error(pdfResult.error);

      // Step 5: Upload cover image
      updateFile(index, { progress: "رفع صورة الغلاف..." });
      const coverFile = new File([coverBlob], `${refCode || productId}.jpg`, { type: "image/jpeg" });
      const coverResult = await storageService.uploadBookImage(productId, coverFile, pdfResult.data!.referenceCode);
      if (coverResult.error) throw new Error(coverResult.error);

      updateFile(index, {
        status: "done",
        progress: "✓ تم بنجاح",
      });
      return true;
    } catch (err: any) {
      updateFile(index, {
        status: "error",
        error: err.message || "خطأ غير متوقع",
        progress: "خطأ",
      });
      return false;
    }
  };

  const processAll = async () => {
    setProcessing(true);
    let success = 0;
    let failed = 0;

    for (let i = 0; i < files.length; i++) {
      // Re-read current status
      let status: FileStatus = "queued";
      setFiles((prev) => { status = prev[i].status; return prev; });
      if (status !== "queued") continue;

      const ok = await processFile(i);
      if (ok) success++;
      else failed++;
    }

    setProcessing(false);
    if (success > 0) {
      toast.success(`تم إنشاء ${success} كتاب بنجاح${failed ? ` · فشل ${failed}` : ""}`);
    } else if (failed > 0) {
      toast.error(`فشل رفع جميع الملفات (${failed})`);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearDone = () => {
    setFiles((prev) => prev.filter((f) => f.status !== "done"));
  };

  const stats = {
    total: files.length,
    queued: files.filter((f) => f.status === "queued").length,
    done: files.filter((f) => f.status === "done").length,
    errors: files.filter((f) => f.status === "error").length,
    active: files.filter((f) => f.status === "extracting" || f.status === "uploading").length,
  };

  return (
    <div className="space-y-6" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-extrabold text-foreground">🚀 رفع ذكي للكتب</h1>
        <p className="text-sm text-muted-foreground mt-1">
          ارفع ملفات PDF — سيتم تلقائياً: استخراج الغلاف، تحديد التصنيف، إنشاء الكتاب
        </p>
      </motion.div>

      {/* How it works */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: FileText, label: "رفع PDF", desc: "ملف أو عدة ملفات" },
          { icon: Image, label: "استخراج الغلاف", desc: "من الصفحة الأولى" },
          { icon: BookOpen, label: "تحديد التصنيف", desc: "تلقائي من العنوان" },
          { icon: Check, label: "إنشاء الكتاب", desc: "كامل ومجهز" },
        ].map((step, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border text-center">
            <step.icon className="w-5 h-5 text-primary" />
            <span className="text-xs font-semibold text-foreground">{step.label}</span>
            <span className="text-[10px] text-muted-foreground">{step.desc}</span>
          </div>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFilesSelected(Array.from(e.dataTransfer.files)); }}
        onClick={() => fileInputRef.current?.click()}
        className="cursor-pointer rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-card/50 p-10 flex flex-col items-center justify-center gap-3 transition-colors"
      >
        <Upload className="w-10 h-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">اسحب ملفات PDF هنا أو اضغط لاختيارها</p>
        <p className="text-xs text-muted-foreground/60">يمكنك اختيار عدة ملفات — سيتم معالجتها تلقائياً</p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        onChange={(e) => { handleFilesSelected(Array.from(e.target.files || [])); e.target.value = ""; }}
        className="hidden"
      />

      {/* Stats */}
      {files.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <Stat label="الكل" value={stats.total} color="bg-secondary text-muted-foreground" />
          <Stat label="في الانتظار" value={stats.queued} color="bg-primary/10 text-primary" />
          {stats.active > 0 && <Stat label="جاري المعالجة" value={stats.active} color="bg-blue-500/10 text-blue-400" />}
          {stats.done > 0 && <Stat label="تم" value={stats.done} color="bg-green-500/10 text-green-400" />}
          {stats.errors > 0 && <Stat label="خطأ" value={stats.errors} color="bg-destructive/10 text-destructive" />}
          {stats.done > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={clearDone}>
              إزالة المكتملة
            </Button>
          )}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border/50">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              {/* Cover preview or icon */}
              <div className="w-10 h-14 rounded-lg overflow-hidden bg-secondary/30 flex items-center justify-center flex-shrink-0 border border-border/50">
                {f.coverPreview ? (
                  <img src={f.coverPreview} alt="غلاف" className="w-full h-full object-cover" />
                ) : f.status === "extracting" || f.status === "uploading" ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                ) : f.status === "done" ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : f.status === "error" ? (
                  <AlertCircle className="w-4 h-4 text-destructive" />
                ) : (
                  <FileText className="w-4 h-4 text-muted-foreground" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{f.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{f.category}</span>
                  {f.pageCount && <span className="text-[10px] text-muted-foreground">{f.pageCount} صفحة</span>}
                  <span className="text-[10px] text-muted-foreground">{(f.file.size / 1024 / 1024).toFixed(1)} MB</span>
                </div>
                <p className={`text-[11px] mt-0.5 ${
                  f.status === "error" ? "text-destructive" :
                  f.status === "done" ? "text-green-400" :
                  "text-muted-foreground"
                }`}>
                  {f.status === "error" ? f.error : f.progress}
                </p>
              </div>

              {/* Remove button */}
              {(f.status === "queued" || f.status === "error") && !processing && (
                <button
                  onClick={() => removeFile(i)}
                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {stats.queued > 0 && (
          <Button onClick={processAll} disabled={processing} className="gap-2">
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {processing ? "جاري المعالجة..." : `معالجة ورفع ${stats.queued} كتاب`}
          </Button>
        )}
        {files.length > 0 && !processing && (
          <Button variant="outline" onClick={() => setFiles([])}>
            مسح الكل
          </Button>
        )}
      </div>
    </div>
  );
};

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span className={`text-xs px-3 py-1.5 rounded-full ${color}`}>
      {label}: {value}
    </span>
  );
}

export default SmartBulkUpload;
