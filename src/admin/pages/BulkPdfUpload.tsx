import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, Check, X, Loader2, AlertCircle, RotateCcw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useUploadQueue } from "@/hooks/useUploadQueue";
import { storageService } from "@/services/storageService";
import { invalidateBookCache } from "@/services/bookService";
import { detectCategory } from "@/lib/category-detection";
import { generateCoverAsync, terminateCoverWorker } from "@/lib/cover-worker-client";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──

interface BookPayload {
  file: File;
  title: string;
  category: string;
}

interface UploadResult {
  name: string;
  category: string;
  pdfUrl: string;
  image: string;
  referenceCode: string;
  storagePath: string;
}

// ── Helpers ──

function cleanFilename(filename: string): string {
  return filename
    .replace(/\.pdf$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Process a single file: upload PDF + generate cover in parallel,
 * then upload cover. Returns data needed for batch DB creation.
 */
async function processFileUpload(payload: BookPayload): Promise<UploadResult> {
  // 1. Upload PDF + generate cover IN PARALLEL
  const [pdfResult, coverBlob] = await Promise.all([
    storageService.uploadBookPdf(payload.file),
    generateCoverAsync(payload.title, "PENDING"), // will update ref after
  ]);

  if (pdfResult.error) throw new Error(pdfResult.error);

  const { publicUrl: pdfUrl, referenceCode, storagePath } = pdfResult.data!;

  // 2. Upload cover image
  const coverFile = new File([coverBlob], `${referenceCode}.jpg`, { type: "image/jpeg" });
  const coverResult = await storageService.uploadBookImage(coverFile, referenceCode);
  const image = coverResult.data?.publicUrl || pdfUrl;

  return {
    name: payload.title,
    category: payload.category,
    pdfUrl,
    image,
    referenceCode,
    storagePath,
  };
}

// ── Component ──

const BulkPdfUpload = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { jobs, stats, isActive, enqueue, start, retryFailed, clearDone, reset } =
    useUploadQueue<BookPayload>({
      concurrency: 5,
      maxRetries: 2,
      processor: processFileUpload,
      onComplete: async ({ success, failed }, completedJobs) => {
        // Batch create all successful books via edge function
        const successfulJobs = completedJobs.filter(
          (j) => j.status === "done" && j.result
        );

        if (successfulJobs.length > 0) {
          try {
            const books = successfulJobs.map((j) => {
              const r = j.result as UploadResult;
              return {
                name: r.name,
                category: r.category,
                price: 0,
                pdf_url: r.pdfUrl,
                image: r.image,
                reference_code: r.referenceCode,
              };
            });

            const { data, error } = await supabase.functions.invoke(
              "batch-create-books",
              { body: { books } }
            );

            if (error) {
              console.error("[BulkUpload] batch create error:", error);
              toast.error("تم رفع الملفات لكن فشل إنشاء بعض الكتب في قاعدة البيانات");
            } else {
              const result = data as { success: number; failed: number };
              invalidateBookCache();
              toast.success(
                `تم إنشاء ${result.success} كتاب${result.failed ? ` · فشل ${result.failed}` : ""}`
              );
            }
          } catch (err) {
            console.error("[BulkUpload] batch create exception:", err);
            toast.error("خطأ في إنشاء الكتب");
          }
        } else if (failed) {
          toast.error(`فشل رفع جميع الملفات (${failed})`);
        }
      },
    });

  // Cleanup worker on unmount
  useEffect(() => () => terminateCoverWorker(), []);

  const addFiles = (selected: File[]) => {
    const pdfs = selected.filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
    if (!pdfs.length) {
      toast.error("يرجى اختيار ملفات PDF فقط");
      return;
    }

    const payloads: BookPayload[] = pdfs.map((file) => {
      const title = cleanFilename(file.name);
      const { category } = detectCategory(title);
      return { file, title, category };
    });

    enqueue(payloads);
  };

  const progressPercent =
    stats.total > 0 ? Math.round(((stats.done + stats.errors) / stats.total) * 100) : 0;

  return (
    <div className="space-y-6" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-extrabold text-foreground">🚀 رفع ذكي للكتب</h1>
        <p className="text-sm text-muted-foreground mt-1">
          معالجة متوازية بـ Web Worker + Backend Queue — ارفع 20+ كتاب بسرعة فائقة
        </p>
      </motion.div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(Array.from(e.dataTransfer.files));
        }}
        onClick={() => fileInputRef.current?.click()}
        className="cursor-pointer rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-card/50 p-10 flex flex-col items-center justify-center gap-3 transition-colors"
      >
        <Upload className="w-10 h-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">اسحب ملفات PDF هنا أو اضغط لاختيارها</p>
        <div className="flex items-center gap-4 mt-2">
          <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1">
            <Zap className="w-3 h-3" /> Web Worker
          </span>
          <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1">
            <Zap className="w-3 h-3" /> 5x متزامن
          </span>
          <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1">
            <Zap className="w-3 h-3" /> Batch API
          </span>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        onChange={(e) => {
          addFiles(Array.from(e.target.files || []));
          e.target.value = "";
        }}
        className="hidden"
      />

      {/* Progress bar */}
      {isActive && stats.total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              {stats.uploading > 0 && (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {stats.uploading} جاري الرفع
                </span>
              )}
              {stats.done > 0 && <span>✓ {stats.done} مكتمل</span>}
            </span>
            <span>{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </motion.div>
      )}

      {/* Stats badges */}
      {jobs.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs px-3 py-1.5 rounded-full bg-secondary text-muted-foreground">
            الكل: {stats.total}
          </span>
          {stats.queued > 0 && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary">
              في الانتظار: {stats.queued}
            </span>
          )}
          {stats.uploading > 0 && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-accent/20 text-accent-foreground">
              ⚡ جاري: {stats.uploading}
            </span>
          )}
          {stats.done > 0 && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary">
              تم: {stats.done}
            </span>
          )}
          {stats.errors > 0 && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-destructive/10 text-destructive">
              خطأ: {stats.errors}
            </span>
          )}
          {stats.done > 0 && !isActive && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={clearDone}>
              إزالة المكتملة
            </Button>
          )}
        </div>
      )}

      {/* File list */}
      {jobs.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border/50 max-h-[400px] overflow-y-auto">
          {jobs.map((j) => (
            <motion.div
              key={j.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 px-4 py-3"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                {j.status === "uploading" ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                ) : j.status === "done" ? (
                  <Check className="w-4 h-4 text-primary" />
                ) : j.status === "error" ? (
                  <AlertCircle className="w-4 h-4 text-destructive" />
                ) : (
                  <FileText className="w-4 h-4 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {j.payload.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    {j.payload.category}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {(j.payload.file.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                  {j.retries > 0 && j.status !== "done" && (
                    <span className="text-[10px] text-muted-foreground">
                      محاولة {j.retries + 1}
                    </span>
                  )}
                </div>
                {j.status === "error" && (
                  <p className="text-[11px] text-destructive mt-0.5">{j.error}</p>
                )}
                {j.status === "done" && (
                  <p className="text-[11px] text-primary mt-0.5">✓ تم الرفع</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {stats.queued > 0 && !isActive && (
          <Button onClick={start} className="gap-2">
            <Upload className="w-4 h-4" />
            رفع وإنشاء {stats.queued} كتاب
          </Button>
        )}
        {isActive && (
          <Button disabled className="gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            جاري المعالجة... ({stats.uploading} متزامن)
          </Button>
        )}
        {stats.errors > 0 && !isActive && (
          <Button variant="secondary" onClick={retryFailed} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            إعادة المحاولة ({stats.errors})
          </Button>
        )}
        {jobs.length > 0 && !isActive && (
          <Button variant="outline" onClick={reset}>
            مسح الكل
          </Button>
        )}
      </div>
    </div>
  );
};

export default BulkPdfUpload;
