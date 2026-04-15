import { useState, useRef, useEffect } from "react";
import { Upload, FileText, Loader2, Copy, Download, Sparkles, Eye, Globe, Cpu, CheckCircle2, History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface ProcessingResult {
  engine: string;
  text: string;
  structured_data?: any;
  confidence?: number;
  metadata?: any;
}

interface SavedDoc {
  id: string;
  file_name: string;
  engines_used: string[];
  extracted_text: string;
  structured_data: any;
  confidence: number;
  created_at: string;
}

const DocumentProcessing = () => {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [enginesUsed, setEnginesUsed] = useState<string[]>([]);
  const [selectedEngines, setSelectedEngines] = useState<string[]>(["gemini"]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [activeTab, setActiveTab] = useState<"upload" | "url">("upload");
  const [history, setHistory] = useState<SavedDoc[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    const { data } = await supabase
      .from("processed_documents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setHistory(data as SavedDoc[]);
  };

  const saveResult = async (fileName: string, res: ProcessingResult, engines: string[], fileSizeKb?: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("processed_documents").insert({
      user_id: user?.id || null,
      file_name: fileName,
      file_type: file?.type || "url",
      file_size_kb: fileSizeKb || null,
      engines_used: engines,
      extracted_text: res.text,
      structured_data: res.structured_data || {},
      confidence: res.confidence || null,
      metadata: res.metadata || {},
      custom_prompt: customPrompt || null,
    } as any);
    loadHistory();
  };

  const toggleEngine = (engine: string) => {
    setSelectedEngines(prev =>
      prev.includes(engine) ? prev.filter(e => e !== engine) : [...prev, engine]
    );
  };

  const handleProcess = async () => {
    if (!file && !url) {
      toast({ title: "خطأ", description: "يرجى رفع ملف أو إدخال رابط", variant: "destructive" });
      return;
    }
    if (selectedEngines.length === 0) {
      toast({ title: "خطأ", description: "يرجى اختيار محرك واحد على الأقل", variant: "destructive" });
      return;
    }

    setProcessing(true);
    setResult(null);

    try {
      let response;

      if (activeTab === "url" && url) {
        response = await supabase.functions.invoke("process-document", {
          body: { url, engines: selectedEngines, prompt: customPrompt || undefined },
        });
      } else if (file) {
        // Upload file first, then process
        const tempPath = `temp-ocr/${crypto.randomUUID()}-${file.name}`;
        const { error: uploadErr } = await supabase.storage
          .from("book-files")
          .upload(tempPath, file, { contentType: file.type, upsert: true });

        if (uploadErr) throw new Error("فشل رفع الملف");

        response = await supabase.functions.invoke("process-document", {
          body: {
            storage_path: tempPath,
            file_name: file.name,
            bucket: "book-files",
            engines: selectedEngines,
            prompt: customPrompt || undefined,
          },
        });
      }

      if (response?.error) throw new Error(response.error.message);

      const data = response?.data;
      if (data?.success) {
        setResult(data.result);
        setEnginesUsed(data.engines_used || []);
        const fileName = file?.name || url || "document";
        const fileSizeKb = file ? Math.round(file.size / 1024) : undefined;
        await saveResult(fileName, data.result, data.engines_used || [], fileSizeKb);
        toast({ title: "تمت المعالجة بنجاح ✨", description: `تم استخدام: ${(data.engines_used || []).join(" + ")}` });
      } else {
        throw new Error(data?.error || "فشلت المعالجة");
      }
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const copyText = () => {
    if (result?.text) {
      navigator.clipboard.writeText(result.text);
      toast({ title: "تم النسخ ✅" });
    }
  };

  const downloadJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result.structured_data || result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extracted-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">معالجة ذكية بالذكاء الاصطناعي</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 font-heading">
            منصة معالجة المستندات الذكية
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            حوّل ملفات PDF والصور والمستندات إلى معلومات منظمة باستخدام تقنية التعرف الضوئي متعددة المحركات
          </p>
        </div>

        {/* Engine Selection */}
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          <button
            onClick={() => toggleEngine("gemini")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              selectedEngines.includes("gemini")
                ? "bg-primary/15 text-primary border border-primary/30"
                : "bg-card text-muted-foreground border border-border hover:border-primary/20"
            }`}
          >
            <Eye className="w-4 h-4" />
            Gemini Vision
            {selectedEngines.includes("gemini") && <CheckCircle2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => toggleEngine("firecrawl")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              selectedEngines.includes("firecrawl")
                ? "bg-accent/15 text-accent border border-accent/30"
                : "bg-card text-muted-foreground border border-border hover:border-accent/20"
            }`}
          >
            <Globe className="w-4 h-4" />
            Firecrawl
            {selectedEngines.includes("firecrawl") && <CheckCircle2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Input Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "upload" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <Upload className="w-4 h-4 inline ml-2" />
            رفع ملف
          </button>
          <button
            onClick={() => setActiveTab("url")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "url" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <Globe className="w-4 h-4 inline ml-2" />
            رابط مستند
          </button>
        </div>

        {/* Upload / URL Input */}
        <Card className="p-6 mb-6 border-border bg-card/50">
          {activeTab === "upload" ? (
            <div
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) setFile(f);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-8 h-8 text-primary" />
                  <div className="text-right">
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-foreground font-medium mb-1">اسحب الملف هنا أو اضغط للاختيار</p>
                  <p className="text-sm text-muted-foreground">PDF, صور, Word, Excel, CSV, TXT</p>
                </>
              )}
            </div>
          ) : (
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/document.pdf"
              className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              dir="ltr"
            />
          )}

          {/* Custom Prompt */}
          <div className="mt-4">
            <label className="text-sm text-muted-foreground mb-1 block">تعليمات مخصصة (اختياري)</label>
            <Textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="مثال: استخرج فقط الأرقام والتواريخ من المستند..."
              className="bg-input border-border text-sm"
              rows={2}
            />
          </div>

          <Button
            onClick={handleProcess}
            disabled={processing || (!file && !url) || selectedEngines.length === 0}
            className="w-full mt-4 h-12 text-base gap-2"
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                جاري المعالجة...
              </>
            ) : (
              <>
                <Cpu className="w-5 h-5" />
                معالجة المستند
              </>
            )}
          </Button>
        </Card>

        {/* Results */}
        {result && (
          <Card className="p-6 border-border bg-card/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-foreground">النتائج</h3>
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {enginesUsed.join(" + ")}
                </span>
                {result.confidence && (
                  <span className="text-xs text-muted-foreground">
                    دقة: {Math.round(result.confidence * 100)}%
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyText} className="gap-1.5">
                  <Copy className="w-3.5 h-3.5" />
                  نسخ
                </Button>
                <Button variant="outline" size="sm" onClick={downloadJson} className="gap-1.5">
                  <Download className="w-3.5 h-3.5" />
                  JSON
                </Button>
              </div>
            </div>

            {/* Extracted Text */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">النص المستخرج</h4>
              <div className="bg-input rounded-xl p-4 max-h-80 overflow-auto text-sm text-foreground whitespace-pre-wrap leading-relaxed" dir="auto">
                {result.text || "لم يتم استخراج نص"}
              </div>
            </div>

            {/* Structured Data */}
            {result.structured_data && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">البيانات المنظمة</h4>

                {/* Summary */}
                {result.structured_data.summary && (
                  <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 mb-3">
                    <p className="text-sm font-medium text-primary mb-1">الملخص</p>
                    <p className="text-sm text-foreground">{result.structured_data.summary}</p>
                  </div>
                )}

                {/* Key Points */}
                {result.structured_data.key_points?.length > 0 && (
                  <div className="bg-accent/5 border border-accent/10 rounded-xl p-4 mb-3">
                    <p className="text-sm font-medium text-accent mb-2">النقاط الرئيسية</p>
                    <ul className="space-y-1">
                      {result.structured_data.key_points.map((p: string, i: number) => (
                        <li key={i} className="text-sm text-foreground flex items-start gap-2">
                          <span className="text-accent mt-0.5">•</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tables */}
                {result.structured_data.tables?.length > 0 && (
                  <div className="space-y-3 mb-3">
                    {result.structured_data.tables.map((table: any, idx: number) => (
                      <div key={idx} className="overflow-x-auto rounded-xl border border-border">
                        <table className="w-full text-sm">
                          {table.headers?.length > 0 && (
                            <thead>
                              <tr className="bg-muted/50">
                                {table.headers.map((h: string, i: number) => (
                                  <th key={i} className="px-3 py-2 text-right font-medium text-foreground border-b border-border">{h}</th>
                                ))}
                              </tr>
                            </thead>
                          )}
                          <tbody>
                            {table.rows?.map((row: string[], ri: number) => (
                              <tr key={ri} className="border-b border-border/50 last:border-0">
                                {row.map((cell: string, ci: number) => (
                                  <td key={ci} className="px-3 py-2 text-muted-foreground">{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}

                {/* Entities */}
                {result.structured_data.entities?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {result.structured_data.entities.map((e: any, i: number) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground border border-border">
                        {e.name} <span className="text-muted-foreground">({e.type})</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {/* History Section */}
        <div className="mt-8">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <History className="w-4 h-4" />
            سجل المعالجات ({history.length})
          </button>

          {showHistory && history.length > 0 && (
            <div className="space-y-2">
              {history.map((doc) => (
                <Card
                  key={doc.id}
                  className="p-4 border-border bg-card/50 cursor-pointer hover:bg-card transition-colors"
                  onClick={() => {
                    setResult({
                      engine: (doc.engines_used || []).join(" + "),
                      text: doc.extracted_text || "",
                      structured_data: doc.structured_data,
                      confidence: doc.confidence,
                    });
                    setEnginesUsed(doc.engines_used || []);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground truncate max-w-xs">{doc.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString("ar")} · {(doc.engines_used || []).join(" + ")}
                        </p>
                      </div>
                    </div>
                    {doc.confidence && (
                      <span className="text-xs text-muted-foreground">{Math.round(doc.confidence * 100)}%</span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {showHistory && history.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">لا توجد معالجات سابقة</p>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default DocumentProcessing;
