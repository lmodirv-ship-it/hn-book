import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Upload, Loader2, CheckCircle2, XCircle, FileText,
  BookOpen, CreditCard, Layout, ImageIcon, FileCheck,
  MonitorPlay, HelpCircle, Download, ExternalLink,
  Archive, RotateCcw, FolderSearch
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProcessedItem {
  success: boolean;
  id?: string;
  code?: string;
  category?: string;
  name?: string;
  cover?: string | null;
  file_url?: string;
  fileName: string;
  fromArchive?: string | null;
  fileSizeKB?: number;
  fileExt?: string;
  error?: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  "كتب": BookOpen,
  "بطاقات": CreditCard,
  "قوالب": Layout,
  "صور": ImageIcon,
  "وثائق": FileCheck,
  "عروض": MonitorPlay,
  "أخرى": HelpCircle,
};

// Files under this go directly via FormData to edge function
const DIRECT_UPLOAD_LIMIT = 10 * 1024 * 1024; // 10MB
// Files under this go to storage then edge function processes them
const EDGE_FUNCTION_LIMIT = 50 * 1024 * 1024; // 50MB
// Files above EDGE_FUNCTION_LIMIT are uploaded to storage and saved directly (no edge function)

const CATEGORY_MAP: Record<string, string> = {
  pdf: "كتب", jpg: "صور", jpeg: "صور", png: "صور", gif: "صور", webp: "صور",
  bmp: "صور", svg: "صور", tiff: "صور", heic: "صور", avif: "صور",
  doc: "وثائق", docx: "وثائق", txt: "وثائق", rtf: "وثائق", odt: "وثائق", md: "وثائق",
  ppt: "عروض", pptx: "عروض", key: "عروض", odp: "عروض",
  xls: "وثائق", xlsx: "وثائق", csv: "وثائق", ods: "وثائق",
  psd: "قوالب", ai: "قوالب", eps: "قوالب", fig: "قوالب", sketch: "قوالب",
  zip: "أخرى", rar: "أخرى", "7z": "أخرى",
};

