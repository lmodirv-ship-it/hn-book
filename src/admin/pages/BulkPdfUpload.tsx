import { useRef } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, Check, X, Loader2, AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useUploadQueue } from "@/hooks/useUploadQueue";
import { storageService } from "@/services/storageService";
import { bookService, invalidateBookCache } from "@/services/bookService";
import { detectCategory } from "@/lib/category-detection";
import { generateBookCover } from "@/lib/cover-generator";

interface BookPayload {
  file: File;
  title: string;
  category: string;
}

function cleanFilename(filename: string): string {
  return filename
    .replace(/\.pdf$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function processBookUpload(payload: BookPayload): Promise<void> {
  // 1. Upload PDF
  const pdfResult = await storageService.uploadBookPdf(payload.file);
  if (pdfResult.error) throw new Error(pdfResult.error);

  const { publicUrl: pdfUrl, referenceCode } = pdfResult.data!;

  // 2. Generate cover
  const coverBlob = await generateBookCover(payload.title, referenceCode);
  const coverFile = new File([coverBlob], `${referenceCode}.jpg`, { type: "image/jpeg" });

  // 3. Upload cover
  const coverResult = await storageService.uploadBookImage(coverFile, referenceCode);
  const coverUrl = coverResult.data?.publicUrl || pdfUrl;

  // 4. Create book
  const createResult = await bookService.create({
    name: payload.title,
    category: payload.category,
    price: 0,
    pdfUrl,
    referenceCode,
    image: coverUrl,
  });

  if (createResult.error) {
    await storageService.removePdfByPath(pdfResult.data!.storagePath);
    throw new Error(createResult.error);
  }
}

const BulkPdfUpload = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { jobs, stats, isActive, enqueue, start, retryFailed, clearDone, reset } =
    useUploadQueue<BookPayload>({
      concurrency: 5,
      maxRetries: 2,
      processor: processBookUpload,
      onComplete: ({ success, failed }) => {
        if (success) {
          invalidateBookCache();
          toast.success(`تم إنشاء ${success} كتاب${failed ? ` · فشل ${failed}` : ""}`);
        } else if (failed) {
          toast.error(`فشل رفع جميع الملفات (${failed})`);
        }
      },
    });

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

  const handleStart = () => start();

  const progressPercent =
    stats.total > 0 ? Math.round(((stats.done + stats.errors) / stats.total) * 100) : 0;

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
        onDrop={(e) => {
          e.preventDefault();
          addFiles(Array.from(e.dataTransfer.files));
        }}
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
        onChange={(e) => {
          addFiles(Array.from(e.target.files || []));
          e.target.value = "";
        }}
        className="hidden"
      />

      {/* Progress bar */}
      {isActive && stats.total > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {stats.uploading > 0 && `⚡ ${stats.uploading} جاري الرفع`}
              {stats.uploading > 0 && stats.done > 0 && " · "}
              {stats.done > 0 && `✓ ${stats.done} مكتمل`}
            </span>
            <span>{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
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
            <div key={j.id} className="flex items-center gap-3 px-4 py-3">
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
                <p className="text-sm font-medium text-foreground truncate">{j.payload.title}</p>
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
                  <p className="text-[11px] text-primary mt-0.5">✓ تم إنشاء الكتاب</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {stats.queued > 0 && !isActive && (
          <Button onClick={handleStart} className="gap-2">
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
