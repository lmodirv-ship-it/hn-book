import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, Download, FileImage, FileText, RotateCw, ArrowRight, Palette, Upload, X, Image as ImageIcon } from "lucide-react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { svgTemplateService, type SvgTemplate, type SvgField } from "@/services/svgTemplateService";
import SvgRenderer from "@/components/editor/SvgRenderer";

const TemplateEditor = () => {
  const { id } = useParams<{ id: string }>();
  const [template, setTemplate] = useState<SvgTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({});
  const [side, setSide] = useState<"front" | "back">("front");
  const [flipping, setFlipping] = useState(false);
  const [exporting, setExporting] = useState(false);

  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const t = await svgTemplateService.get(id);
        if (!t) {
          toast({ title: "القالب غير موجود", variant: "destructive" });
          return;
        }
        setTemplate(t);
        const init: Record<string, string> = {};
        for (const f of t.fields) init[f.key] = f.defaultValue || "";
        setValues(init);
      } catch (e: any) {
        toast({ title: "فشل التحميل", description: e.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const fieldsBySide = useMemo(() => {
    const front: SvgField[] = [];
    const back: SvgField[] = [];
    template?.fields.forEach((f) => (f.side === "back" ? back.push(f) : front.push(f)));
    return { front, back };
  }, [template]);

  // When a logo image is uploaded, hide the monogram fallback so they don't overlap.
  const renderValues = useMemo(
    () => (values.logo ? { ...values, monogram: "" } : values),
    [values]
  );

  const flip = () => {
    if (!template?.back_svg_content) return;
    setFlipping(true);
    setTimeout(() => {
      setSide((s) => (s === "front" ? "back" : "front"));
      setFlipping(false);
    }, 300);
  };

  const exportPng = async () => {
    setExporting(true);
    try {
      const sides: Array<{ ref: HTMLDivElement | null; label: string }> = [
        { ref: frontRef.current, label: "front" },
      ];
      if (template?.back_svg_content) sides.push({ ref: backRef.current, label: "back" });

      for (const s of sides) {
        if (!s.ref) continue;
        const dataUrl = await toPng(s.ref, { pixelRatio: 3, cacheBust: true });
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `${template?.name ?? "card"}-${s.label}.png`;
        a.click();
      }
      toast({ title: "تم تصدير PNG ✅" });
    } catch (e: any) {
      toast({ title: "فشل التصدير", description: e.message, variant: "destructive" });
    }
    setExporting(false);
  };

  const exportPdf = async () => {
    setExporting(true);
    try {
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [90, 50] });
      const front = frontRef.current ? await toPng(frontRef.current, { pixelRatio: 3, cacheBust: true }) : null;
      if (front) pdf.addImage(front, "PNG", 0, 0, 90, 50);
      if (template?.back_svg_content && backRef.current) {
        const back = await toPng(backRef.current, { pixelRatio: 3, cacheBust: true });
        pdf.addPage([90, 50], "landscape");
        pdf.addImage(back, "PNG", 0, 0, 90, 50);
      }
      pdf.save(`${template?.name ?? "card"}.pdf`);
      toast({ title: "تم تصدير PDF ✅" });
    } catch (e: any) {
      toast({ title: "فشل التصدير", description: e.message, variant: "destructive" });
    }
    setExporting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }
  if (!template) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground" dir="rtl">
        القالب غير موجود
      </div>
    );
  }

  const currentFields = side === "front" ? fieldsBySide.front : fieldsBySide.back;
  const hasBack = !!template?.back_svg_content;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b border-border bg-card/40 backdrop-blur sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/admin/svg-templates">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowRight className="w-4 h-4" /> عودة
            </Button>
          </Link>
          <h1 className="font-bold text-lg flex-1 truncate">{template.name}</h1>
          <Button variant="outline" size="sm" onClick={exportPng} disabled={exporting} className="gap-1.5">
            <FileImage className="w-4 h-4" /> PNG
          </Button>
          <Button size="sm" onClick={exportPdf} disabled={exporting} className="gap-1.5">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} PDF
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-4">
          {hasBack && (
            <Tabs value={side} onValueChange={(v) => setSide(v as "front" | "back")}>
              <TabsList className="w-full">
                <TabsTrigger value="front" className="flex-1">الوجه الأمامي ({fieldsBySide.front.length})</TabsTrigger>
                <TabsTrigger value="back" className="flex-1">الوجه الخلفي ({fieldsBySide.back.length})</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          <div className="space-y-3">
            {currentFields.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد حقول قابلة للتعديل في هذا الوجه</p>
            ) : (
              currentFields.map((f) => {
                const val = values[f.key] ?? "";
                if (f.type === "image") {
                  const onPick = (file?: File | null) => {
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) {
                      toast({ title: "الصورة كبيرة", description: "الحد الأقصى 2 ميجابايت", variant: "destructive" });
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => setValues((v) => ({ ...v, [f.key]: String(reader.result || "") }));
                    reader.readAsDataURL(file);
                  };
                  return (
                    <div key={`${f.side}-${f.key}`}>
                      <Label className="text-sm flex items-center gap-1.5 mb-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        {f.label}
                      </Label>
                      <div className="flex items-center gap-3 rounded-lg border border-border bg-card/40 p-3">
                        <div className="w-16 h-16 rounded-md bg-muted/50 border border-border flex items-center justify-center overflow-hidden shrink-0">
                          {val ? (
                            <img src={val} alt="logo preview" className="max-w-full max-h-full object-contain" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 flex flex-col gap-1.5">
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/svg+xml,image/webp"
                              className="hidden"
                              onChange={(e) => onPick(e.target.files?.[0])}
                            />
                            <Button type="button" size="sm" variant="outline" asChild className="gap-1.5 w-full">
                              <span><Upload className="w-3.5 h-3.5" /> {val ? "تغيير الشعار" : "ارفع الشعار"}</span>
                            </Button>
                          </label>
                          {val && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="gap-1.5 h-7 text-destructive"
                              onClick={() => setValues((v) => ({ ...v, [f.key]: "" }))}
                            >
                              <X className="w-3 h-3" /> إزالة الشعار
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">PNG / SVG شفاف يعطي أفضل نتيجة • حتى 2MB</p>
                    </div>
                  );
                }
                return (
                  <div key={`${f.side}-${f.key}`}>
                    <Label className="text-sm flex items-center gap-1.5">
                      {f.type === "color" && <Palette className="w-3.5 h-3.5 text-muted-foreground" />}
                      {f.label}
                      <span className="text-[10px] text-muted-foreground">{`{{${f.key}}}`}</span>
                    </Label>
                    <Input
                      type={f.type === "color" ? "color" : "text"}
                      value={val}
                      onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                      placeholder={f.label}
                      className="mt-1"
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">معاينة مباشرة</h3>
            {hasBack && (
              <Button variant="outline" size="sm" onClick={flip} className="gap-1.5">
                <RotateCw className="w-3.5 h-3.5" /> اقلب البطاقة
              </Button>
            )}
          </div>

          <div className="perspective-1000">
            <div
              className={`relative transition-transform duration-500 transform-style-3d ${
                flipping ? "rotate-y-180" : ""
              }`}
            >
              <div className={side === "front" ? "block" : "hidden"}>
                <SvgRenderer
                  ref={frontRef}
                  svg={template.front_svg_content ?? ""}
                  values={values}
                  className="w-full rounded-xl border border-border bg-white overflow-hidden [&>svg]:w-full [&>svg]:h-auto"
                />
              </div>
              {hasBack && (
                <div className={side === "back" ? "block" : "hidden"}>
                  <SvgRenderer
                    ref={backRef}
                    svg={template.back_svg_content ?? ""}
                    values={values}
                    className="w-full rounded-xl border border-border bg-white overflow-hidden [&>svg]:w-full [&>svg]:h-auto"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Hidden render of opposite side for export */}
          {hasBack && (
            <div className="absolute -left-[9999px] top-0 pointer-events-none">
              <SvgRenderer
                ref={side === "front" ? backRef : frontRef}
                svg={(side === "front" ? template.back_svg_content : template.front_svg_content) ?? ""}
                values={values}
                className="w-[900px] [&>svg]:w-full [&>svg]:h-auto"
              />
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
            <FileText className="w-3 h-3" /> النصوص تتبدّل مباشرة على القالب
          </p>
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor;
