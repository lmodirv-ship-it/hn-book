import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Upload, Loader2, CheckCircle2, XCircle, FileText,
  BookOpen, CreditCard, Layout, ImageIcon, FileCheck,
  MonitorPlay, HelpCircle, Download, ExternalLink,
  Archive, RotateCcw
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

// Threshold: files above this size are uploaded to storage first
const DIRECT_UPLOAD_LIMIT = 10 * 1024 * 1024; // 10MB

const BookGeneration = () => {
  const [processing, setProcessing] = useState(false);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessedItem[]>([]);
  const [sourceName, setSourceName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File): Promise<ProcessedItem[]> => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    const url = `https://${projectId}.supabase.co/functions/v1/process-universal-file`;

    let response: Response;

    if (file.size > DIRECT_UPLOAD_LIMIT) {
      // Large file: upload to storage first, then send path
      const tempPath = `temp-uploads/${Date.now()}-${file.name}`;
      
      const { error: uploadErr } = await supabase.storage
        .from("book-files")
        .upload(tempPath, file, { upsert: true });

      if (uploadErr) {
        return [{ success: false, fileName: file.name, error: "فشل رفع الملف إلى التخزين: " + uploadErr.message }];
      }

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
      // Small file: send directly as FormData
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
    setSourceName(null);

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

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    return `${Math.round(bytes / 1024)}KB`;
  };

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
                  جاري التحليل والتصنيف والترقيم والحفظ...
                </p>
                {currentFile && (
                  <p className="text-xs text-muted-foreground mt-1 truncate max-w-xs">{currentFile}</p>
                )}
              </div>
              <Progress value={progress} className="w-56 h-2" />
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
                <p className="text-sm font-medium text-foreground">اسحب الملفات هنا أو اضغط للاختيار</p>
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
                      {/* Thumbnail */}
                      {r.cover ? (
                        <img src={r.cover} alt="" className="w-10 h-12 rounded-lg object-cover bg-secondary" />
                      ) : (
                        <div className="w-10 h-12 rounded-lg bg-secondary/50 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}

                      {/* Info */}
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

                      {/* Code badge */}
                      {r.code && (
                        <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded-md">{r.code}</span>
                      )}
                      <Badge variant="outline" className="text-[10px] shrink-0">{r.fileExt?.toUpperCase()}</Badge>

                      {/* Actions */}
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

export default BookGeneration;
