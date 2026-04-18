import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import {
  Loader2, Download, FileImage, RotateCw, ArrowRight, Palette, Upload, X,
  Image as ImageIcon, Printer, Type, Bold, Italic, AlignLeft, AlignCenter,
  AlignRight, Undo2, Redo2, ZoomIn, ZoomOut, Grid3x3, Minus, Plus, Layers, Lock,
} from "lucide-react";
import { toPng } from "html-to-image";
import { usePermissions } from "@/hooks/usePermissions";
import { useBilling } from "@/hooks/useBilling";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Sparkles, Coins } from "lucide-react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  svgTemplateService, type SvgTemplate, type SvgField,
} from "@/services/svgTemplateService";
import StyledSvgRenderer, { type FieldStyle } from "@/components/editor/StyledSvgRenderer";
import PrintReadyDialog from "@/components/editor/PrintReadyDialog";
import { buildPrintReadyPdf } from "@/lib/print-pdf";
import { communicationsService, applyTemplate } from "@/services/communicationsService";

const FONT_FAMILIES = [
  { value: "Inter, sans-serif", label: "Inter" },
  { value: "'Space Grotesk', sans-serif", label: "Space Grotesk" },
  { value: "'DM Sans', sans-serif", label: "DM Sans" },
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "'Times New Roman', serif", label: "Times" },
  { value: "'Courier New', monospace", label: "Courier" },
  { value: "'Cairo', sans-serif", label: "Cairo (عربي)" },
  { value: "'Tajawal', sans-serif", label: "Tajawal (عربي)" },
];

interface HistoryEntry {
  values: Record<string, string>;
  styles: Record<string, FieldStyle>;
}