const CATEGORY_PREFIXES: Record<string, string> = {
  "كتب": "HNB", "بطاقات": "HNC", "قوالب": "HNT", "صور": "HNI",
  "وثائق": "HND", "عروض": "HNP", "أخرى": "HNX",
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const BookGeneration = () => {
  const [processing, setProcessing] = useState(false);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessedItem[]>([]);
  const [sourceName, setSourceName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [pendingTotalSize, setPendingTotalSize] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get next product code from DB
  const getNextCode = async (prefix: string): Promise<string> => {
    const { data } = await supabase
      .from("products")
      .select("badge")
      .like("badge", `${prefix}-%`);
    let max = 0;
    if (data) {
      for (const p of data) {
        const m = p.badge?.match(new RegExp(`${prefix}-(\\d+)`));
        if (m) { const n = parseInt(m[1]); if (n > max) max = n; }
      }
    }
    return `${prefix}-${String(max + 1).padStart(4, "0")}`;
  };

  // Direct save for very large files (skip edge function to avoid timeout)
  const processLargeFile = async (file: File): Promise<ProcessedItem[]> => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const category = CATEGORY_MAP[ext] || "أخرى";
    const prefix = CATEGORY_PREFIXES[category] || "HNX";

    // Step 1: Upload to storage with XHR for progress tracking
    setStatusMessage("جاري رفع الملف...");
    const tempPath = `temp-uploads/${Date.now()}-${file.name}`;

    // Use chunked upload via XMLHttpRequest for progress
    const uploaded = await uploadWithProgress(file, tempPath);
    if (!uploaded) {
      return [{ success: false, fileName: file.name, error: "فشل رفع الملف" }];
    }

    // Step 2: Generate code
    setStatusMessage("جاري الترقيم والتصنيف...");
    const itemCode = await getNextCode(prefix);

    // Step 3: Move file to permanent location
    const bucket = category === "صور" ? "book-images" : "book-files";
    const permanentPath = `products/${itemCode}/${itemCode}.${ext}`;

    // Copy from temp to permanent
    const { error: copyErr } = await supabase.storage
      .from(bucket)
      .copy(tempPath.replace("temp-uploads/", ""), permanentPath);

    // If copy doesn't work (same bucket issue), download and re-upload
    let fileUrl: string;
    if (copyErr) {
      // File is already in book-files, just move/rename
      const { data: moveData, error: moveErr } = await supabase.storage
        .from("book-files")
        .move(tempPath, permanentPath);

      if (moveErr) {
        // Fallback: use the temp path as-is
        fileUrl = `${SUPABASE_URL}/storage/v1/object/public/book-files/${tempPath}`;
      } else {
        fileUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${permanentPath}`;
      }
    } else {
      fileUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${permanentPath}`;
      // Remove temp file
      await supabase.storage.from("book-files").remove([tempPath]);
    }

    const coverUrl = category === "صور" ? fileUrl : null;
    const fileSizeKB = Math.round(file.size / 1024);
    const productName = `${itemCode} - ${file.name.replace(/\.[^.]+$/, "")}`;

    // Step 4: Save to database
    setStatusMessage("جاري الحفظ في قاعدة البيانات...");
    const { data: product, error: insertErr } = await supabase.from("products").insert({
      name: productName,
      short_description: `ملف ${ext.toUpperCase()} - ${formatSize(file.size)}`,
      description: `ملف ${file.name}\nالحجم: ${formatSize(file.size)}\nالنوع: ${category}`,
      category,
      price: 0,
      image: coverUrl,
      pdf_url: ext === "pdf" ? fileUrl : null,
      badge: itemCode,
      is_active: true,
      features: [
        `النوع: ${category}`,
        `الصيغة: ${ext.toUpperCase()}`,
        `الحجم: ${formatSize(file.size)}`,
      ],
    }).select("id").single();

    if (insertErr) {
      return [{ success: false, fileName: file.name, error: "فشل الحفظ: " + insertErr.message }];
    }

    // Step 5: Create file reference
    const fileType = category === "صور" ? "image" : ext === "pdf" ? "pdf" : "other";
    await supabase.from("product_files").insert({
      product_id: product.id,
      file_type: fileType as any,
      file_name: `${itemCode}.${ext}`,
      storage_path: `${bucket}/${permanentPath}`,
      public_url: fileUrl,
      file_size: file.size,
      is_primary: true,
    });

    return [{
      success: true,
      id: product.id,
      code: itemCode,
      category,
      name: productName,
      cover: coverUrl,
      file_url: fileUrl,
      fileName: file.name,
      fileSizeKB,
      fileExt: ext,
    }];
  };

  // Upload with progress tracking using XMLHttpRequest
  const uploadWithProgress = (file: File, path: string): Promise<boolean> => {
    return new Promise(async (resolve) => {
      try {
        // For very large files, use the Supabase storage upload directly
        // The JS client doesn't support progress, so we track by polling
        setUploadProgress(0);

        const chunkSize = 50 * 1024 * 1024; // 50MB chunks
        const totalChunks = Math.ceil(file.size / chunkSize);

        if (totalChunks <= 1) {
          // Single upload
          const { error } = await supabase.storage
            .from("book-files")
            .upload(path, file, { upsert: true });
          setUploadProgress(100);
          resolve(!error);
        } else {
          // For very large files, upload as single file (Supabase handles it)
          // Show estimated progress based on time
          const startTime = Date.now();
          const estimatedSpeed = 2 * 1024 * 1024; // ~2MB/s estimate
          const estimatedTime = (file.size / estimatedSpeed) * 1000;

          const progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const estimatedProgress = Math.min(95, (elapsed / estimatedTime) * 100);
            setUploadProgress(Math.round(estimatedProgress));
          }, 500);

          const { error } = await supabase.storage
            .from("book-files")
            .upload(path, file, { upsert: true });

          clearInterval(progressInterval);
          setUploadProgress(100);
          resolve(!error);
        }
      } catch {
        resolve(false);
      }
    });
  };

  const processFile = async (file: File): Promise<ProcessedItem[]> => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    const url = `https://${projectId}.supabase.co/functions/v1/process-universal-file`;

    let response: Response;

    if (file.size > EDGE_FUNCTION_LIMIT) {
      // Very large file: process directly on client side
      setStatusMessage(`ملف كبير (${formatSize(file.size)}) — رفع مباشر ومعالجة محلية`);
      return processLargeFile(file);
    } else if (file.size > DIRECT_UPLOAD_LIMIT) {
      // Medium file: upload to storage, then edge function processes
      setStatusMessage("جاري الرفع للتخزين...");
      const tempPath = `temp-uploads/${Date.now()}-${file.name}`;

      const uploaded = await uploadWithProgress(file, tempPath);
      if (!uploaded) {
        return [{ success: false, fileName: file.name, error: "فشل رفع الملف إلى التخزين" }];
      }

      setStatusMessage("جاري التحليل بالذكاء الاصطناعي...");
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storage_path: tempPath,
          file_name: file.name,
          bucket: "book-files",
        }),
      });
    } else {
      // Small file: send directly
      setStatusMessage("جاري التحليل والتصنيف...");
      const formData = new FormData();
      formData.append("file", file);

      response = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return [{ success: false, fileName: file.name, error: err.error || "فشل المعالجة" }];
    }

    const data = await response.json();
    setSourceName(data.source || file.name);
    return data.results || [];
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setProcessing(true);
    setResults([]);
    setProgress(0);
    setUploadProgress(0);
    setSourceName(null);
    setStatusMessage("");

    const allResults: ProcessedItem[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setCurrentFile(`${file.name} (${formatSize(file.size)})`);
      setProgress(Math.round((i / fileArray.length) * 100));

      try {
        const fileResults = await processFile(file);
        allResults.push(...fileResults);
        setResults([...allResults]);
      } catch (err: any) {
        allResults.push({ success: false, fileName: file.name, error: err.message });
        setResults([...allResults]);
      }
    }

    setProgress(100);
    setCurrentFile(null);
    setProcessing(false);
    setStatusMessage("");
    setUploadProgress(0);

    const successCount = allResults.filter(r => r.success).length;
    if (successCount > 0) {
      toast.success(`✅ تم معالجة وحفظ ${successCount} عنصر بنجاح`);
    }
    if (successCount < allResults.length) {
      toast.error(`فشل ${allResults.length - successCount} عنصر`);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleFolderPick = useCallback(async () => {
    try {
      const dirHandle = await (window as any).showDirectoryPicker();
      const files: File[] = [];
      
      const collectFiles = async (handle: any, path = "") => {
        for await (const entry of handle.values()) {
          if (entry.kind === "file") {
            const file = await entry.getFile();
            // Skip hidden/system files
            if (!file.name.startsWith(".") && file.size > 512) {
              files.push(file);
            }
          } else if (entry.kind === "directory" && !entry.name.startsWith(".") && entry.name !== "__MACOSX") {
            await collectFiles(entry, `${path}${entry.name}/`);
          }
        }
      };
      
      await collectFiles(dirHandle);
      
      if (files.length === 0) {
        toast.error("لم يتم العثور على ملفات في المجلد");
        return;
      }
      
      toast.info(`تم اكتشاف ${files.length} ملف — جاري المعالجة...`);
      handleFiles(files);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast.error("فشل في فتح المجلد");
      }
    }
  }, [handleFiles]);

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  const grouped = results.filter(r => r.success).reduce((acc, r) => {
    const cat = r.category || "أخرى";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(r);
    return acc;
  }, {} as Record<string, ProcessedItem[]>);

  return (
    <div className="space-y-6" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-extrabold text-foreground">🗂️ نظام الاستيراد الذكي</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          ارفع أي ملف بأي حجم — يحلل ويصنف ويرقّم ويحفظ ويُنشئ روابط التحميل تلقائياً
        </p>
      </motion.div>

      {/* Category legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(CATEGORY_ICONS).map(([cat, Icon]) => (
          <div key={cat} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs text-muted-foreground">
            <Icon className="w-3.5 h-3.5" />
            <span>{cat}</span>
          </div>
        ))}
      </div>

      {/* Drop zone */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
        <button
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          disabled={processing}
          className={`w-full py-12 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-4 ${
            dragOver
              ? "border-primary bg-primary/10 scale-[1.01]"
              : processing
              ? "border-border bg-secondary/10 cursor-wait"
              : "border-border hover:border-primary/50 bg-card hover:bg-secondary/10"
          }`}
        >
          {processing ? (
            <>
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">
                  {statusMessage || "جاري المعالجة..."}
                </p>
                {currentFile && (
                  <p className="text-xs text-muted-foreground mt-1 truncate max-w-xs">{currentFile}</p>
                )}
              </div>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-56 space-y-1">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-[10px] text-muted-foreground text-center">رفع: {uploadProgress}%</p>
                </div>
              )}
              {uploadProgress === 0 && <Progress value={progress} className="w-56 h-2" />}
              {results.length > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  ✅ {results.filter(r => r.success).length} محفوظ
                </p>
              )}
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">اسحب الملفات هنا أو اضغط للتحميل</p>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  PDF · صور · Word · PowerPoint · Excel · <strong>ZIP</strong> · وأكثر
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  نظام متكامل: تحليل ← تصنيف ← ترقيم ← رفع ← حفظ ← رابط تحميل · <strong>بدون حد للحجم</strong>
                </p>
              </div>
            </>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="*/*"
          multiple
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />

        {/* Analyse folder button */}
        {!processing && (
          <Button
            variant="outline"
            className="w-full mt-3 gap-2 border-dashed border-primary/30 text-primary hover:bg-primary/10"
            onClick={handleFolderPick}
          >
            <FolderSearch className="w-4 h-4" />
            Analyse — تحليل مجلد كامل
          </Button>
        )}
      </motion.div>

      {/* Results */}
      {results.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl space-y-4">
          {/* Stats bar */}
          <div className="flex items-center gap-3 flex-wrap">
            {sourceName && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Archive className="w-3.5 h-3.5" /> {sourceName}
              </span>
            )}
            <span className="text-sm text-muted-foreground">
              المجموع: <strong className="text-foreground">{results.length}</strong>
            </span>
            {successCount > 0 && (
              <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20">
                <CheckCircle2 className="w-3 h-3 ml-1" /> {successCount} محفوظ
              </Badge>
            )}
            {failCount > 0 && (
              <Badge variant="secondary" className="bg-red-500/10 text-red-400 border-red-500/20">
                <XCircle className="w-3 h-3 ml-1" /> {failCount} فشل
              </Badge>
            )}
            {!processing && (
              <Button
                variant="ghost"
                size="sm"
                className="mr-auto text-xs"
                onClick={() => { setResults([]); setSourceName(null); }}
              >
                <RotateCcw className="w-3 h-3 ml-1" /> استيراد جديد
              </Button>
            )}
          </div>

          {/* Success banner */}
          {!processing && successCount > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-400">
                  ✅ تم حفظ {successCount} عنصر — مع الملفات والترقيم وروابط التحميل
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 border-green-500/30 text-green-400 hover:bg-green-500/10"
                onClick={() => window.location.href = "/admin/products"}
              >
                عرض المنتجات
              </Button>
            </div>
          )}

          {/* Grouped results */}
          {Object.entries(grouped).map(([cat, items]) => {
            const Icon = CATEGORY_ICONS[cat] || HelpCircle;
            return (
              <div key={cat} className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-secondary/30 border-b border-border">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{cat}</span>
                  <span className="text-xs text-muted-foreground mr-auto">({items.length})</span>
                </div>
                <div className="divide-y divide-border">
                  {items.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      {r.cover ? (
                        <img src={r.cover} alt="" className="w-10 h-12 rounded-lg object-cover bg-secondary" />
                      ) : (
                        <div className="w-10 h-12 rounded-lg bg-secondary/50 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                          <span>{r.fileName}</span>
                          <span>·</span>
                          <span>{r.fileSizeKB && r.fileSizeKB > 1024 ? `${(r.fileSizeKB / 1024).toFixed(1)}MB` : `${r.fileSizeKB}KB`}</span>
                          {r.fromArchive && (
                            <><span>·</span><Archive className="w-3 h-3 inline" /></>
                          )}
                        </p>
                      </div>
                      {r.code && (
                        <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded-md">{r.code}</span>
                      )}
                      <Badge variant="outline" className="text-[10px] shrink-0">{r.fileExt?.toUpperCase()}</Badge>
                      {r.file_url && (
                        <a href={r.file_url} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
                          title="تحميل الملف">
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                      {r.id && (
                        <a href={`/product/${r.id}`} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
                          title="عرض المنتج">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Failed items */}
          {failCount > 0 && (
            <div className="rounded-2xl border border-red-500/20 bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-red-500/5 border-b border-red-500/20">
                <XCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-semibold text-red-400">فشل في المعالجة</span>
              </div>
              <div className="divide-y divide-border">
                {results.filter(r => !r.success).map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span className="text-sm text-foreground truncate">{r.fileName}</span>
                    <span className="text-xs text-red-400 mr-auto truncate">({r.error})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${Math.round(bytes / 1024)}KB`;
}

export default BookGeneration;
