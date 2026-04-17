import { useRef, useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, X, Check, Copy, Search, Loader2, FileText, FolderOpen,
  File, Sparkles, Trash2, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  assetService, ASSET_TYPE_META, ASSET_CATEGORIES,
  type AssetType, type AssetCategory, type Asset,
} from "@/services/assetService";

const BUCKET = "book-images";

const IMAGE_EXTS = ["jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff"];
const SOURCE_EXTS = ["eps", "ai", "psd", "indd", "svg", "cdr", "sketch", "fig"];

// Formats that the browser/Supabase storage cannot accept directly.
// .cdr (CorelDRAW) needs server-side conversion (Inkscape/Ghostscript) which is
// NOT available in this environment. Reject upfront with a clear message.
const UNSUPPORTED_DIRECT_EXTS = new Set(["cdr"]);
const MAX_FILE_SIZE_MB = 50;

function describeUploadError(err: unknown, file: File): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const ext = fileExt(file.name);
  // Common patterns
  if (/Failed to fetch|NetworkError|network/i.test(msg)) {
    return `تعذّر الاتصال بالخادم أثناء رفع "${file.name}". تحقق من الإنترنت أو حجم الملف (${(file.size / 1024 / 1024).toFixed(1)}MB).`;
  }
  if (/payload|too large|413/i.test(msg)) {
    return `الملف "${file.name}" كبير جداً (${(file.size / 1024 / 1024).toFixed(1)}MB). الحد الأقصى ${MAX_FILE_SIZE_MB}MB.`;
  }
  if (/row-level security|policy|permission|403|401/i.test(msg)) {
    return `لا تملك صلاحية رفع "${file.name}". يرجى تسجيل الدخول كمسؤول.`;
  }
  if (/duplicate|already exists|409/i.test(msg)) {
    return `ملف بنفس الاسم موجود مسبقاً (${file.name}).`;
  }
  if (/mime|type|unsupported/i.test(msg)) {
    return `نوع الملف غير مدعوم: .${ext}`;
  }
  return msg || `فشل رفع "${file.name}"`;
}

// ── Auto-detect asset type from file ──
function detectType(file: File): AssetType {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const name = file.name.toLowerCase();

  if (/(card|carte|بطاقة|بطاقات)/.test(name)) return "CRD";
  if (/(flyer|فلاير|flayer)/.test(name)) return "FLY";
  if (/(poster|ملصق|affiche)/.test(name)) return "PST";
  if (/(logo|شعار)/.test(name)) return "LOG";
  if (/(template|قالب|قوالب)/.test(name)) return "TPL";
  if (/(menu|قائمة|قوائم)/.test(name)) return "LST";
  if (/(art|فن|artwork)/.test(name)) return "ART";

  if (["psd", "ai", "indd", "eps"].includes(ext)) return "TPL";
  if (["svg"].includes(ext)) return "LOG";
  if (["pptx", "ppt", "key"].includes(ext)) return "PRE";
  if (["pdf", "docx", "doc", "txt", "rtf"].includes(ext)) return "DOC";
  if (IMAGE_EXTS.includes(ext)) return "IMG";
  return "OTH";
}

function previewYearSeq(year: number): string {
  return `${year}-?????`;
}

function buildPreviewCode(type: AssetType): string {
  const cat = ASSET_TYPE_META[type].category;
  const year = new Date().getFullYear();
  return `HN-${cat}-${type}-${previewYearSeq(year)}`;
}

function cleanTitle(filename: string): string {
  return filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
}

function fileExt(name: string): string {
  return name.split(".").pop()?.toLowerCase() || "";
}

// ── Pending item types ──
interface PendingFileItem {
  kind: "file";
  id: string;
  file: File;
  title: string;
  type: AssetType;
  previewUrl: string;
  isImage: boolean;
  uploading: boolean;
  progress: number;
  error: string | null;
  status: "idle" | "uploading" | "success" | "error";
}

