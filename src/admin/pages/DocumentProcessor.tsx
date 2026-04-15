import { useState, useRef, useEffect } from "react";
import { Upload, FileText, Loader2, Copy, Download, Eye, Globe, Cpu, CheckCircle2, RotateCcw, Trash2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ProcessingResult {
  engine: string;
  text: string;
  structured_data?: any;
  confidence?: number;
  metadata?: any;
}

interface ProcessedDoc {
  id: string;
  fileName: string;
  result: ProcessingResult;
  enginesUsed: string[];
  timestamp: Date;
}

const DocumentProcessor = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processedDocs, setProcessedDocs] = useState<ProcessedDoc[]>([]);
  const [selectedEngines, setSelectedEngines] = useState<string[]>(["gemini"]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<ProcessedDoc | null>(null);
  const [savedDocs, setSavedDocs] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadSavedDocs(); }, []);

  const loadSavedDocs = async () => {
    const { data } = await supabase
      .from("processed_documents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setSavedDocs(data);
  };

  const saveToDb = async (doc: ProcessedDoc) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("processed_documents").insert({
      user_id: user?.id || null,
      file_name: doc.fileName,
      engines_used: doc.enginesUsed,
      extracted_text: doc.result.text,
      structured_data: doc.result.structured_data || {},
      confidence: doc.result.confidence || null,
      metadata: doc.result.metadata || {},
      custom_prompt: customPrompt || null,
    } as any);
    loadSavedDocs();
  };

  const toggleEngine = (engine: string) => {
    setSelectedEngines(prev =>
      prev.includes(engine) ? prev.filter(e => e !== engine) : [...prev, engine]
    );
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setProcessing(true);

    for (let i = 0; i < files.length; i++) {
      setCurrentIndex(i);
      const file = files[i];

      try {
        const tempPath = `temp-ocr/${crypto.randomUUID()}-${file.name}`;
        const { error: uploadErr } = await supabase.storage
          .from("book-files")
          .upload(tempPath, file, { contentType: file.type, upsert: true });

        if (uploadErr) throw uploadErr;

        const { data, error } = await supabase.functions.invoke("process-document", {
          body: {
            storage_path: tempPath,
            file_name: file.name,
            bucket: "book-files",
            engines: selectedEngines,
            prompt: customPrompt || undefined,
          },
        });

        if (error) throw error;

        if (data?.success) {
          const doc: ProcessedDoc = {
            id: crypto.randomUUID(),
            fileName: file.name,
            result: data.result,
            enginesUsed: data.engines_used || [],
            timestamp: new Date(),
          };
          setProcessedDocs(prev => [doc, ...prev]);
          if (i === 0) setSelectedDoc(doc);
          await saveToDb(doc);
        }
      } catch (err: any) {
        toast({ title: `فشل: ${file.name}`, description: err.message, variant: "destructive" });
      }
    }

    setProcessing(false);
    setFiles([]);
    toast({ title: "تمت المعالجة ✨" });
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ ✅" });
  };

  const downloadJson = (doc: ProcessedDoc) => {
    const blob = new Blob([JSON.stringify(doc.result.structured_data || doc.result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.fileName}-extracted.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">معالجة المستندات الذكية</h1>
        <p className="text-muted-foreground text-sm mt-1">استخراج النصوص والبيانات المنظمة باستخدام OCR متعدد المحركات</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Input */}
        <div className="space-y-4">
          {/* Engines */}
          <Card className="p-4 border-border bg-card/50">
            <p className="text-sm font-medium text-foreground mb-3">محركات المعالجة</p>
            <div className="space-y-2">
              <button
                onClick={() => toggleEngine("gemini")}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                  selectedEngines.includes("gemini") ? "bg-primary/10 text-primary border border-primary/25" : "bg-secondary text-muted-foreground border border-transparent"
                }`}
              >
                <Eye className="w-4 h-4" />
                Gemini Vision
                {selectedEngines.includes("gemini") && <CheckCircle2 className="w-3.5 h-3.5 mr-auto" />}
              </button>
              <button
                onClick={() => toggleEngine("firecrawl")}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                  selectedEngines.includes("firecrawl") ? "bg-accent/10 text-accent border border-accent/25" : "bg-secondary text-muted-foreground border border-transparent"
                }`}
              >
                <Globe className="w-4 h-4" />
                Firecrawl
                {selectedEngines.includes("firecrawl") && <CheckCircle2 className="w-3.5 h-3.5 mr-auto" />}
              </button>
            </div>
          </Card>

          {/* Upload */}
          <Card className="p-4 border-border bg-card/50">
            <div
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-foreground">{files.length > 0 ? `${files.length} ملفات محددة` : "اختر ملفات"}</p>
            </div>

            {files.length > 0 && (
              <div className="mt-3 space-y-1.5 max-h-32 overflow-auto">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="w-3.5 h-3.5" />
                    <span className="truncate flex-1">{f.name}</span>
                    <span>{(f.size / 1024).toFixed(0)}KB</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Prompt */}
          <Card className="p-4 border-border bg-card/50">
            <label className="text-sm font-medium text-foreground mb-2 block">تعليمات مخصصة</label>
            <Textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="مثال: استخرج فقط الجداول والأرقام..."
              className="text-sm bg-input border-border"
              rows={3}
            />
          </Card>

          <Button
            onClick={handleProcess}
            disabled={processing || files.length === 0 || selectedEngines.length === 0}
            className="w-full gap-2"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                معالجة {currentIndex + 1}/{files.length}...
              </>
            ) : (
              <>
                <Cpu className="w-4 h-4" />
                معالجة {files.length > 0 ? `(${files.length})` : ""}
              </>
            )}
          </Button>
        </div>

        {/* Center: Results */}
        <div className="lg:col-span-2">
          {selectedDoc ? (
            <Card className="p-5 border-border bg-card/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">{selectedDoc.fileName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{selectedDoc.enginesUsed.join(" + ")}</span>
                    {selectedDoc.result.confidence && (
                      <span className="text-xs text-muted-foreground">دقة: {Math.round(selectedDoc.result.confidence * 100)}%</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button variant="ghost" size="icon" onClick={() => copyText(selectedDoc.result.text)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => downloadJson(selectedDoc)}>
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-input rounded-lg p-4 max-h-[400px] overflow-auto text-sm text-foreground whitespace-pre-wrap leading-relaxed mb-4" dir="auto">
                {selectedDoc.result.text || "لم يتم استخراج نص"}
              </div>

              {selectedDoc.result.structured_data?.summary && (
                <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 mb-3">
                  <p className="text-xs font-medium text-primary mb-1">الملخص</p>
                  <p className="text-sm text-foreground">{selectedDoc.result.structured_data.summary}</p>
                </div>
              )}

              {selectedDoc.result.structured_data?.key_points?.length > 0 && (
                <div className="bg-accent/5 border border-accent/10 rounded-lg p-3 mb-3">
                  <p className="text-xs font-medium text-accent mb-1">النقاط الرئيسية</p>
                  <ul className="space-y-1">
                    {selectedDoc.result.structured_data.key_points.map((p: string, i: number) => (
                      <li key={i} className="text-sm text-foreground">• {p}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedDoc.result.structured_data?.entities?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedDoc.result.structured_data.entities.map((e: any, i: number) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                      {e.name} <span className="text-muted-foreground">({e.type})</span>
                    </span>
                  ))}
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-12 border-border bg-card/50 flex flex-col items-center justify-center text-center">
              <FileText className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">ارفع ملفات وابدأ المعالجة لعرض النتائج</p>
            </Card>
          )}

          {/* Processed Documents List */}
          {processedDocs.length > 1 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">المستندات المعالجة ({processedDocs.length})</p>
              {processedDocs.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm transition-all ${
                    selectedDoc?.id === doc.id ? "bg-primary/10 border border-primary/20" : "bg-card hover:bg-secondary border border-border"
                  }`}
                >
                  <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate text-foreground">{doc.fileName}</span>
                  <span className="text-xs text-muted-foreground mr-auto">{doc.enginesUsed.join("+")}</span>
                </button>
              ))}
            </div>
          )}

          {/* Saved History */}
          <div className="mt-4">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              <History className="w-4 h-4" />
              السجل المحفوظ ({savedDocs.length})
            </button>
            {showHistory && savedDocs.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-auto">
                {savedDocs.map((doc: any) => (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDoc({
                      id: doc.id,
                      fileName: doc.file_name,
                      result: {
                        engine: (doc.engines_used || []).join(" + "),
                        text: doc.extracted_text || "",
                        structured_data: doc.structured_data,
                        confidence: doc.confidence,
                        metadata: doc.metadata,
                      },
                      enginesUsed: doc.engines_used || [],
                      timestamp: new Date(doc.created_at),
                    })}
                    className="w-full flex items-center gap-3 p-3 rounded-lg text-sm bg-card hover:bg-secondary border border-border transition-all"
                  >
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate text-foreground">{doc.file_name}</span>
                    <span className="text-xs text-muted-foreground mr-auto">
                      {new Date(doc.created_at).toLocaleDateString("ar")}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentProcessor;