const TemplateEditor = () => {
  const { slug } = useParams<{ slug: string }>();
  const idOrSlug = slug;
  const [searchParams] = useSearchParams();
  const fromStudio = searchParams.get("from") === "studio";
  const backHref = fromStudio ? "/studio/templates" : "/admin/svg-templates";
  const { has: hasPermission, loading: permsLoading } = usePermissions();
  const canExportPng = !permsLoading && hasPermission("export_png");
  const canExportPdf = !permsLoading && hasPermission("export_pdf");
  const billing = useBilling();
  const navigate = useNavigate();
  const [paywallOpen, setPaywallOpen] = useState<null | "pdf" | "png">(null);
  const [template, setTemplate] = useState<SvgTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [styles, setStyles] = useState<Record<string, FieldStyle>>({});
  const [side, setSide] = useState<"front" | "back">("front");
  const [flipping, setFlipping] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [activeTab, setActiveTab] = useState<"fields" | "logo">("fields");

  // Undo/redo
  const historyRef = useRef<HistoryEntry[]>([]);
  const futureRef = useRef<HistoryEntry[]>([]);
  const skipNextSnapshot = useRef(false);

  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  // Load template — accepts slug, template id, or asset id (with redirect to slug URL)
  useEffect(() => {
    if (!idOrSlug) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    (async () => {
      try {
        const t = await svgTemplateService.resolve(idOrSlug);
        if (cancelled) return;
        if (!t) {
          setNotFound(true);
          return;
        }

        // Backward compat: if accessed via UUID and template has a slug, redirect to slug URL
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
        if (isUuid && t.slug && t.slug !== idOrSlug) {
          const base = fromStudio ? "/studio/editor" : "/editor";
          const qs = fromStudio ? "?from=studio" : "";
          navigate(`${base}/${t.slug}${qs}`, { replace: true });
          return;
        }

        setTemplate(t);
        const init: Record<string, string> = {};
        for (const f of t.fields) init[f.key] = f.defaultValue || "";

        // Restore overrides from localStorage (keyed by template id, stable across asset/template entry)
        const saved = localStorage.getItem(`tpl-edit-${t.id}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.values) Object.assign(init, parsed.values);
            if (parsed.styles) setStyles(parsed.styles);
          } catch {}
        }
        setValues(init);
        skipNextSnapshot.current = true;
      } catch (e: any) {
        if (!cancelled) {
          toast({ title: "فشل التحميل", description: e.message, variant: "destructive" });
          setNotFound(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [idOrSlug, fromStudio, navigate]);

  // Dynamic SEO title
  useEffect(() => {
    if (!template) return;
    const prev = document.title;
    document.title = `${template.name} — محرر القوالب`;
    return () => { document.title = prev; };
  }, [template]);

  // Persist + history
  useEffect(() => {
    if (!template) return;
    localStorage.setItem(
      `tpl-edit-${template.id}`,
      JSON.stringify({ values, styles })
    );
    if (skipNextSnapshot.current) {
      skipNextSnapshot.current = false;
      return;
    }
    historyRef.current.push({ values, styles });
    if (historyRef.current.length > 50) historyRef.current.shift();
    futureRef.current = [];
  }, [values, styles, template]);

  const fieldsBySide = useMemo(() => {
    const front: SvgField[] = [];
    const back: SvgField[] = [];
    template?.fields.forEach((f) => (f.side === "back" ? back.push(f) : front.push(f)));
    return { front, back };
  }, [template]);

  const renderValues = useMemo(
    () => (values.logo ? { ...values, monogram: "" } : values),
    [values]
  );

  const flip = () => {
    if (!template?.back_svg_content) return;
    setFlipping(true);
    setTimeout(() => {
      setSide((s) => (s === "front" ? "back" : "front"));
      setSelectedKey(null);
      setFlipping(false);
    }, 300);
  };

  // Undo / redo
  const undo = useCallback(() => {
    if (historyRef.current.length < 2) return;
    const current = historyRef.current.pop()!;
    futureRef.current.push(current);
    const prev = historyRef.current[historyRef.current.length - 1];
    skipNextSnapshot.current = true;
    setValues(prev.values);
    setStyles(prev.styles);
  }, []);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    historyRef.current.push(next);
    skipNextSnapshot.current = true;
    setValues(next.values);
    setStyles(next.styles);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.key === "z" && e.shiftKey) || e.key === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const updateStyle = (patch: Partial<FieldStyle>) => {
    if (!selectedKey) return;
    setStyles((s) => ({ ...s, [selectedKey]: { ...(s[selectedKey] || {}), ...patch } }));
  };

  const onDragEnd = useCallback((key: string, dx: number, dy: number) => {
    setStyles((s) => ({ ...s, [key]: { ...(s[key] || {}), dx, dy } }));
  }, []);

  const onInlineEdit = useCallback((key: string, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
  }, []);

  // Exports
  const exportPng = async () => {
    if (!canExportPng) {
      toast({ title: "🔒 غير مسموح لك بتحميل الملفات", description: "تحتاج إذن export_png من المدير.", variant: "destructive" });
      return;
    }
    if (!billing.canExport("png")) {
      setPaywallOpen("png");
      return;
    }
    setExporting(true);
    try {
      // Server-validated deduction first — only generate if allowed
      const r = await billing.consume("png", id ?? null);
      if (!r.allowed) {
        setExporting(false);
        if (r.reason === "insufficient_credits") setPaywallOpen("png");
        else toast({ title: "تعذر التصدير", description: r.reason, variant: "destructive" });
        return;
      }
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
      toast({ title: "تم تصدير PNG ✅", description: billing.plan?.is_unlimited ? "خطة Pro" : `تم خصم 1 نقطة • الرصيد: ${billing.credits?.balance ?? 0}` });
    } catch (e: any) {
      toast({ title: "فشل التصدير", description: e.message, variant: "destructive" });
    }
    setExporting(false);
  };

  const exportPdf = async () => {
    if (!canExportPdf) {
      toast({ title: "🔒 غير مسموح لك بتحميل الملفات", description: "تحتاج إذن export_pdf من المدير.", variant: "destructive" });
      return;
    }
    if (!billing.canExport("pdf")) {
      setPaywallOpen("pdf");
      return;
    }
    setExporting(true);
    try {
      const r = await billing.consume("pdf", id ?? null);
      if (!r.allowed) {
        setExporting(false);
        if (r.reason === "insufficient_credits") setPaywallOpen("pdf");
        else toast({ title: "تعذر التصدير", description: r.reason, variant: "destructive" });
        return;
      }
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [90, 50] });
      const front = frontRef.current
        ? await toPng(frontRef.current, { pixelRatio: 3, cacheBust: true })
        : null;
      if (front) pdf.addImage(front, "PNG", 0, 0, 90, 50);
      if (template?.back_svg_content && backRef.current) {
        const back = await toPng(backRef.current, { pixelRatio: 3, cacheBust: true });
        pdf.addPage([90, 50], "landscape");
        pdf.addImage(back, "PNG", 0, 0, 90, 50);
      }
      pdf.save(`${template?.name ?? "card"}.pdf`);
      toast({ title: "تم تصدير PDF ✅", description: billing.plan?.is_unlimited ? "خطة Pro" : `تم خصم 2 نقطة • الرصيد: ${billing.credits?.balance ?? 0}` });
    } catch (e: any) {
      toast({ title: "فشل التصدير", description: e.message, variant: "destructive" });
    }
    setExporting(false);
  };

  /** Generates print-ready PDF, uploads it, emails the print shop, and opens WhatsApp — all in one click. */
  const sendToPrintShop = async () => {
    if (!frontRef.current) {
      toast({ title: "البطاقة غير جاهزة بعد", variant: "destructive" });
      return;
    }
    setExporting(true);
    try {
      const [wa, email] = await Promise.all([
        communicationsService.getWhatsApp(),
        communicationsService.getEmail(),
      ]);
      if ((!wa.enabled || !wa.phone_number) && (!email.enabled || !email.email_address)) {
        toast({
          title: "لم يتم تكوين قنوات الإرسال",
          description: "اطلب من المسؤول ضبط واتساب أو البريد في إعدادات الاتصالات.",
          variant: "destructive",
        });
        return;
      }

      // 1) Build the print-ready PDF
      const r = await buildPrintReadyPdf({
        frontNode: frontRef.current,
        backNode: hasBack ? backRef.current : null,
        pageSize: "A4",
        cutMarks: true,
        registrationMarks: true,
        mirrorBack: true,
        fileName: `${template?.name ?? "carte"}-A4.pdf`,
      });

      // 2) Upload to public storage so it can be shared by link
      const { supabase } = await import("@/integrations/supabase/client");
      const path = `print-orders/${Date.now()}-${r.fileName}`;
      const { error: upErr } = await supabase.storage
        .from("print-pdfs")
        .upload(path, r.blob, { contentType: "application/pdf", upsert: true });
      if (upErr) console.warn("[upload pdf]", upErr);
      const { data: pub } = supabase.storage.from("print-pdfs").getPublicUrl(path);
      const publicUrl = pub?.publicUrl || r.url;

      // 3) Auto-download a local copy too
      const a = document.createElement("a");
      a.href = r.url;
      a.download = r.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      const orderNumber = `${template?.name ?? "بطاقة"}-${Date.now().toString().slice(-6)}`;
      const vars = { orderNumber, totalAmount: "", pdfUrl: publicUrl };

      // 4) Email the print shop in the background
      const tasks: Promise<any>[] = [];
      if (email.enabled && email.email_address) {
        tasks.push(
          supabase.functions.invoke("send-print-order", {
            body: {
              to: email.email_address,
              subject: applyTemplate(email.subject_template, vars),
              body: applyTemplate(email.body_template, vars),
              pdfUrl: publicUrl,
              fileName: r.fileName,
            },
          }).catch((err) => console.warn("[email]", err))
        );
      }
      await Promise.all(tasks);

      // 5) Open WhatsApp with the link prefilled
      if (wa.enabled && wa.phone_number) {
        const message = applyTemplate(wa.default_message, vars);
        const cleanPhone = wa.phone_number.replace(/\D/g, "");
        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        window.open(url, "_blank", "noopener,noreferrer");
      }

      toast({
        title: "تم إرسال الطلب ✅",
        description: `${email.enabled ? "📧 إيميل" : ""}${email.enabled && wa.enabled ? " + " : ""}${wa.enabled ? "💬 واتساب" : ""} — رقم الطلب: ${orderNumber}`,
      });
    } catch (e: any) {
      console.error("[sendToPrintShop]", e);
      toast({ title: "فشل إرسال الطلب", description: e?.message ?? "خطأ غير معروف", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background" dir="rtl">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">جارٍ تحميل القالب...</p>
      </div>
    );
  }
  if (notFound || !template) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4 text-center" dir="rtl">
        <div className="w-14 h-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center text-2xl">!</div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">القالب غير متاح</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            هذا التصميم لا يحتوي على ملف SVG قابل للتعديل بعد. اختر قالباً آخر من المعرض.
          </p>
        </div>
        <Button asChild className="gap-1.5">
          <Link to={backHref}>
            <ArrowRight className="w-4 h-4" /> العودة إلى القوالب
          </Link>
        </Button>
      </div>
    );
  }

  const currentFields = side === "front" ? fieldsBySide.front : fieldsBySide.back;
  const hasBack = !!template?.back_svg_content;
  const selectedField = currentFields.find((f) => f.key === selectedKey);
  const selectedStyle = selectedKey ? styles[selectedKey] || {} : {};
  const logoFields = template.fields.filter((f) => f.type === "image");

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden" dir="rtl">
      {/* TOP BAR */}
      <header className="border-b border-border bg-card/40 backdrop-blur shrink-0">
        <div className="px-4 py-2 flex items-center gap-3">
          <Link to={backHref}>
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowRight className="w-4 h-4" /> عودة
            </Button>
          </Link>
          <h1 className="font-bold text-sm flex-1 truncate">{template.name}</h1>
          {billing.authed && (
            <div className="hidden md:flex items-center gap-1.5">
              <Badge variant={billing.plan?.is_unlimited ? "default" : "secondary"} className="gap-1 text-[10px]">
                <Sparkles className="w-3 h-3" /> {billing.plan?.name ?? "Free"}
              </Badge>
              {!billing.plan?.is_unlimited && (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Coins className="w-3 h-3" /> {billing.credits?.balance ?? 0}
                </Badge>
              )}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={exportPng}
            disabled={exporting || !canExportPng}
            title={canExportPng ? "تحميل PNG" : "غير مسموح لك بتحميل الملفات"}
            className="gap-1.5"
          >
            {canExportPng ? <FileImage className="w-4 h-4" /> : <Lock className="w-4 h-4" />} PNG
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportPdf}
            disabled={exporting || !canExportPdf}
            title={canExportPdf ? "تحميل PDF" : "غير مسموح لك بتحميل الملفات"}
            className="gap-1.5"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : canExportPdf ? <Download className="w-4 h-4" /> : <Lock className="w-4 h-4" />} PDF
          </Button>
          <Button size="sm" onClick={sendToPrintShop} disabled={exporting} className="gap-1.5">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} طباعة
          </Button>
        </div>

        {/* TOOLBAR */}
        <div className="px-4 py-2 border-t border-border/60 flex items-center gap-2 flex-wrap text-sm">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={undo} title="تراجع (Ctrl+Z)">
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={redo} title="إعادة (Ctrl+Y)">
            <Redo2 className="w-4 h-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />

          <Select
            value={selectedStyle.fontFamily || ""}
            onValueChange={(v) => updateStyle({ fontFamily: v })}
            disabled={!selectedKey || selectedField?.type !== "text"}
          >
            <SelectTrigger className="w-[150px] h-8">
              <SelectValue placeholder="الخط" />
            </SelectTrigger>
            <SelectContent>
              {FONT_FAMILIES.map((f) => (
                <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 border border-border rounded-md h-8 px-1">
            <Button
              variant="ghost" size="icon" className="h-6 w-6"
              disabled={!selectedKey}
              onClick={() => updateStyle({ fontSize: Math.max(6, (selectedStyle.fontSize || 16) - 1) })}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <Input
              type="number"
              value={selectedStyle.fontSize || ""}
              placeholder="16"
              disabled={!selectedKey}
              onChange={(e) => updateStyle({ fontSize: Number(e.target.value) || undefined })}
              className="w-12 h-6 text-center border-0 px-0 text-xs"
            />
            <Button
              variant="ghost" size="icon" className="h-6 w-6"
              disabled={!selectedKey}
              onClick={() => updateStyle({ fontSize: (selectedStyle.fontSize || 16) + 1 })}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>

          <label className="relative">
            <span className="sr-only">لون النص</span>
            <input
              type="color"
              value={selectedStyle.fill || "#000000"}
              disabled={!selectedKey}
              onChange={(e) => updateStyle({ fill: e.target.value })}
              className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <Button variant="outline" size="sm" disabled={!selectedKey} className="gap-1.5 pointer-events-none">
              <Palette className="w-4 h-4" />
              <span
                className="w-4 h-4 rounded border border-border"
                style={{ background: selectedStyle.fill || "#000" }}
              />
            </Button>
          </label>

          <Separator orientation="vertical" className="h-6" />

          <Toggle
            size="sm" pressed={selectedStyle.fontWeight === "bold"}
            disabled={!selectedKey}
            onPressedChange={(v) => updateStyle({ fontWeight: v ? "bold" : "normal" })}
          >
            <Bold className="w-4 h-4" />
          </Toggle>
          <Toggle
            size="sm" pressed={selectedStyle.fontStyle === "italic"}
            disabled={!selectedKey}
            onPressedChange={(v) => updateStyle({ fontStyle: v ? "italic" : "normal" })}
          >
            <Italic className="w-4 h-4" />
          </Toggle>

          <div className="flex items-center gap-0.5 border border-border rounded-md h-8 px-0.5">
            <Toggle
              size="sm" pressed={selectedStyle.textAnchor === "start"} disabled={!selectedKey}
              onPressedChange={() => updateStyle({ textAnchor: "start" })}
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </Toggle>
            <Toggle
              size="sm" pressed={selectedStyle.textAnchor === "middle"} disabled={!selectedKey}
              onPressedChange={() => updateStyle({ textAnchor: "middle" })}
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </Toggle>
            <Toggle
              size="sm" pressed={selectedStyle.textAnchor === "end"} disabled={!selectedKey}
              onPressedChange={() => updateStyle({ textAnchor: "end" })}
            >
              <AlignRight className="w-3.5 h-3.5" />
            </Toggle>
          </div>

          <div className="flex-1" />

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs w-10 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.min(2, z + 0.1))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Toggle
            size="sm" pressed={showGrid} onPressedChange={setShowGrid} title="شبكة"
          >
            <Grid3x3 className="w-4 h-4" />
          </Toggle>
        </div>
      </header>

      {/* MAIN: sidebar + canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR */}
        <aside className="w-72 border-l border-border bg-card/30 backdrop-blur flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex flex-col h-full">
            <TabsList className="m-3 grid grid-cols-2 shrink-0">
              <TabsTrigger value="fields" className="gap-1.5">
                <Type className="w-3.5 h-3.5" /> النصوص
              </TabsTrigger>
              <TabsTrigger value="logo" className="gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" /> الشعار
              </TabsTrigger>
            </TabsList>

            {activeTab === "fields" && (
              <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-3">
                {hasBack && (
                  <Tabs value={side} onValueChange={(v) => setSide(v as "front" | "back")}>
                    <TabsList className="w-full">
                      <TabsTrigger value="front" className="flex-1 text-xs">أمامي</TabsTrigger>
                      <TabsTrigger value="back" className="flex-1 text-xs">خلفي</TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}

                {currentFields.filter((f) => f.type !== "image").length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    لا توجد حقول قابلة للتعديل
                  </p>
                ) : (
                  currentFields
                    .filter((f) => f.type !== "image")
                    .map((f) => {
                      const val = values[f.key] ?? "";
                      const isSelected = selectedKey === f.key;
                      return (
                        <div
                          key={`${f.side}-${f.key}`}
                          className={`rounded-lg border p-2 transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border bg-card/40 hover:border-border/80"
                          }`}
                          onClick={() => setSelectedKey(f.key)}
                        >
                          <Label className="text-xs flex items-center gap-1.5 mb-1 text-muted-foreground">
                            {f.type === "color" && <Palette className="w-3 h-3" />}
                            {f.label}
                          </Label>
                          <Input
                            type={f.type === "color" ? "color" : "text"}
                            value={val}
                            onChange={(e) =>
                              setValues((v) => ({ ...v, [f.key]: e.target.value }))
                            }
                            placeholder={f.label}
                            className="h-8 text-sm"
                          />
                        </div>
                      );
                    })
                )}
              </div>
            )}

            {activeTab === "logo" && (
              <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-3">
                {logoFields.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    هذا القالب لا يدعم رفع شعار
                  </p>
                ) : (
                  logoFields.map((f) => {
                    const val = values[f.key] ?? "";
                    const onPick = (file?: File | null) => {
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) {
                        toast({ title: "الصورة كبيرة", description: "الحد الأقصى 2MB", variant: "destructive" });
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () =>
                        setValues((v) => ({ ...v, [f.key]: String(reader.result || "") }));
                      reader.readAsDataURL(file);
                    };
                    return (
                      <div key={f.key} className="rounded-lg border border-border bg-card/40 p-3">
                        <Label className="text-xs mb-2 block text-muted-foreground">{f.label}</Label>
                        <div className="aspect-video rounded-md bg-muted/30 border border-border flex items-center justify-center overflow-hidden mb-2">
                          {val ? (
                            <img src={val} alt="logo" className="max-w-full max-h-full object-contain" />
                          ) : (
                            <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                          )}
                        </div>
                        <label className="cursor-pointer block">
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/svg+xml,image/webp"
                            className="hidden"
                            onChange={(e) => onPick(e.target.files?.[0])}
                          />
                          <Button type="button" size="sm" variant="outline" asChild className="gap-1.5 w-full">
                            <span><Upload className="w-3.5 h-3.5" /> {val ? "تغيير" : "رفع شعار"}</span>
                          </Button>
                        </label>
                        {val && (
                          <Button
                            size="sm" variant="ghost"
                            className="gap-1.5 h-7 text-destructive w-full mt-1"
                            onClick={() => setValues((v) => ({ ...v, [f.key]: "" }))}
                          >
                            <X className="w-3 h-3" /> إزالة
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
                <p className="text-[10px] text-muted-foreground text-center">PNG/SVG شفاف، حتى 2MB</p>
              </div>
            )}
          </Tabs>
        </aside>

        {/* CANVAS */}
        <main className="flex-1 overflow-auto bg-muted/20 relative">
          <div
            className={`absolute inset-0 ${showGrid ? "opacity-100" : "opacity-0"} transition-opacity pointer-events-none`}
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--border) / 0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.4) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          <div className="min-h-full flex items-center justify-center p-8 relative">
            <div
              style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
              className="transition-transform"
            >
              <div className="perspective-1000">
                <div
                  className={`relative transition-transform duration-500 transform-style-3d ${
                    flipping ? "rotate-y-180" : ""
                  }`}
                >
                  <div className={side === "front" ? "block" : "hidden"}>
                    <StyledSvgRenderer
                      ref={frontRef}
                      svg={template.front_svg_content ?? ""}
                      fields={fieldsBySide.front}
                      values={renderValues}
                      styles={styles}
                      selectedKey={side === "front" ? selectedKey : null}
                      onSelect={setSelectedKey}
                      onDragEnd={onDragEnd}
                      onEdit={onInlineEdit}
                      className="w-[600px] rounded-xl border border-border bg-white overflow-hidden shadow-2xl"
                    />
                  </div>
                  {hasBack && (
                    <div className={side === "back" ? "block" : "hidden"}>
                      <StyledSvgRenderer
                        ref={backRef}
                        svg={template.back_svg_content ?? ""}
                        fields={fieldsBySide.back}
                        values={renderValues}
                        styles={styles}
                        selectedKey={side === "back" ? selectedKey : null}
                        onSelect={setSelectedKey}
                        onDragEnd={onDragEnd}
                        onEdit={onInlineEdit}
                        className="w-[600px] rounded-xl border border-border bg-white overflow-hidden shadow-2xl"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {hasBack && (
            <Button
              variant="outline" size="sm"
              onClick={flip}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 gap-1.5 shadow-lg"
            >
              <RotateCw className="w-3.5 h-3.5" /> اقلب البطاقة
            </Button>
          )}

          {selectedField && (
            <div className="absolute top-4 right-4 rounded-lg border border-border bg-card/95 backdrop-blur px-3 py-2 text-xs flex items-center gap-2 shadow-lg">
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span className="font-semibold">{selectedField.label}</span>
              <span className="text-muted-foreground font-mono">{`{{${selectedField.key}}}`}</span>
            </div>
          )}

          {/* Hidden render of opposite side for export */}
          {hasBack && (
            <div className="absolute -left-[9999px] top-0 pointer-events-none">
              <StyledSvgRenderer
                ref={side === "front" ? backRef : frontRef}
                svg={(side === "front" ? template.back_svg_content : template.front_svg_content) ?? ""}
                fields={side === "front" ? fieldsBySide.back : fieldsBySide.front}
                values={renderValues}
                styles={styles}
                className="w-[600px]"
              />
            </div>
          )}
        </main>
      </div>

      <PrintReadyDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        frontNode={frontRef.current}
        backNode={hasBack ? backRef.current : null}
        cardName={template.name}
        templateId={template.id}
        designData={{ values, styles }}
      />

      <Dialog open={paywallOpen !== null} onOpenChange={(o) => !o && setPaywallOpen(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-destructive" /> يرجى الاشتراك أو شراء نقاط
            </DialogTitle>
            <DialogDescription>
              تصدير {paywallOpen === "pdf" ? "PDF يكلف 2 نقطة" : "PNG يكلف 1 نقطة"}.
              رصيدك الحالي: <strong>{billing.credits?.balance ?? 0}</strong> نقطة •
              خطتك: <strong>{billing.plan?.name ?? "Free"}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2 text-sm">
            <div className="rounded-lg border border-border p-3 bg-muted/30">
              💎 <strong>Pro</strong> — تصدير غير محدود
            </div>
            <div className="rounded-lg border border-border p-3 bg-muted/30">
              🪙 <strong>نقاط</strong> — اشتر دفعة نقاط لاستخدامها متى شئت
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPaywallOpen(null)}>إلغاء</Button>
            <Button variant="secondary" onClick={() => { setPaywallOpen(null); navigate("/billing?tab=credits"); }}>
              <Coins className="w-4 h-4 ml-1" /> شراء نقاط
            </Button>
            <Button onClick={() => { setPaywallOpen(null); navigate("/billing?tab=plans"); }}>
              <Sparkles className="w-4 h-4 ml-1" /> ترقية الخطة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TemplateEditor;
