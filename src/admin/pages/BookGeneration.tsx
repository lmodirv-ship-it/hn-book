import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Upload, Loader2, CheckCircle2, XCircle, FileText, Image, FileSpreadsheet,
  Presentation, Archive, Palette, File, Sparkles, BookOpen, CreditCard,
  Layout, ImageIcon, FileCheck, MonitorPlay, HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProcessResult {
  success: boolean;
  code: string;
  category: string;
  name: string;
  cover?: string;
  file_url?: string;
  error?: string;
  fileName: string;
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

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/*",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/zip",
  "application/x-rar-compressed",
  "image/svg+xml",
  "application/postscript",
].join(",");

const BookGeneration = () => {
  const [processing, setProcessing] = useState(false);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessResult[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File): Promise<ProcessResult> => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/process-universal-file`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return { success: false, code: "", category: "", name: "", error: data.error || "فشل", fileName: file.name };
      }

      return {
        success: true,
        code: data.code,
        category: data.category,
        name: data.name,
        cover: data.cover,
        file_url: data.file_url,
        fileName: file.name,
      };
    } catch (err: any) {
      return { success: false, code: "", category: "", name: "", error: err.message, fileName: file.name };
    }
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // Validate sizes
    const maxSize = 20 * 1024 * 1024;
    const oversized = fileArray.filter(f => f.size > maxSize);
    if (oversized.length > 0) {
      toast.error(`${oversized.length} ملف(ات) تتجاوز 20MB`);
      return;
    }

    setProcessing(true);
    setResults([]);
    setProgress(0);

    const allResults: ProcessResult[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setCurrentFile(file.name);
      setProgress(Math.round(((i) / fileArray.length) * 100));

      const result = await processFile(file);
      allResults.push(result);
      setResults([...allResults]);
    }

    setProgress(100);
    setCurrentFile(null);
    setProcessing(false);

    const successCount = allResults.filter(r => r.success).length;
    if (successCount > 0) {
      toast.success(`تم معالجة ${successCount} من ${fileArray.length} ملف بنجاح`);
    }
    if (successCount < fileArray.length) {
      toast.error(`فشل في معالجة ${fileArray.length - successCount} ملف`);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  // Group results by category
  const grouped = results.filter(r => r.success).reduce((acc, r) => {
    const cat = r.category || "أخرى";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(r);
    return acc;
  }, {} as Record<string, ProcessResult[]>);

  return (
    <div className="space-y-6" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-extrabold text-foreground">🗂️ نظام الاستيراد الذكي</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          ارفع أي ملف — النظام يحلله ويصنفه ويرقمه تلقائياً (كتب، بطاقات، قوالب، صور، وثائق...)
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
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl"
      >
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
                <p className="text-sm font-semibold text-foreground">جاري المعالجة...</p>
                {currentFile && (
                  <p className="text-xs text-muted-foreground mt-1 truncate max-w-xs">{currentFile}</p>
                )}
              </div>
              <Progress value={progress} className="w-56 h-2" />
              <p className="text-[10px] text-muted-foreground">
                {results.length} / {results.length + 1} ملف
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">اسحب الملفات هنا أو اضغط للاختيار</p>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  PDF · صور · Word · PowerPoint · Excel · ZIP · SVG · وأكثر
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  يدعم ملفات متعددة · حتى 20MB لكل ملف · تصنيف وترقيم تلقائي بالذكاء الاصطناعي
                </p>
              </div>
            </>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
      </motion.div>

      {/* Results summary */}
      {results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl space-y-4"
        >
          {/* Stats */}
          <div className="flex items-center gap-4 text-sm px-1">
            <span className="text-muted-foreground">المجموع: <strong className="text-foreground">{results.length}</strong></span>
            {successCount > 0 && <span className="text-green-400">✅ نجح: <strong>{successCount}</strong></span>}
            {failCount > 0 && <span className="text-red-400">❌ فشل: <strong>{failCount}</strong></span>}
          </div>

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
                        <p className="text-[11px] text-muted-foreground">{r.fileName}</p>
                      </div>
                      <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded-md">{r.code}</span>
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
