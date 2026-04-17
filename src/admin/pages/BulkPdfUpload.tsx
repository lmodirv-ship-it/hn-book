import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Upload, Check, Loader2, Zap, Database, RotateCcw,
  BookOpen, CreditCard, Image as ImageIcon, Award,
  FileText, Presentation, Layers, Sticker, List, Files, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useUploadQueue } from "@/hooks/useUploadQueue";
import { useJobProcessor } from "@/hooks/useJobProcessor";
import { storageService } from "@/services/storageService";
import { detectCategory } from "@/lib/category-detection";
import { generateCoverAsync, terminateCoverWorker } from "@/lib/cover-worker-client";
import { getPdfPageCount } from "@/lib/pdf-cover-extractor";
import { db } from "@/api/client";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──

type ImportType =
  | "books" | "cards" | "templates" | "images" | "documents"
  | "presentations" | "tablous" | "logos" | "flyers"
  | "stickers" | "menus" | "other";

interface BookPayload { file: File; title: string; category: string; }
interface AssetPayload { file: File; title: string; type: ImportType; }

interface TypeCfg {
  label: string;
  icon: typeof BookOpen;
  hint: string;
  table: "card_templates" | "tablous" | "logos" | "digital_assets";
  imageField: string;
  assetType?: string;
}

const TYPE_CONFIG: Record<ImportType, TypeCfg> = {
  books:         { label: "كتب",       icon: BookOpen,     hint: "PDF, DOCX, EPUB, TXT — يُولَّد غلاف تلقائياً", table: "card_templates", imageField: "image" },
  cards:         { label: "بطاقات",    icon: CreditCard,   hint: "PSD, AI, SVG, صور",            table: "card_templates",   imageField: "image_url" },
  templates:     { label: "قوالب",     icon: Layers,       hint: "PSD, AI, INDD, صور",           table: "digital_assets",   imageField: "image_url", assetType: "template" },
  images:        { label: "صور",       icon: ImageIcon,    hint: "JPG, PNG, WEBP, TIFF",         table: "digital_assets",   imageField: "image_url", assetType: "image" },
  documents:     { label: "وثائق",     icon: FileText,     hint: "PDF, DOCX, TXT",               table: "digital_assets",   imageField: "image_url", assetType: "document" },
  presentations: { label: "عروض",      icon: Presentation, hint: "PPTX, PDF, KEY",               table: "digital_assets",   imageField: "image_url", assetType: "presentation" },
  tablous:       { label: "تابلوهات",  icon: ImageIcon,    hint: "صور عالية الدقة, PSD",         table: "tablous",          imageField: "image_url" },
  logos:         { label: "شعارات",    icon: Award,        hint: "SVG, PNG, AI, PDF",            table: "logos",            imageField: "image_url" },
  flyers:        { label: "فلاير",     icon: Sparkles,     hint: "PSD, AI, PDF, JPG",            table: "digital_assets",   imageField: "image_url", assetType: "flyer" },
  stickers:      { label: "ملصقات",    icon: Sticker,      hint: "SVG, PNG شفاف, PSD",           table: "digital_assets",   imageField: "image_url", assetType: "sticker" },
  menus:         { label: "قوائم",     icon: List,         hint: "PDF, PSD, AI",                 table: "digital_assets",   imageField: "image_url", assetType: "menu" },
  other:         { label: "أخرى",      icon: Files,        hint: "أي صيغة أخرى",                 table: "digital_assets",   imageField: "image_url", assetType: "other" },
};

const BUCKET = "book-images";

// ── Helpers ──