interface PendingFolderItem {
  kind: "folder";
  id: string;
  folderName: string;
  title: string;
  previewFile: File | null;        // front (or only) preview image
  backFile: File | null;           // back image when detected
  sourceFile: File | null;
  extraFiles: File[];
  previewUrl: string;              // front preview blob url
  backUrl: string;                 // back preview blob url
  warning: string | null;
  uploading: boolean;
  progress: number;
  error: string | null;
  status: "idle" | "uploading" | "success" | "error";
}

type PendingItem = PendingFileItem | PendingFolderItem;

// ── Group files by top-level folder using webkitRelativePath ──
function groupFilesByFolder(files: File[]): Map<string, File[]> {
  const groups = new Map<string, File[]>();
  for (const f of files) {
    // @ts-ignore - webkitRelativePath exists on File from directory input
    const rel: string = f.webkitRelativePath || "";
    if (!rel.includes("/")) continue;
    const parts = rel.split("/");
    const folderKey = parts.slice(0, -1).join("/");
    if (!groups.has(folderKey)) groups.set(folderKey, []);
    groups.get(folderKey)!.push(f);
  }
  return groups;
}

const FRONT_RE = /(^|[^a-z])(front|recto|amam|amami|أمام|واجهة)([^a-z]|$)/i;
const BACK_RE = /(^|[^a-z])(back|verso|khalf|khalfi|خلف|خلفية|ظهر)([^a-z]|$)/i;

function buildFolderItem(folderPath: string, files: File[]): PendingFolderItem | null {
  const folderName = folderPath.split("/").pop() || folderPath;
  const images = files.filter((f) => IMAGE_EXTS.includes(fileExt(f.name)));
  // Pick a source file but skip unsupported direct uploads (e.g. .cdr).
  const sourceFile =
    files.find((f) => SOURCE_EXTS.includes(fileExt(f.name)) && !UNSUPPORTED_DIRECT_EXTS.has(fileExt(f.name))) || null;
  const hasUnsupportedSource = files.some((f) => UNSUPPORTED_DIRECT_EXTS.has(fileExt(f.name)));

  // Detect front/back by filename
  const frontByName = images.find((f) => FRONT_RE.test(f.name)) || null;
  const backByName = images.find((f) => BACK_RE.test(f.name)) || null;

  let previewFile: File | null = frontByName;
  let backFile: File | null = backByName;

  // Fallbacks
  if (!previewFile) {
    // pick first image that isn't the back
    previewFile = images.find((f) => f !== backFile) || null;
  }
  if (!previewFile) return null; // skip folders without any preview

  const usedImages = new Set([previewFile, backFile].filter(Boolean) as File[]);
  const extraFiles = files.filter(
    (f) => !usedImages.has(f) && f !== sourceFile,
  );

  const warnings: string[] = [];
  if (!sourceFile) warnings.push("ملف المصدر (EPS/AI) غير موجود");
  if (hasUnsupportedSource) warnings.push("ملف .cdr تم تخطيه (يحتاج تحويل سيرفر)");
  if (!backFile && images.length >= 2) warnings.push("لم يتم تحديد الوجه الخلفي تلقائياً");

  return {
    kind: "folder",
    id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    folderName,
    title: folderName.replace(/[-_]+/g, " ").trim(),
    previewFile,
    backFile,
    sourceFile,
    extraFiles,
    previewUrl: URL.createObjectURL(previewFile),
    backUrl: backFile ? URL.createObjectURL(backFile) : "",
    warning: warnings.length ? warnings.join(" • ") : null,
    uploading: false,
    progress: 0,
    error: null,
    status: "idle",
  };
}

