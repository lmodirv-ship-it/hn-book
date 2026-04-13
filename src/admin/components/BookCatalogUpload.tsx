import { useState, useRef } from "react";
import { Upload, FileText, Loader2, CheckCircle2, XCircle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProcessResult {
  name: string;
  status: string;
  id?: string;
  error?: string;
}

interface CatalogUploadProps {
  onComplete: () => void;
}

export const BookCatalogUpload = ({ onComplete }: CatalogUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<ProcessResult[] | null>(null);
  const [summary, setSummary] = useState<{ total: number; success: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("يرجى اختيار ملف PDF فقط");
      return;
    }

    // No size limit - files of any size are supported

    setUploading(true);
    setResults(null);
    setSummary(null);

    try {
      const formData = new FormData();
      formData.append("catalog", file);

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/process-book-catalog`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "فشل في معالجة الملف");
      }

      setSummary({ total: data.total, success: data.success, failed: data.failed });
      setResults(data.results);
      toast.success(`تم معالجة ${data.success} كتاب من أصل ${data.total}`);
      onComplete();
    } catch (err: any) {
      console.error(err);
      toast.error("فشل في معالجة الكتالوج: " + (err.message || "خطأ غير معروف"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">استيراد كتب من كتالوج PDF</h3>
          <p className="text-[11px] text-muted-foreground">ارفع ملف PDF يحتوي على قائمة كتب وروابط تحميلها</p>
        </div>
      </div>

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full py-8 rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-secondary/10 flex flex-col items-center justify-center gap-3 transition-all hover:bg-secondary/20"
      >
        {uploading ? (
          <>
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">جاري معالجة الكتالوج...</p>
              <p className="text-[11px] text-muted-foreground mt-1">يتم استخراج الكتب وتحميلها وترقيمها</p>
            </div>
            <Progress value={undefined} className="w-48 h-1.5" />
          </>
        ) : (
          <>
            <Upload className="w-8 h-8 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm text-muted-foreground">اضغط لرفع ملف كتالوج PDF</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">يدعم ملفات حتى 20MB · يتم استخراج الكتب تلقائياً</p>
            </div>
          </>
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleUpload}
        className="hidden"
      />

      {summary && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">المجموع: <strong className="text-foreground">{summary.total}</strong></span>
            <span className="text-green-400">نجح: <strong>{summary.success}</strong></span>
            {summary.failed > 0 && (
              <span className="text-red-400">فشل: <strong>{summary.failed}</strong></span>
            )}
          </div>

          {results && results.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {results.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 text-xs p-2 rounded-lg ${
                    r.status === "success" ? "bg-green-400/5" : "bg-red-400/5"
                  }`}
                >
                  {r.status === "success" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                  )}
                  <span className="truncate text-foreground">{r.name}</span>
                  {r.error && <span className="text-red-400 truncate mr-auto">({r.error})</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