function cleanFilename(filename: string): string {
  return filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Auto-detect type by extension when user is on "books" tab and uploads non-PDF */
function detectAssetTypeByExt(file: File): ImportType {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (["psd", "ai", "eps", "indd"].includes(ext)) return "templates";
  if (["svg"].includes(ext)) return "logos";
  if (["pptx", "ppt", "key"].includes(ext)) return "presentations";
  if (["docx", "doc", "txt", "rtf"].includes(ext)) return "documents";
  if (["jpg", "jpeg", "png", "webp", "tiff", "bmp", "gif"].includes(ext)) return "images";
  return "other";
}

async function uploadFilesAndCreateJob(payload: BookPayload): Promise<void> {
  const [pdfResult, coverBlob, pageCount] = await Promise.all([
    storageService.uploadBookPdf(payload.file),
    generateCoverAsync(payload.title, "GEN"),
    getPdfPageCount(payload.file).catch(() => null),
  ]);

  if (pdfResult.error) throw new Error(pdfResult.error);
  const { publicUrl: pdfUrl, referenceCode, storagePath } = pdfResult.data!;

  const coverFile = new File([coverBlob], `${referenceCode}.jpg`, { type: "image/jpeg" });
  const coverResult = await storageService.uploadBookImage(coverFile, referenceCode);
  const image = coverResult.data?.publicUrl || pdfUrl;

  const { error: jobError } = await db.from("upload_jobs").insert({
    file_name: payload.file.name,
    status: "pending",
    result: { title: payload.title, category: payload.category, pdfUrl, image, referenceCode, storagePath, pageCount },
  } as any);

  if (jobError) {
    await storageService.removePdfByPath(storagePath);
    throw new Error(jobError.message);
  }
}

async function uploadAsset(payload: AssetPayload): Promise<void> {
  const cfg = TYPE_CONFIG[payload.type];
  const ext = payload.file.name.split(".").pop()?.toLowerCase() || "bin";
  const safeKey = `${payload.type}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(safeKey, payload.file, { cacheControl: "3600", upsert: false });
  if (upErr) throw new Error(upErr.message);

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(safeKey);
  const publicUrl = pub.publicUrl;

  const isImage = payload.file.type.startsWith("image/");
  const previewUrl = isImage ? publicUrl : "/placeholder.svg";

  let row: any;
  if (cfg.table === "tablous") {
    row = { title: payload.title, image_url: previewUrl, base_price: 100, is_active: true };
  } else if (cfg.table === "digital_assets") {
    row = {
      title: payload.title,
      asset_type: cfg.assetType || "other",
      image_url: previewUrl,
      file_url: publicUrl,
      is_active: true,
    };
  } else {
    row = { name: payload.title, [cfg.imageField]: previewUrl, is_active: true };
  }

  const { error: insErr } = await (supabase as any).from(cfg.table).insert(row);
  if (insErr) throw new Error(insErr.message);
}

// ── Component ──

const BulkPdfUpload = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importType, setImportType] = useState<ImportType>("books");

  const booksQ = useUploadQueue<BookPayload>({
    concurrency: 5, maxRetries: 2, processor: uploadFilesAndCreateJob,
    onComplete: ({ success, failed }) => {
      if (success) toast.success(`تم رفع ${success} ملف — جاري إنشاء الكتب...`);
      if (failed) toast.error(`فشل رفع ${failed} ملف`);
    },
  });

  const assetsQ = useUploadQueue<AssetPayload>({
    concurrency: 5, maxRetries: 2, processor: uploadAsset,
    onComplete: ({ success, failed }) => {
      if (success) toast.success(`✅ تم رفع وإضافة ${success} عنصر`);
      if (failed) toast.error(`❌ فشل ${failed} عنصر`);
    },
  });

  const isBooks = importType === "books";
  const queue = isBooks ? booksQ : assetsQ;

  const { jobs: dbJobs, stats: dbStats, workerActive, retryFailed, retryJob } = useJobProcessor({
    autoTrigger: isBooks,
    onBatchComplete: ({ success, failed }) => {
      if (success) toast.success(`✅ تم إنشاء ${success} كتاب`);
      if (failed) toast.error(`❌ فشل إنشاء ${failed} كتاب`);
    },
  });

  useEffect(() => () => terminateCoverWorker(), []);

  const cfg = TYPE_CONFIG[importType];

  const addFiles = (selected: File[]) => {
    if (!selected.length) return;
    const pdfs: File[] = [];
    const assets: { file: File; type: ImportType }[] = [];

    for (const f of selected) {
      const ext = f.name.split(".").pop()?.toLowerCase() || "";
      if (isBooks && (f.type === "application/pdf" || ext === "pdf")) {
        pdfs.push(f);
      } else {
        assets.push({ file: f, type: isBooks ? detectAssetTypeByExt(f) : importType });
      }
    }

    if (pdfs.length) {
      booksQ.enqueue(
        pdfs.map((file) => {
          const title = cleanFilename(file.name);
          const { category } = detectCategory(title);
          return { file, title, category };
        })
      );
    }
    if (assets.length) {
      if (isBooks) {
        const groups = assets.reduce((acc, a) => {
          acc[a.type] = (acc[a.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const summary = Object.entries(groups)
          .map(([k, v]) => `${v} ${TYPE_CONFIG[k as ImportType].label}`)
          .join(" · ");
        toast.info(`🔀 توجيه تلقائي: ${summary}`);
      }
      assetsQ.enqueue(
        assets.map(({ file, type }) => ({ file, title: cleanFilename(file.name), type }))
      );
    }
  };

  const stats = queue.stats;
  const uploadProgress =
    stats.total > 0 ? Math.round(((stats.done + stats.errors) / stats.total) * 100) : 0;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-extrabold text-foreground">🗂️ نظام الاستيراد الذكي</h1>
        <p className="text-sm text-muted-foreground mt-1">
          ارفع كتب، بطاقات، قوالب، صور، عروض، فلاير، شعارات وغيرها — توجيه تلقائي حسب الصيغة
        </p>
      </motion.div>

      {/* Type selector */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {(Object.keys(TYPE_CONFIG) as ImportType[]).map((t) => {
          const c = TYPE_CONFIG[t];
          const Icon = c.icon;
          const active = importType === t;
          return (
            <button
              key={t}
              onClick={() => { setImportType(t); booksQ.reset(); assetsQ.reset(); }}
              className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5 ${
                active
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-semibold">{c.label}</span>
            </button>
          );
        })}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); addFiles(Array.from(e.dataTransfer.files)); }}
        onClick={() => fileInputRef.current?.click()}
        className="cursor-pointer rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-card/50 p-10 flex flex-col items-center justify-center gap-3 transition-colors"
      >
        <Upload className="w-10 h-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">اسحب الملفات هنا أو اضغط لاختيارها</p>
        <p className="text-xs text-muted-foreground/70">{cfg.hint}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
          <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1">
            <Zap className="w-3 h-3" /> 5x متزامن
          </span>
          {isBooks ? (
            <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1">
              <Database className="w-3 h-3" /> Backend Worker + توجيه تلقائي
            </span>
          ) : (
            <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1">
              <Check className="w-3 h-3" /> إضافة فورية
            </span>
          )}
        </div>
      </div>
      <input
        ref={fileInputRef} type="file" accept="*/*" multiple
        onChange={(e) => { addFiles(Array.from(e.target.files || [])); e.target.value = ""; }}
        className="hidden"
      />

      {/* Upload progress */}
      {queue.isActive && stats.total > 0 && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <Upload className="w-3 h-3" /> رفع
              {stats.uploading > 0 && (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> {stats.uploading} جاري
                </span>
              )}
            </span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </motion.div>
      )}

      {/* Backend worker status (books only) */}
      {isBooks && (dbStats.pending > 0 || dbStats.processing > 0 || workerActive) && (
        <motion.div
          initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-accent/10 border border-accent/20"
        >
          <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">🔄 معالجة خلفية</span>{" — "}
            {dbStats.processing > 0 && `${dbStats.processing} جاري الإنشاء`}
            {dbStats.processing > 0 && dbStats.pending > 0 && " · "}
            {dbStats.pending > 0 && `${dbStats.pending} في الانتظار`}
          </div>
        </motion.div>
      )}

      {/* Stats chips */}
      {queue.jobs.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs px-3 py-1.5 rounded-full bg-secondary text-muted-foreground">
            ملفات: {stats.total}
          </span>
          {stats.queued > 0 && <span className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary">⏳ {stats.queued}</span>}
          {stats.uploading > 0 && <span className="text-xs px-3 py-1.5 rounded-full bg-accent/20">🔄 {stats.uploading}</span>}
          {stats.done > 0 && <span className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary">✅ {stats.done}</span>}
          {stats.errors > 0 && <span className="text-xs px-3 py-1.5 rounded-full bg-destructive/10 text-destructive">❌ {stats.errors}</span>}
        </div>
      )}

      {/* File list */}
      {queue.jobs.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border/50 max-h-[300px] overflow-y-auto">
          {queue.jobs.map((j: any) => (
            <div key={j.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm">
                {j.status === "uploading" ? "🔄" : j.status === "done" ? "✅" : j.status === "error" ? "❌" : "⏳"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{j.payload.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">
                    {(j.payload.file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  {j.payload.type && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      {TYPE_CONFIG[j.payload.type as ImportType]?.label}
                    </span>
                  )}
                </div>
                {j.status === "error" && <p className="text-[11px] text-destructive mt-0.5">{j.error}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Backend results (books only) */}
      {isBooks && (dbStats.done > 0 || dbStats.errors > 0) && !queue.isActive && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center gap-4">
            <p className="text-sm font-semibold text-foreground">📊 ملخص</p>
            <div className="flex items-center gap-3 text-xs">
              {dbStats.done > 0 && <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">✅ {dbStats.done}</span>}
              {dbStats.errors > 0 && <span className="px-2.5 py-1 rounded-full bg-destructive/10 text-destructive font-medium">❌ {dbStats.errors}</span>}
            </div>
          </div>
          {dbStats.errors > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-destructive font-medium">❌ مهام فشلت</p>
                <Button variant="ghost" size="sm" className="h-6 text-[11px] gap-1 text-primary" onClick={retryFailed}>
                  <RotateCcw className="w-3 h-3" /> إعادة الكل
                </Button>
              </div>
              <div className="space-y-1">
                {dbJobs.filter((j) => j.status === "error").slice(0, 8).map((j) => (
                  <div key={j.id} className="flex items-center gap-2 text-xs group">
                    <span>❌</span>
                    <span className="text-foreground truncate flex-1">{(j.result as any)?.title || j.file_name}</span>
                    <button onClick={() => retryJob(j.id)} className="opacity-0 group-hover:opacity-100 text-primary">
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
        {stats.queued > 0 && !queue.isActive && (
          <Button onClick={queue.start} className="gap-2">
            <Upload className="w-4 h-4" /> رفع {stats.queued} ملف
          </Button>
        )}
        {queue.isActive && (
          <Button disabled className="gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> جاري الرفع... ({stats.uploading})
          </Button>
        )}
        {queue.jobs.length > 0 && !queue.isActive && (
          <Button variant="outline" onClick={queue.reset}>مسح الكل</Button>
        )}
      </div>
    </div>
  );
};

export default BulkPdfUpload;
