import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Upload, FileText, Check, Loader2, AlertCircle,
  Zap, Database, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useUploadQueue } from "@/hooks/useUploadQueue";
import { useJobProcessor } from "@/hooks/useJobProcessor";
import { storageService } from "@/services/storageService";
import { detectCategory } from "@/lib/category-detection";
import { generateCoverAsync, terminateCoverWorker } from "@/lib/cover-worker-client";
import { db } from "@/api/client";

// ── Types ──

interface BookPayload {
  file: File;
  title: string;
  category: string;
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
 * Frontend-only work: upload PDF + generate/upload cover → insert DB job.
 * All book creation happens in the backend worker.
 */
async function uploadFilesAndCreateJob(payload: BookPayload): Promise<void> {
  // 1. Upload PDF + generate cover in parallel (Web Worker)
  const [pdfResult, coverBlob] = await Promise.all([
    storageService.uploadBookPdf(payload.file),
    generateCoverAsync(payload.title, "GEN"),
  ]);

  if (pdfResult.error) throw new Error(pdfResult.error);
  const { publicUrl: pdfUrl, referenceCode, storagePath } = pdfResult.data!;

  // 2. Upload cover image
  const coverFile = new File([coverBlob], `${referenceCode}.jpg`, { type: "image/jpeg" });
  const coverResult = await storageService.uploadBookImage(coverFile, referenceCode);
  const image = coverResult.data?.publicUrl || pdfUrl;

  // 3. Insert job into upload_jobs — backend worker will create the book
  const { error: jobError } = await db
    .from("upload_jobs")
    .insert({
      file_name: payload.file.name,
      status: "pending",
      result: {
        title: payload.title,
        category: payload.category,
        pdfUrl,
        image,
        referenceCode,
        storagePath,
      },
    } as any);

  if (jobError) {
    await storageService.removePdfByPath(storagePath);
    throw new Error(jobError.message);
  }
}

// ── Component ──

const BulkPdfUpload = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Phase 1: Queue for fast file uploads (PDF + cover)
  const {
    jobs: queueJobs,
    stats: queueStats,
    isActive: queueActive,
    enqueue,
    start,
    reset: resetQueue,
  } = useUploadQueue<BookPayload>({
    concurrency: 5,
    maxRetries: 2,
    processor: uploadFilesAndCreateJob,
    onComplete: ({ success, failed }) => {
      if (success) toast.success(`تم رفع ${success} ملف — جاري إنشاء الكتب في الخلفية...`);
      if (failed) toast.error(`فشل رفع ${failed} ملف`);
    },
  });

  // Phase 2: Backend worker with realtime
  const { jobs: dbJobs, stats: dbStats, workerActive, retryFailed, retryJob } = useJobProcessor({
    autoTrigger: true,
    onBatchComplete: ({ success, failed }) => {
      if (success) toast.success(`✅ تم إنشاء ${success} كتاب`);
      if (failed) toast.error(`❌ فشل إنشاء ${failed} كتاب`);
    },
  });

  useEffect(() => () => terminateCoverWorker(), []);

  const addFiles = (selected: File[]) => {
    const pdfs = selected.filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
    if (!pdfs.length) {
      toast.error("يرجى اختيار ملفات PDF فقط");
      return;
    }
    enqueue(
      pdfs.map((file) => {
        const title = cleanFilename(file.name);
        const { category } = detectCategory(title);
        return { file, title, category };
      })
    );
  };

  const uploadProgress =
    queueStats.total > 0
      ? Math.round(((queueStats.done + queueStats.errors) / queueStats.total) * 100)
      : 0;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-extrabold text-foreground">🚀 رفع ذكي للكتب</h1>
        <p className="text-sm text-muted-foreground mt-1">
          رفع فوري + معالجة خلفية في الخادم — ارفع 20+ كتاب بسرعة فائقة
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
        <div className="flex items-center gap-4 mt-2">
          <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1">
            <Zap className="w-3 h-3" /> Web Worker
          </span>
          <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1">
            <Zap className="w-3 h-3" /> 5x متزامن
          </span>
          <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1">
            <Database className="w-3 h-3" /> Backend Worker
          </span>
        </div>
      </div>
      <input
        ref={fileInputRef} type="file" accept=".pdf,application/pdf" multiple
        onChange={(e) => { addFiles(Array.from(e.target.files || [])); e.target.value = ""; }}
        className="hidden"
      />

