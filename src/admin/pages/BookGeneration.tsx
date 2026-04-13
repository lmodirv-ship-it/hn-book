import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Loader2, CheckCircle2, XCircle, FileText,
  BookOpen, CreditCard, Layout, ImageIcon, FileCheck,
  MonitorPlay, HelpCircle, Download, ExternalLink, Save,
  Archive, Trash2, Edit2, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AnalyzedItem {
  index: number;
  fileName: string;
  fileExt: string;
  mimeCategory: string;
  fileSizeKB: number;
  fromArchive: string | null;
  category: string;
  name_ar: string;
  name_fr: string;
  name_en: string;
  description_ar: string;
  description_fr: string;
  description_en: string;
  author: string;
  tags: string[];
  suggested_price: number;
  file_url: string | null;
  storage_path: string;
  cover_url: string | null;
  // UI state
  selected: boolean;
  saved: boolean;
  saving: boolean;
  editingName: boolean;
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

const BookGeneration = () => {
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [items, setItems] = useState<AnalyzedItem[]>([]);
  const [sourceName, setSourceName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/process-universal-file?mode=analyze`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "فشل التحليل");
    }

    return await response.json();
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const maxSize = 20 * 1024 * 1024;
    const oversized = fileArray.filter(f => f.size > maxSize);
    if (oversized.length > 0) {
      toast.error(`${oversized.length} ملف(ات) تتجاوز 20MB`);
      return;
    }

    setAnalyzing(true);
    setItems([]);
    setProgress(0);
    setSourceName(null);

    const allItems: AnalyzedItem[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setCurrentFile(file.name);
      setProgress(Math.round((i / fileArray.length) * 100));

      try {
        const result = await analyzeFile(file);
        if (result.items) {
          const mapped = result.items.map((item: any) => ({
            ...item,
            selected: true,
            saved: false,
            saving: false,
            editingName: false,
          }));
          allItems.push(...mapped);
          setSourceName(result.source || file.name);
        }
      } catch (err: any) {
        toast.error(`فشل تحليل ${file.name}: ${err.message}`);
      }
    }

    setItems(allItems);
    setProgress(100);
    setCurrentFile(null);
    setAnalyzing(false);

    if (allItems.length > 0) {
      toast.success(`✅ تم تحليل ${allItems.length} عنصر — راجعها ثم اضغط حفظ`);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const toggleSelect = (index: number) => {
    setItems(prev => prev.map(it => it.index === index ? { ...it, selected: !it.selected } : it));
  };

  const toggleSelectAll = () => {
    const allSelected = items.every(it => it.selected || it.saved);
    setItems(prev => prev.map(it => it.saved ? it : { ...it, selected: !allSelected }));
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter(it => it.index !== index));
  };

  const updateItemName = (index: number, name: string) => {
    setItems(prev => prev.map(it => it.index === index ? { ...it, name_ar: name, editingName: false } : it));
  };

  const handleSaveSelected = async () => {
    const toSave = items.filter(it => it.selected && !it.saved);
    if (toSave.length === 0) {
      toast.error("لا يوجد عناصر محددة للحفظ");
      return;
    }

    setSaving(true);
    setItems(prev => prev.map(it =>
      it.selected && !it.saved ? { ...it, saving: true } : it
    ));

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/process-universal-file?mode=save`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ items: toSave }),
        }
      );

      const data = await response.json();

      if (data.results) {
        const successIndexes = new Set(
          data.results.filter((r: any) => r.success).map((r: any) => r.index)
        );
        const savedCount = successIndexes.size;

        setItems(prev => prev.map(it => {
          if (successIndexes.has(it.index)) {
            const result = data.results.find((r: any) => r.index === it.index);
            return { ...it, saved: true, saving: false, selected: false, code: result?.code };
          }
          return { ...it, saving: false };
        }));

        if (savedCount > 0) toast.success(`✅ تم حفظ ${savedCount} عنصر في قاعدة البيانات`);
        const failCount = toSave.length - savedCount;
        if (failCount > 0) toast.error(`فشل حفظ ${failCount} عنصر`);
      }
    } catch (err: any) {
      toast.error("خطأ في الحفظ: " + err.message);
      setItems(prev => prev.map(it => ({ ...it, saving: false })));
    }

    setSaving(false);
  };

  const selectedCount = items.filter(it => it.selected && !it.saved).length;
  const savedCount = items.filter(it => it.saved).length;

  const grouped = items.reduce((acc, item) => {
    const cat = item.category || "أخرى";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, AnalyzedItem[]>);

  return (
    <div className="space-y-6" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-extrabold text-foreground">🗂️ نظام الاستيراد الذكي</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          ارفع أي ملف أو ZIP — النظام يحلل المحتوى ويستخرج كل عنصر ويصنفه، ثم تختار ما تريد حفظه
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
          disabled={analyzing}
          className={`w-full py-12 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-4 ${
            dragOver
              ? "border-primary bg-primary/10 scale-[1.01]"
              : analyzing
              ? "border-border bg-secondary/10 cursor-wait"
              : "border-border hover:border-primary/50 bg-card hover:bg-secondary/10"
          }`}
        >
          {analyzing ? (
            <>
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">جاري التحليل والاستخراج...</p>
                {currentFile && (
                  <p className="text-xs text-muted-foreground mt-1 truncate max-w-xs">{currentFile}</p>
                )}
              </div>
              <Progress value={progress} className="w-56 h-2" />
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
                  يفتح ملفات ZIP ويستخرج محتوياتها · يحلل كل ملف بالذكاء الاصطناعي · حتى 20MB
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
      {items.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl space-y-4">
          {/* Header bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-muted-foreground">
              {sourceName && <><Archive className="w-3.5 h-3.5 inline ml-1" />{sourceName} · </>}
              <strong className="text-foreground">{items.length}</strong> عنصر
            </span>
            {savedCount > 0 && (
              <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20">
                <CheckCircle2 className="w-3 h-3 ml-1" /> {savedCount} محفوظ
              </Badge>
            )}
            <div className="mr-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="text-xs">
                {items.every(it => it.selected || it.saved) ? "إلغاء تحديد الكل" : "تحديد الكل"}
              </Button>
            </div>
          </div>

          {/* Save button */}
          {selectedCount > 0 && (
            <Button
              onClick={handleSaveSelected}
              disabled={saving}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              size="lg"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جاري الحفظ...</>
              ) : (
                <><Save className="w-4 h-4 ml-2" /> حفظ {selectedCount} عنصر في قاعدة البيانات</>
              )}
            </Button>
          )}

          {/* Grouped items */}
          {Object.entries(grouped).map(([cat, catItems]) => {
            const Icon = CATEGORY_ICONS[cat] || HelpCircle;
            return (
              <div key={cat} className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-secondary/30 border-b border-border">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{cat}</span>
                  <span className="text-xs text-muted-foreground mr-auto">({catItems.length})</span>
                </div>
                <div className="divide-y divide-border">
                  {catItems.map((item) => (
                    <div
                      key={item.index}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                        item.saved ? "bg-green-500/5" : item.selected ? "bg-primary/5" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      {!item.saved && (
                        <button
                          onClick={() => toggleSelect(item.index)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            item.selected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          {item.selected && <Check className="w-3 h-3" />}
                        </button>
                      )}
                      {item.saved && (
                        <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                      )}

                      {/* Thumbnail */}
                      {item.cover_url ? (
                        <img src={item.cover_url} alt="" className="w-10 h-12 rounded-lg object-cover bg-secondary" />
                      ) : (
                        <div className="w-10 h-12 rounded-lg bg-secondary/50 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        {item.editingName ? (
                          <Input
                            defaultValue={item.name_ar}
                            autoFocus
                            className="h-7 text-sm"
                            onBlur={(e) => updateItemName(item.index, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") updateItemName(item.index, (e.target as HTMLInputElement).value);
                            }}
                          />
                        ) : (
                          <p className="text-sm font-medium text-foreground truncate">
                            {item.name_ar}
                            {!item.saved && (
                              <button
                                onClick={() => setItems(prev => prev.map(it =>
                                  it.index === item.index ? { ...it, editingName: true } : it
                                ))}
                                className="inline-block mr-1 text-muted-foreground hover:text-foreground"
                              >
                                <Edit2 className="w-3 h-3 inline" />
                              </button>
                            )}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                          <span>{item.fileName}</span>
                          <span>·</span>
                          <span>{item.fileSizeKB}KB</span>
                          {item.fromArchive && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-0.5"><Archive className="w-3 h-3" /> ZIP</span>
                            </>
                          )}
                        </p>
                      </div>

                      {/* Status badges */}
                      {item.saving && <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />}
                      {(item as any).code && (
                        <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded-md">
                          {(item as any).code}
                        </span>
                      )}
                      <Badge variant="outline" className="text-[10px] shrink-0">{item.fileExt.toUpperCase()}</Badge>

                      {/* Actions */}
                      {item.file_url && (
                        <a href={item.file_url} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
                          title="تحميل">
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                      {!item.saved && (
                        <button
                          onClick={() => removeItem(item.index)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                          title="حذف من القائمة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Post-save navigation */}
          {savedCount > 0 && !saving && selectedCount === 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
              <p className="text-sm font-semibold text-green-400 flex-1">
                تم حفظ {savedCount} عنصر بنجاح
              </p>
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
        </motion.div>
      )}
    </div>
  );
};

export default BookGeneration;
