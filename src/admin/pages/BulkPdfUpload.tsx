import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, Check, X, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { storageService } from "@/services/storageService";
import { bookService, invalidateBookCache } from "@/services/bookService";
import { detectCategory } from "@/lib/category-detection";

type FileStatus = "queued" | "uploading" | "done" | "error";

interface SmartFile {
  file: File;
  title: string;
  category: string;
  status: FileStatus;
  error?: string;
}

function cleanFilename(filename: string): string {
  return filename
    .replace(/\.pdf$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const BulkPdfUpload = () => {
  const [files, setFiles] = useState<SmartFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateFile = (i: number, u: Partial<SmartFile>) =>
    setFiles((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...u } : f)));

  const addFiles = (selected: File[]) => {
    const pdfs = selected.filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
    if (!pdfs.length) { toast.error("يرجى اختيار ملفات PDF فقط"); return; }

    const newFiles: SmartFile[] = pdfs.map((file) => {
      const title = cleanFilename(file.name);
      const { category } = detectCategory(title);
      return { file, title, category, status: "queued" as const };
    });
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const processFile = async (i: number): Promise<boolean> => {
    let current: SmartFile | undefined;
    setFiles((prev) => { current = prev[i]; return prev; });
    if (!current || current.status !== "queued") return false;

    try {
      updateFile(i, { status: "uploading" });

      // 1. Upload PDF to storage FIRST (no product record needed)
      const uploadResult = await storageService.uploadPdfOnly(current.file);
      if (uploadResult.error) throw new Error(uploadResult.error);

      const { publicUrl, referenceCode } = uploadResult.data!;

      // 2. Create book record with REAL data (no placeholders)
      const createResult = await bookService.create({
        name: current.title,
        category: current.category,
        price: 0,
        pdfUrl: publicUrl,
        image: publicUrl, // Use PDF URL as temporary image until cover is added
      });

      if (createResult.error) {
        // Cleanup: remove uploaded PDF since book creation failed
        await storageService.removeBookPdf("", publicUrl, referenceCode);
        throw new Error(createResult.error);
      }

      // 3. Update product with reference_code
      const product = createResult.data!;
      await bookService.update(product.id, { pdfUrl: publicUrl } as any);

      updateFile(i, { status: "done" });
      return true;
    } catch (err: any) {
      updateFile(i, { status: "error", error: err.message || "خطأ غير متوقع" });
      return false;
    }
  };

  const processAll = async () => {
    setProcessing(true);
    let success = 0, failed = 0;

    for (let i = 0; i < files.length; i++) {
      let status: FileStatus = "queued";
      setFiles((prev) => { status = prev[i].status; return prev; });
      if (status !== "queued") continue;

      (await processFile(i)) ? success++ : failed++;
    }

    setProcessing(false);
    if (success) {
      invalidateBookCache();
      toast.success(`تم إنشاء ${success} كتاب${failed ? ` · فشل ${failed}` : ""}`);
    } else if (failed) {
      toast.error(`فشل رفع جميع الملفات (${failed})`);
    }
  };

  const stats = {
    queued: files.filter((f) => f.status === "queued").length,
    done: files.filter((f) => f.status === "done").length,
    errors: files.filter((f) => f.status === "error").length,
  };

  return (
    <div className="space-y-6" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-extrabold text-foreground">🚀 رفع ذكي للكتب</h1>
        <p className="text-sm text-muted-foreground mt-1">
          ارفع ملفات PDF — سيتم تلقائياً: استخراج العنوان، تحديد التصنيف، إنشاء الكتاب
        </p>
      </motion.div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); addFiles(Array.from(e.dataTransfer.files)); }}
        onClick={() => fileInputRef.current?.click()}
        className="cursor-pointer rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-card/50 p-10 flex flex-col items-center justify-center gap-3 transition-colors"
      >
        <Upload className="w-10 h-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">اسحب ملفات PDF هنا أو اضغط لاختيارها</p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        onChange={(e) => { addFiles(Array.from(e.target.files || [])); e.target.value = ""; }}
        className="hidden"
      />

      {/* Stats */}
      {files.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs px-3 py-1.5 rounded-full bg-secondary text-muted-foreground">الكل: {files.length}</span>
          {stats.queued > 0 && <span className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary">في الانتظار: {stats.queued}</span>}
          {stats.done > 0 && <span className="text-xs px-3 py-1.5 rounded-full bg-green-500/10 text-green-400">تم: {stats.done}</span>}
          {stats.errors > 0 && <span className="text-xs px-3 py-1.5 rounded-full bg-destructive/10 text-destructive">خطأ: {stats.errors}</span>}
          {stats.done > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setFiles((p) => p.filter((f) => f.status !== "done"))}>
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
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                {f.status === "uploading" ? <Loader2 className="w-4 h-4 text-primary animate-spin" /> :
                 f.status === "done" ? <Check className="w-4 h-4 text-green-400" /> :
                 f.status === "error" ? <AlertCircle className="w-4 h-4 text-destructive" /> :
                 <FileText className="w-4 h-4 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{f.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{f.category}</span>
                  <span className="text-[10px] text-muted-foreground">{(f.file.size / 1024 / 1024).toFixed(1)} MB</span>
                </div>
                {f.status === "error" && <p className="text-[11px] text-destructive mt-0.5">{f.error}</p>}
                {f.status === "done" && <p className="text-[11px] text-green-400 mt-0.5">✓ تم إنشاء الكتاب</p>}
              </div>
              {(f.status === "queued" || f.status === "error") && !processing && (
                <button onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))}
                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
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
            {processing ? "جاري المعالجة..." : `رفع وإنشاء ${stats.queued} كتاب`}
          </Button>
        )}
        {files.length > 0 && !processing && (
          <Button variant="outline" onClick={() => setFiles([])}>مسح الكل</Button>
        )}
      </div>
    </div>
  );
};

export default BulkPdfUpload;