      {/* Phase 1: Upload progress */}
      {queueActive && queueStats.total > 0 && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <Upload className="w-3 h-3" /> رفع الملفات
              {queueStats.uploading > 0 && (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> {queueStats.uploading} جاري
                </span>
              )}
            </span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </motion.div>
      )}

      {/* Phase 2: Backend worker status */}
      {(dbStats.pending > 0 || dbStats.processing > 0 || workerActive) && (
        <motion.div
          initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-accent/10 border border-accent/20"
        >
          <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">🔄 معالجة خلفية (Backend)</span>
            {" — "}
            {dbStats.processing > 0 && `${dbStats.processing} جاري الإنشاء`}
            {dbStats.processing > 0 && dbStats.pending > 0 && " · "}
            {dbStats.pending > 0 && `${dbStats.pending} في الانتظار`}
          </div>
        </motion.div>
      )}

      {/* Queue stats */}
      {queueJobs.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs px-3 py-1.5 rounded-full bg-secondary text-muted-foreground">
            ملفات: {queueStats.total}
          </span>
          {queueStats.queued > 0 && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary">⏳ انتظار: {queueStats.queued}</span>
          )}
          {queueStats.uploading > 0 && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-accent/20 text-accent-foreground">🔄 رفع: {queueStats.uploading}</span>
          )}
          {queueStats.done > 0 && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary">✅ تم: {queueStats.done}</span>
          )}
          {queueStats.errors > 0 && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-destructive/10 text-destructive">❌ خطأ: {queueStats.errors}</span>
          )}
        </div>
      )}

      {/* Queue file list */}
      {queueJobs.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border/50 max-h-[300px] overflow-y-auto">
          {queueJobs.map((j) => (
            <div key={j.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm">
                {j.status === "uploading" ? "🔄" : j.status === "done" ? "✅" : j.status === "error" ? "❌" : "⏳"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{j.payload.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{j.payload.category}</span>
                  <span className="text-[10px] text-muted-foreground">{(j.payload.file.size / 1024 / 1024).toFixed(1)} MB</span>
                </div>
                {j.status === "error" && <p className="text-[11px] text-destructive mt-0.5">{j.error}</p>}
                {j.status === "done" && <p className="text-[11px] text-primary mt-0.5">✅ تم الرفع — جاري الإنشاء في الخلفية</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary panel */}
      {(dbStats.done > 0 || dbStats.errors > 0) && !queueActive && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-4 space-y-4"
        >
          {/* Stats summary */}
          <div className="flex items-center gap-4">
            <p className="text-sm font-semibold text-foreground">📊 ملخص</p>
            <div className="flex items-center gap-3 text-xs">
              {dbStats.done > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                  ✅ نجح: {dbStats.done}
                </span>
              )}
              {dbStats.errors > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-destructive/10 text-destructive font-medium">
                  ❌ فشل: {dbStats.errors}
                </span>
              )}
              {dbStats.pending > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-secondary text-muted-foreground font-medium">
                  ⏳ معلّق: {dbStats.pending}
                </span>
              )}
            </div>
          </div>

          {/* Done jobs */}
          {dbStats.done > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5 font-medium">📚 كتب تم إنشاؤها</p>
              <div className="space-y-1">
                {dbJobs
                  .filter((j) => j.status === "done")
                  .slice(0, 8)
                  .map((j) => (
                    <div key={j.id} className="flex items-center gap-2 text-xs">
                      <span>✅</span>
                      <span className="text-foreground truncate">{(j.result as any)?.title || j.file_name}</span>
                      <span className="text-muted-foreground text-[10px]">{(j.result as any)?.referenceCode}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Error jobs with retry */}
          {dbStats.errors > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-destructive font-medium">❌ مهام فشلت</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px] gap-1 text-primary"
                  onClick={retryFailed}
                >
                  <RotateCcw className="w-3 h-3" /> إعادة الكل
                </Button>
              </div>
              <div className="space-y-1">
                {dbJobs
                  .filter((j) => j.status === "error")
                  .slice(0, 8)
                  .map((j) => (
                    <div key={j.id} className="flex items-center gap-2 text-xs group">
                      <span>❌</span>
                      <span className="text-foreground truncate flex-1">{(j.result as any)?.title || j.file_name}</span>
                      <span className="text-destructive text-[10px] truncate max-w-[120px]">
                        {(j.result as any)?.error}
                      </span>
                      <button
                        onClick={() => retryJob(j.id)}
                        className="opacity-0 group-hover:opacity-100 text-primary hover:text-primary/80 transition-opacity"
                        title="إعادة المحاولة"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {queueStats.queued > 0 && !queueActive && (
          <Button onClick={start} className="gap-2">
            <Upload className="w-4 h-4" /> رفع {queueStats.queued} ملف
          </Button>
        )}
        {queueActive && (
          <Button disabled className="gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> جاري الرفع... ({queueStats.uploading} متزامن)
          </Button>
        )}
        {queueJobs.length > 0 && !queueActive && (
          <Button variant="outline" onClick={resetQueue}>مسح الكل</Button>
        )}
      </div>
    </div>
  );
};

export default BulkPdfUpload;
