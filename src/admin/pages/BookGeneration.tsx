import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Upload, Loader2, CheckCircle2, XCircle, FileText,
  BookOpen, CreditCard, Layout, ImageIcon, FileCheck,
  MonitorPlay, HelpCircle, Download, ExternalLink,
  Archive, RotateCcw, FolderSearch, Frame
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { tablouService } from "@/services/tablouService";
import { printService } from "@/services/printService";

type TargetType = "books" | "tablou" | "cards";

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
  targetType?: TargetType;
}

const TARGET_OPTIONS: { value: TargetType; label: string; icon: any; description: string; accept: string }[] = [
  { value: "books", label: "كتب ومنتجات", icon: BookOpen, description: "PDF، وثائق، صور — يُحفظ في جدول المنتجات", accept: "*/*" },
  { value: "tablou", label: "تابلوهات", icon: Frame, description: "صور فنية — يُحفظ في جدول التابلوهات مع 3 أحجام تلقائياً", accept: "image/*" },
  { value: "cards", label: "قوالب بطاقات", icon: CreditCard, description: "تصاميم بطاقات أعمال — يُحفظ في جدول القوالب", accept: "image/*" },
];

const CATEGORY_ICONS: Record<string, any> = {
  "كتب": BookOpen,
  "بطاقات": CreditCard,
  "قوالب": Layout,
  "صور": ImageIcon,
  "وثائق": FileCheck,
  "عروض": MonitorPlay,
  "تابلوهات": Frame,
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
  const [targetType, setTargetType] = useState<TargetType>("books");
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
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const FILE_FILTERS: { key: string; label: string; icon: any; exts: string[] }[] = [
    { key: "pdf", label: "PDF", icon: BookOpen, exts: ["pdf"] },
    { key: "images", label: "صور", icon: ImageIcon, exts: ["jpg","jpeg","png","gif","webp","bmp","svg","tiff","heic","avif"] },
    { key: "docs", label: "وثائق", icon: FileCheck, exts: ["doc","docx","txt","rtf","odt","md","xls","xlsx","csv","ods"] },
    { key: "presentations", label: "عروض", icon: MonitorPlay, exts: ["ppt","pptx","key","odp"] },
    { key: "design", label: "تصميم", icon: Layout, exts: ["psd","ai","eps","fig","sketch","svg"] },
    { key: "archives", label: "أرشيف", icon: Archive, exts: ["zip","rar","7z","tar","gz"] },
  ];

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

  // Smart route: process file for Tablou target
  const processTablouFile = async (file: File): Promise<ProcessedItem[]> => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const isImage = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "avif"].includes(ext);
    if (!isImage) {
      return [{ success: false, fileName: file.name, error: "التابلوهات تقبل صور فقط", targetType: "tablou" }];
    }
    setStatusMessage("جاري رفع التابلو...");
    try {
      const id = await tablouService.smartUpload(file);
      const title = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      return [{
        success: true,
        id,
        name: title,
        category: "تابلوهات",
        fileName: file.name,
        fileSizeKB: Math.round(file.size / 1024),
        fileExt: ext,
        targetType: "tablou",
      }];
    } catch (err: any) {
      return [{ success: false, fileName: file.name, error: err.message, targetType: "tablou" }];
    }
  };

  // Smart route: process file for Card Template target
  const processCardFile = async (file: File): Promise<ProcessedItem[]> => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
    if (!isImage) {
      return [{ success: false, fileName: file.name, error: "قوالب البطاقات تقبل صور فقط", targetType: "cards" }];
    }
    setStatusMessage("جاري رفع قالب البطاقة...");
    try {
      const path = `card-templates/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("book-images").upload(path, file);
      if (uploadErr) throw new Error(uploadErr.message);
      const { data: urlData } = supabase.storage.from("book-images").getPublicUrl(path);
      const name = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      await printService.createTemplate(name, urlData.publicUrl, "business");
      return [{
        success: true,
        name,
        category: "بطاقات",
        cover: urlData.publicUrl,
        fileName: file.name,
        fileSizeKB: Math.round(file.size / 1024),
        fileExt: ext,
        targetType: "cards",
      }];
    } catch (err: any) {
      return [{ success: false, fileName: file.name, error: err.message, targetType: "cards" }];
    }
  };

  const processFile = async (file: File): Promise<ProcessedItem[]> => {
    // Route to correct handler based on target type
    if (targetType === "tablou") return processTablouFile(file);
    if (targetType === "cards") return processCardFile(file);

    // Default: books/products (existing logic)
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

  const handleFolderFiles = useCallback((files: File[]) => {
    const filtered = files.filter(f => !f.name.startsWith(".") && f.size > 512 && !f.webkitRelativePath?.includes("__MACOSX"));
    if (filtered.length === 0) {
      toast.error("لم يتم العثور على ملفات في المجلد");
      return;
    }
    const totalSize = filtered.reduce((sum, f) => sum + f.size, 0);
    setPendingFiles(filtered);
    setPendingTotalSize(totalSize);
  }, []);

  const handleFolderPick = useCallback(async () => {
    // Try modern File System Access API first
    if ((window as any).showDirectoryPicker) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        const files: File[] = [];
        
        const collectFiles = async (handle: any, path = "") => {
          for await (const entry of handle.values()) {
            if (entry.kind === "file") {
              const file = await entry.getFile();
              if (!file.name.startsWith(".") && file.size > 512) {
                files.push(file);
              }
            } else if (entry.kind === "directory" && !entry.name.startsWith(".") && entry.name !== "__MACOSX") {
              await collectFiles(entry, `${path}${entry.name}/`);
            }
          }
        };
        
        await collectFiles(dirHandle);
        handleFolderFiles(files);
        return;
      } catch (err: any) {
        if (err.name === "AbortError") return;
        // Fall through to webkitdirectory fallback
      }
    }

    // Fallback: use hidden input with webkitdirectory
    folderInputRef.current?.click();
  }, [handleFolderFiles]);

  const handleFolderInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFolderFiles(Array.from(e.target.files));
    }
    if (folderInputRef.current) folderInputRef.current.value = "";
  }, [handleFolderFiles]);

  const getFileExt = (name: string) => name.split(".").pop()?.toLowerCase() || "";

  const filteredPendingFiles = useCallback(() => {
    if (!pendingFiles) return [];
    if (activeFilters.size === 0) return pendingFiles;
    const allowedExts = new Set<string>();
    FILE_FILTERS.filter(f => activeFilters.has(f.key)).forEach(f => f.exts.forEach(e => allowedExts.add(e)));
    return pendingFiles.filter(f => allowedExts.has(getFileExt(f.name)));
  }, [pendingFiles, activeFilters]);

  const confirmPendingFiles = useCallback(() => {
    const files = filteredPendingFiles();
    if (files.length > 0) {
      handleFiles(files);
    }
    setPendingFiles(null);
    setPendingTotalSize(0);
    setActiveFilters(new Set());
  }, [filteredPendingFiles, handleFiles]);

  const cancelPendingFiles = useCallback(() => {
    setPendingFiles(null);
    setPendingTotalSize(0);
    setActiveFilters(new Set());
  }, []);

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  const grouped = results.filter(r => r.success).reduce((acc, r) => {
    const cat = r.category || "أخرى";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(r);
    return acc;
  }, {} as Record<string, ProcessedItem[]>);

  const currentTarget = TARGET_OPTIONS.find(t => t.value === targetType)!;

  return (
    <div className="space-y-6" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-extrabold text-foreground">🗂️ نظام الاستيراد الذكي</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          ارفع أي ملف بأي حجم — يحلل ويصنف ويرقّم ويحفظ ويُنشئ روابط التحميل تلقائياً
        </p>
      </motion.div>

      {/* Target type selector */}
      <div className="grid grid-cols-3 gap-3 max-w-3xl">
        {TARGET_OPTIONS.map(opt => {
          const Icon = opt.icon;
          const active = targetType === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => !processing && setTargetType(opt.value)}
              className={`p-3 rounded-xl border-2 text-right transition-all ${
                active
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/40"
              } ${processing ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-5 h-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-bold ${active ? "text-primary" : "text-foreground"}`}>{opt.label}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{opt.description}</p>
            </button>
          );
        })}
      </div>

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
        <input
          ref={folderInputRef}
          type="file"
          {...({ webkitdirectory: "", directory: "", mozdirectory: "" } as any)}
          multiple
          onChange={handleFolderInputChange}
          className="hidden"
        />

        {/* Analyse folder button */}
        {!processing && !pendingFiles && (
          <Button
            variant="outline"
            className="w-full mt-3 gap-2 border-dashed border-primary/30 text-primary hover:bg-primary/10"
            onClick={handleFolderPick}
          >
            <FolderSearch className="w-4 h-4" />
            Analyse — تحليل مجلد كامل
          </Button>
        )}

        {/* Pending files confirmation */}
        {pendingFiles && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FolderSearch className="w-4 h-4 text-primary" />
              تم اكتشاف {pendingFiles.length} ملف — الحجم الإجمالي: {formatSize(pendingTotalSize)}
            </div>

            {/* Filter chips */}
            <div className="space-y-1.5">
              <p className="text-[11px] text-muted-foreground font-medium">فلتر حسب النوع:</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {FILE_FILTERS.map(({ key, label, icon: Icon, exts }) => {
                  const count = pendingFiles.filter(f => exts.includes(getFileExt(f.name))).length;
                  if (count === 0) return null;
                  const isActive = activeFilters.has(key);
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        const next = new Set(activeFilters);
                        if (isActive) next.delete(key); else next.add(key);
                        setActiveFilters(next);
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                        isActive
                          ? "bg-primary/20 border-primary/40 text-primary"
                          : "bg-secondary/30 border-border text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {label} ({count})
                    </button>
                  );
                })}
                {activeFilters.size > 0 && (
                  <button
                    onClick={() => setActiveFilters(new Set())}
                    className="text-[10px] text-muted-foreground hover:text-foreground underline mr-1"
                  >
                    إزالة الفلتر
                  </button>
                )}
              </div>
            </div>

            {/* Filtered file list */}
            {(() => {
              const filtered = filteredPendingFiles();
              const filteredSize = filtered.reduce((s, f) => s + f.size, 0);
              return (
                <>
                  {activeFilters.size > 0 && (
                    <p className="text-[11px] text-primary font-medium">
                      سيتم معالجة {filtered.length} ملف من أصل {pendingFiles.length} — {formatSize(filteredSize)}
                    </p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground max-h-20 overflow-y-auto">
                    {filtered.slice(0, 20).map((f, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-secondary/50">{f.name}</span>
                    ))}
                    {filtered.length > 20 && (
                      <span className="text-muted-foreground">+{filtered.length - 20} ملف آخر</span>
                    )}
                  </div>
                </>
              );
            })()}

            <div className="flex items-center gap-2">
              <Button size="sm" onClick={confirmPendingFiles} className="gap-1" disabled={filteredPendingFiles().length === 0}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                بدء المعالجة ({filteredPendingFiles().length})
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelPendingFiles}>
                إلغاء
              </Button>
            </div>
          </motion.div>
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