const SmartImportPage = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [savedAssets, setSavedAssets] = useState<Asset[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<AssetCategory | "all">("all");
  const [filterType, setFilterType] = useState<AssetType | "all">("all");

  useEffect(() => {
    void loadAssets();
  }, []);

  const loadAssets = async () => {
    setLoadingList(true);
    try {
      const list = await assetService.list({ limit: 100 });
      setSavedAssets(list);
    } catch (e: any) {
      toast.error(`فشل تحميل الأصول: ${e.message}`);
    } finally {
      setLoadingList(false);
    }
  };

  // ── Add individual files ──
  const addFiles = (files: File[]) => {
    if (!files.length) return;

    // Pre-validate: reject unsupported formats and oversize files with a clear message.
    const accepted: File[] = [];
    const rejections: string[] = [];
    for (const file of files) {
      const ext = fileExt(file.name);
      if (UNSUPPORTED_DIRECT_EXTS.has(ext)) {
        rejections.push(`❌ ${file.name}: صيغة .${ext} تتطلب تحويلاً للسيرفر (Inkscape/Ghostscript). ارفع SVG/PDF بدلها أو حوّل الملف أولاً.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        rejections.push(`❌ ${file.name}: حجم ${(file.size / 1024 / 1024).toFixed(1)}MB يتجاوز الحد ${MAX_FILE_SIZE_MB}MB.`);
        continue;
      }
      accepted.push(file);
    }
    rejections.forEach((m) => toast.error(m, { duration: 6000 }));
    if (!accepted.length) return;

    const items: PendingFileItem[] = accepted.map((file) => {
      const type = detectType(file);
      const isImage = file.type.startsWith("image/");
      return {
        kind: "file",
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        title: cleanTitle(file.name),
        type,
        previewUrl: isImage ? URL.createObjectURL(file) : "",
        isImage,
        uploading: false,
        progress: 0,
        error: null,
        status: "idle",
      };
    });
    setPending((prev) => [...items, ...prev]);
    toast.info(`📥 ${items.length} ملف جاهز للمعاينة`);
  };

  // ── Add folder upload ──
  const addFolder = (files: File[]) => {
    if (!files.length) return;
    const groups = groupFilesByFolder(files);
    if (groups.size === 0) {
      toast.error("لم يتم اكتشاف أي مجلد");
      return;
    }

    const folderItems: PendingFolderItem[] = [];
    let skipped = 0;
    for (const [path, groupFiles] of groups) {
      const item = buildFolderItem(path, groupFiles);
      if (item) folderItems.push(item);
      else skipped++;
    }

    if (folderItems.length === 0) {
      toast.error("جميع المجلدات بدون صورة معاينة — تم التخطي");
      return;
    }

    setPending((prev) => [...folderItems, ...prev]);
    const warningCount = folderItems.filter((f) => f.warning).length;
    toast.success(
      `📁 ${folderItems.length} مجلد جاهز${skipped > 0 ? ` • تم تخطي ${skipped}` : ""}${warningCount > 0 ? ` • ${warningCount} بدون مصدر` : ""}`,
    );
  };

  const updatePending = (id: string, patch: Partial<PendingItem>) =>
    setPending((prev) =>
      prev.map((p) => (p.id === id ? ({ ...p, ...patch } as PendingItem) : p)),
    );

  const removePending = (id: string) => {
    setPending((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) {
        if ("previewUrl" in item && item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        if (item.kind === "folder" && item.backUrl) URL.revokeObjectURL(item.backUrl);
      }
      return prev.filter((p) => p.id !== id);
    });
  };

  // ── Upload helper (with timeout + descriptive errors) ──
  const uploadToBucket = async (file: File, prefix: string): Promise<string> => {
    const ext = fileExt(file.name) || "bin";
    if (UNSUPPORTED_DIRECT_EXTS.has(ext)) {
      throw new Error(`الصيغة .${ext} لا تُدعم للرفع المباشر. حوّل الملف إلى SVG/PDF أولاً.`);
    }
    const safeKey = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    try {
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(safeKey, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;
    } catch (e) {
      throw new Error(describeUploadError(e, file));
    }
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(safeKey);
    return pub.publicUrl;
  };

  // ── Save single file asset ──
  const saveFileAsset = async (item: PendingFileItem) => {
    updatePending(item.id, { uploading: true, progress: 10, status: "uploading", error: null } as Partial<PendingFileItem>);
    try {
      updatePending(item.id, { progress: 40 } as Partial<PendingFileItem>);
      const fileUrl = await uploadToBucket(item.file, `assets/${item.type}`);
      const imageUrl = item.isImage ? fileUrl : "/placeholder.svg";

      updatePending(item.id, { progress: 80 } as Partial<PendingFileItem>);
      const created = await assetService.create({
        asset_type: item.type,
        title: item.title.trim() || cleanTitle(item.file.name),
        image_url: imageUrl,
        file_url: fileUrl,
      });

      updatePending(item.id, { progress: 100, status: "success" } as Partial<PendingFileItem>);
      toast.success(`✅ ${created.code}`);
      // Keep success card briefly then remove
      setTimeout(() => removePending(item.id), 800);
      setSavedAssets((prev) => [created, ...prev]);
    } catch (e: any) {
      const msg = e?.message || "خطأ غير معروف";
      toast.error(`❌ ${item.file.name}: ${msg}`, { duration: 6000 });
      updatePending(item.id, {
        uploading: false,
        progress: 0,
        status: "error",
        error: msg,
      } as Partial<PendingFileItem>);
      throw e;
    }
  };

  // ── Save folder asset (CRD) ──
  const saveFolderAsset = async (item: PendingFolderItem) => {
    if (!item.previewFile) {
      const msg = "لا توجد صورة معاينة في المجلد";
      toast.error(msg);
      updatePending(item.id, { status: "error", error: msg } as Partial<PendingFolderItem>);
      return;
    }
    updatePending(item.id, { uploading: true, progress: 5, status: "uploading", error: null } as Partial<PendingFolderItem>);
    try {
      // Upload front (preview) image
      updatePending(item.id, { progress: 20 } as Partial<PendingFolderItem>);
      const imageUrl = await uploadToBucket(item.previewFile, `assets/CRD/front`);

      // Upload back image if detected
      let backUrl: string | null = null;
      if (item.backFile) {
        updatePending(item.id, { progress: 45 } as Partial<PendingFolderItem>);
        backUrl = await uploadToBucket(item.backFile, `assets/CRD/back`);
      }

      // Upload source file if available (skipped automatically for unsupported formats)
      let fileUrl: string | null = null;
      if (item.sourceFile) {
        updatePending(item.id, { progress: 70 } as Partial<PendingFolderItem>);
        fileUrl = await uploadToBucket(item.sourceFile, `assets/CRD/source`);
      }

      updatePending(item.id, { progress: 90 } as Partial<PendingFolderItem>);
      const created = await assetService.create({
        asset_type: "CRD",
        title: item.title.trim() || item.folderName,
        image_url: imageUrl,
        file_url: fileUrl ?? imageUrl,
        metadata: {
          front_image: imageUrl,
          back_image: backUrl,
          has_back: !!backUrl,
          source_url: fileUrl,
          folder_name: item.folderName,
        },
      });

      updatePending(item.id, { progress: 100, status: "success" } as Partial<PendingFolderItem>);
      toast.success(`✅ ${created.code} (${item.folderName})`);
      setTimeout(() => removePending(item.id), 800);
      setSavedAssets((prev) => [created, ...prev]);
    } catch (e: any) {
      const msg = e?.message || "خطأ غير معروف";
      toast.error(`❌ ${item.folderName}: ${msg}`, { duration: 6000 });
      updatePending(item.id, {
        uploading: false,
        progress: 0,
        status: "error",
        error: msg,
      } as Partial<PendingFolderItem>);
      throw e;
    }
  };

  const saveItem = async (item: PendingItem) => {
    if (item.kind === "file") return saveFileAsset(item);
    return saveFolderAsset(item);
  };

  const saveAll = async () => {
    const items = [...pending];
    let ok = 0, fail = 0;
    for (const item of items) {
      if (item.uploading) continue;
      try {
        await saveItem(item);
        ok++;
      } catch {
        fail++;
      }
    }
    toast.info(`تم: ${ok} • فشل: ${fail}`);
  };

  // ── Filtered table ──
  const filtered = useMemo(() => {
    return savedAssets.filter((a) => {
      if (filterCategory !== "all" && a.category !== filterCategory) return false;
      if (filterType !== "all" && a.asset_type !== filterType) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!a.code?.toLowerCase().includes(s) && !a.title.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [savedAssets, search, filterCategory, filterType]);

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast.success(`📋 ${code}`);
  };

  const deleteAsset = async (id: string) => {
    if (!confirm("حذف هذا الأصل؟")) return;
    try {
      await assetService.remove(id);
      setSavedAssets((prev) => prev.filter((a) => a.id !== id));
      toast.success("تم الحذف");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" /> الاستيراد الذكي
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          ارفع ملفات أو مجلدات كاملة — كشف تلقائي، توليد كود فوري، معاينة قبل الحفظ
        </p>
      </motion.div>

      {/* Drop zones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); addFiles(Array.from(e.dataTransfer.files)); }}
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer rounded-2xl border-2 border-dashed border-border hover:border-primary/60 bg-card/50 p-8 flex flex-col items-center justify-center gap-2 transition-colors"
        >
          <Upload className="w-8 h-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">رفع ملفات فردية</p>
          <p className="text-[11px] text-muted-foreground text-center">صور، PDF، PSD، AI، SVG...</p>
        </div>

        <div
          onClick={() => folderInputRef.current?.click()}
          className="cursor-pointer rounded-2xl border-2 border-dashed border-primary/40 hover:border-primary bg-primary/5 p-8 flex flex-col items-center justify-center gap-2 transition-colors"
        >
          <FolderOpen className="w-8 h-8 text-primary" />
          <p className="text-sm font-medium text-foreground">رفع مجلدات (CRD)</p>
          <p className="text-[11px] text-muted-foreground text-center">
            كل مجلد = بطاقة واحدة (JPG/PNG + EPS/AI)
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef} type="file" multiple accept="*/*"
        onChange={(e) => { addFiles(Array.from(e.target.files || [])); e.target.value = ""; }}
        className="hidden"
      />
      <input
        ref={folderInputRef} type="file" multiple
        // @ts-ignore - non-standard but supported
        webkitdirectory=""
        directory=""
        onChange={(e) => { addFolder(Array.from(e.target.files || [])); e.target.value = ""; }}
        className="hidden"
      />

      {/* Pending preview cards */}
      <AnimatePresence>
        {pending.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">📋 معاينة قبل الحفظ ({pending.length})</h2>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveAll} className="gap-1">
                  <Check className="w-4 h-4" /> حفظ الكل
                </Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  pending.forEach((p) => {
                    if ("previewUrl" in p && p.previewUrl) URL.revokeObjectURL(p.previewUrl);
                    if (p.kind === "folder" && p.backUrl) URL.revokeObjectURL(p.backUrl);
                  });
                  setPending([]);
                }}>
                  إلغاء الكل
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pending.map((item) => {
                const isFolder = item.kind === "folder";
                const type: AssetType = isFolder ? "CRD" : (item as PendingFileItem).type;
                const meta = ASSET_TYPE_META[type];
                const previewCode = buildPreviewCode(type);

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="rounded-xl border border-border bg-card overflow-hidden"
                  >
                    {/* Preview */}
                    <div className="aspect-video bg-muted flex items-center justify-center relative">
                      {isFolder ? (
                        <>
                          {(item as PendingFolderItem).backFile ? (
                            <div className="grid grid-cols-2 w-full h-full divide-x divide-border/40">
                              <div className="relative h-full">
                                <img
                                  src={(item as PendingFolderItem).previewUrl}
                                  alt="front"
                                  className="w-full h-full object-cover"
                                />
                                <Badge className="absolute bottom-1 right-1 text-[9px] py-0 px-1.5 bg-background/80 text-foreground">
                                  أمام
                                </Badge>
                              </div>
                              <div className="relative h-full">
                                <img
                                  src={(item as PendingFolderItem).backUrl}
                                  alt="back"
                                  className="w-full h-full object-cover"
                                />
                                <Badge className="absolute bottom-1 right-1 text-[9px] py-0 px-1.5 bg-background/80 text-foreground">
                                  خلف
                                </Badge>
                              </div>
                            </div>
                          ) : (
                            <img
                              src={(item as PendingFolderItem).previewUrl}
                              alt={(item as PendingFolderItem).folderName}
                              className="w-full h-full object-cover"
                            />
                          )}
                          <Badge className="absolute top-2 right-2 gap-1 bg-primary/90">
                            <FolderOpen className="w-3 h-3" />
                            {(item as PendingFolderItem).backFile ? "وجهين" : "مجلد"}
                          </Badge>
                        </>
                      ) : (item as PendingFileItem).isImage ? (
                        <img
                          src={(item as PendingFileItem).previewUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <FileText className="w-12 h-12" />
                          <span className="text-xs">{fileExt((item as PendingFileItem).file.name).toUpperCase()}</span>
                        </div>
                      )}
                      <button
                        onClick={() => removePending(item.id)}
                        disabled={item.uploading}
                        className="absolute top-2 left-2 w-7 h-7 rounded-full bg-background/90 hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Body */}
                    <div className="p-3 space-y-3">
                      {/* Generated code */}
                      <div className="rounded-lg bg-primary/10 border border-primary/30 p-2.5 text-center">
                        <p className="text-[10px] text-muted-foreground mb-1">الكود التلقائي</p>
                        <p className="font-mono text-sm font-bold text-primary tracking-tight">
                          {previewCode}
                        </p>
                      </div>

                      {/* Folder details */}
                      {isFolder && (
                        <div className="rounded-lg bg-muted/50 p-2 space-y-1 text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">📁 المجلد:</span>
                            <span className="font-medium text-foreground truncate max-w-[60%]">
                              {(item as PendingFolderItem).folderName}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">🟢 أمام:</span>
                            <span className="text-foreground truncate max-w-[60%]">
                              {(item as PendingFolderItem).previewFile?.name}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">🔵 خلف:</span>
                            <span className={(item as PendingFolderItem).backFile ? "text-foreground truncate max-w-[60%]" : "text-muted-foreground/60"}>
                              {(item as PendingFolderItem).backFile?.name || "—"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">📐 المصدر:</span>
                            <span className={(item as PendingFolderItem).sourceFile ? "text-foreground truncate max-w-[60%]" : "text-destructive"}>
                              {(item as PendingFolderItem).sourceFile?.name || "—"}
                            </span>
                          </div>
                          {(item as PendingFolderItem).warning && (
                            <div className="flex items-center gap-1 text-[10px] mt-1 text-destructive/80">
                              <AlertTriangle className="w-3 h-3" />
                              <span>{(item as PendingFolderItem).warning}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Type / Category for files only */}
                      {!isFolder && (
                        <div className="flex gap-2">
                          <Select
                            value={(item as PendingFileItem).type}
                            onValueChange={(v) => updatePending(item.id, { type: v as AssetType } as Partial<PendingFileItem>)}
                            disabled={item.uploading}
                          >
                            <SelectTrigger className="h-8 text-xs flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.keys(ASSET_TYPE_META) as AssetType[]).map((t) => (
                                <SelectItem key={t} value={t} className="text-xs">
                                  {ASSET_TYPE_META[t].emoji} {ASSET_TYPE_META[t].label} ({t})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Badge variant="outline" className="text-[10px] flex items-center px-2">
                            {ASSET_CATEGORIES[meta.category]}
                          </Badge>
                        </div>
                      )}
                      {isFolder && (
                        <div className="flex gap-2">
                          <Badge className="text-[10px] flex items-center px-2 bg-primary/15 text-primary border-primary/30 border">
                            {meta.emoji} {meta.label} (CRD)
                          </Badge>
                          <Badge variant="outline" className="text-[10px] flex items-center px-2">
                            {ASSET_CATEGORIES[meta.category]}
                          </Badge>
                        </div>
                      )}

                      {/* Title */}
                      <Input
                        value={item.title}
                        onChange={(e) => updatePending(item.id, { title: e.target.value })}
                        placeholder="العنوان"
                        disabled={item.uploading}
                        className="h-8 text-xs"
                      />

                      {/* Progress / Status */}
                      {item.uploading && (
                        <div className="space-y-1">
                          <Progress value={item.progress} className="h-1.5" />
                          <p className="text-[10px] text-muted-foreground text-center">
                            {item.progress < 100 ? `جاري الرفع... ${item.progress}%` : "تم"}
                          </p>
                        </div>
                      )}
                      {item.status === "success" && !item.uploading && (
                        <div className="flex items-center justify-center gap-1 text-[11px] text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 rounded-md py-1.5">
                          <Check className="w-3.5 h-3.5" /> تم الحفظ بنجاح
                        </div>
                      )}
                      {item.status === "error" && item.error && (
                        <div className="flex items-start gap-1.5 text-[11px] text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2">
                          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <span className="leading-snug">{item.error}</span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => saveItem(item)}
                          disabled={item.uploading || !item.title.trim()}
                          className="flex-1 h-8 text-xs gap-1"
                        >
                          {item.uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          حفظ
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removePending(item.id)}
                          disabled={item.uploading}
                          className="h-8 text-xs"
                        >
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved table */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">
            📚 الأصول المحفوظة ({filtered.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="بحث بالكود أو العنوان..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-xs pr-8"
              />
            </div>
            <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v as any)}>
              <SelectTrigger className="h-8 text-xs w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">كل الفئات</SelectItem>
                {(Object.keys(ASSET_CATEGORIES) as AssetCategory[]).map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">{ASSET_CATEGORIES[c]} ({c})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
              <SelectTrigger className="h-8 text-xs w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">كل الأنواع</SelectItem>
                {(Object.keys(ASSET_TYPE_META) as AssetType[]).map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">
                    {ASSET_TYPE_META[t].emoji} {ASSET_TYPE_META[t].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-right p-3 font-medium">معاينة</th>
                  <th className="text-right p-3 font-medium">الكود</th>
                  <th className="text-right p-3 font-medium">العنوان</th>
                  <th className="text-right p-3 font-medium">النوع</th>
                  <th className="text-right p-3 font-medium">الفئة</th>
                  <th className="text-right p-3 font-medium">التاريخ</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loadingList ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin inline" />
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground text-xs">
                    لا توجد أصول بعد
                  </td></tr>
                ) : (
                  filtered.map((a) => {
                    const meta = ASSET_TYPE_META[a.asset_type as AssetType];
                    return (
                      <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-2">
                          <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex items-center justify-center">
                            {a.image_url && a.image_url !== "/placeholder.svg" ? (
                              <img src={a.image_url} alt={a.title} className="w-full h-full object-cover" />
                            ) : (
                              <File className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                        </td>
                        <td className="p-2">
                          <button
                            onClick={() => copyCode(a.code)}
                            className="font-mono text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center gap-1"
                          >
                            {a.code} <Copy className="w-3 h-3" />
                          </button>
                        </td>
                        <td className="p-2 text-foreground text-xs max-w-[200px] truncate">{a.title}</td>
                        <td className="p-2">
                          <Badge variant="secondary" className="text-[10px]">
                            {meta?.emoji} {meta?.label || a.asset_type}
                          </Badge>
                        </td>
                        <td className="p-2 text-xs text-muted-foreground">
                          {ASSET_CATEGORIES[a.category as AssetCategory] || a.category}
                        </td>
                        <td className="p-2 text-[10px] text-muted-foreground whitespace-nowrap">
                          {new Date(a.created_at).toLocaleDateString("ar-MA")}
                        </td>
                        <td className="p-2">
                          <Button size="sm" variant="ghost" onClick={() => deleteAsset(a.id)} className="h-7 w-7 p-0">
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartImportPage;
