import { useEffect, useState } from "react";
import { Loader2, Upload, Trash2, Plus, FileCode2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  svgTemplateService,
  buildFieldsFromSvg,
  type SvgTemplate,
  type SvgField,
} from "@/services/svgTemplateService";
import SvgRenderer from "@/components/editor/SvgRenderer";
import { Link } from "react-router-dom";

const SvgTemplatesAdmin = () => {
  const [templates, setTemplates] = useState<SvgTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // form
  const [name, setName] = useState("");
  const [category, setCategory] = useState("business");
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontContent, setFrontContent] = useState("");
  const [backContent, setBackContent] = useState("");
  const [detectedFields, setDetectedFields] = useState<SvgField[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      setTemplates(await svgTemplateService.list());
    } catch (e: any) {
      toast({ title: "فشل التحميل", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const onFrontFile = async (f: File | null) => {
    setFrontFile(f);
    const txt = f ? await f.text() : "";
    setFrontContent(txt);
    setDetectedFields(buildFieldsFromSvg(txt, backContent));
  };

  const onBackFile = async (f: File | null) => {
    setBackFile(f);
    const txt = f ? await f.text() : "";
    setBackContent(txt);
    setDetectedFields(buildFieldsFromSvg(frontContent, txt));
  };

  const reset = () => {
    setName("");
    setCategory("business");
    setFrontFile(null);
    setBackFile(null);
    setFrontContent("");
    setBackContent("");
    setDetectedFields([]);
  };

  const submit = async () => {
    if (!name.trim() || !frontFile) {
      toast({ title: "أدخل الاسم وملف الوجه الأمامي", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const front = await svgTemplateService.uploadSvg(frontFile, `${name}-front`);
      let back: { url: string; content: string } | null = null;
      if (backFile) back = await svgTemplateService.uploadSvg(backFile, `${name}-back`);

      await svgTemplateService.create({
        name,
        category,
        front_svg_url: front.url,
        front_svg_content: front.content,
        back_svg_url: back?.url ?? null,
        back_svg_content: back?.content ?? null,
        fields: detectedFields,
      });
      toast({ title: "تم إنشاء القالب ✅" });
      setOpen(false);
      reset();
      load();
    } catch (e: any) {
      toast({ title: "فشل الحفظ", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const toggleActive = async (t: SvgTemplate) => {
    await svgTemplateService.update(t.id, { is_active: !t.is_active });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف القالب نهائياً؟")) return;
    await svgTemplateService.remove(id);
    toast({ title: "تم الحذف" });
    load();
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileCode2 className="w-6 h-6 text-primary" /> قوالب SVG القابلة للتعديل
        </h1>
        <Button onClick={() => setOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> قالب جديد
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        ارفع ملف SVG يحتوي على عناصر نصية مكتوبة كـ <code className="px-1 rounded bg-muted">{`{{name}}`}</code>،
        <code className="mx-1 px-1 rounded bg-muted">{`{{phone}}`}</code> إلخ. سيكتشف النظام الحقول تلقائياً.
      </p>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
          <FileCode2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>لا توجد قوالب بعد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div
              key={t.id}
              className={`rounded-xl border border-border bg-card overflow-hidden ${
                !t.is_active ? "opacity-60" : ""
              }`}
            >
              <div className="aspect-[1.75/1] bg-muted/10 relative overflow-hidden">
                {t.front_svg_content ? (
                  <SvgRenderer
                    svg={t.front_svg_content}
                    values={Object.fromEntries(t.fields.map((f) => [f.key, f.label]))}
                    className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
                  />
                ) : (
                  <img src={t.preview_image_url ?? ""} alt={t.name} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium truncate flex-1">{t.name}</p>
                  <Badge variant="secondary" className="text-[10px]">
                    {t.fields.length} حقل
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {t.back_svg_url && <Badge variant="outline" className="text-[9px]">وجهان</Badge>}
                  <Badge variant="outline" className="text-[9px]">{t.category}</Badge>
                </div>
                <div className="flex items-center gap-1 pt-1">
                  <Switch checked={t.is_active} onCheckedChange={() => toggleActive(t)} />
                  <Link to={`/editor/${t.id}`} className="ml-auto">
                    <Button size="sm" variant="outline" className="gap-1">
                      <Eye className="w-3.5 h-3.5" /> فتح المحرر
                    </Button>
                  </Link>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(t.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>قالب SVG جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم القالب</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="بطاقة كلاسيكية" />
            </div>
            <div>
              <Label>الفئة</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="business" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">SVG الوجه الأمامي *</Label>
                <label className="block mt-1 cursor-pointer">
                  <input
                    type="file"
                    accept=".svg,image/svg+xml"
                    className="hidden"
                    onChange={(e) => onFrontFile(e.target.files?.[0] ?? null)}
                  />
                  <div className="border border-dashed border-border rounded-lg p-3 text-center text-xs hover:bg-muted/30">
                    <Upload className="w-4 h-4 mx-auto mb-1" />
                    {frontFile ? frontFile.name : "اختر ملف"}
                  </div>
                </label>
              </div>
              <div>
                <Label className="text-xs">SVG الوجه الخلفي (اختياري)</Label>
                <label className="block mt-1 cursor-pointer">
                  <input
                    type="file"
                    accept=".svg,image/svg+xml"
                    className="hidden"
                    onChange={(e) => onBackFile(e.target.files?.[0] ?? null)}
                  />
                  <div className="border border-dashed border-border rounded-lg p-3 text-center text-xs hover:bg-muted/30">
                    <Upload className="w-4 h-4 mx-auto mb-1" />
                    {backFile ? backFile.name : "اختر ملف"}
                  </div>
                </label>
              </div>
            </div>

            {detectedFields.length > 0 && (
              <div>
                <Label className="text-xs">الحقول المكتشفة ({detectedFields.length})</Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {detectedFields.map((f) => (
                    <Badge key={`${f.side}-${f.key}`} variant="secondary" className="text-[10px]">
                      {`{{${f.key}}}`} · {f.side === "front" ? "أمامي" : "خلفي"}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {frontContent && (
              <div>
                <Label className="text-xs">معاينة (الوجه الأمامي)</Label>
                <div className="mt-1 border border-border rounded-lg overflow-hidden bg-muted/10 aspect-[1.75/1]">
                  <SvgRenderer
                    svg={frontContent}
                    values={Object.fromEntries(detectedFields.map((f) => [f.key, f.label]))}
                    className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
                  />
                </div>
              </div>
            )}

            <Button onClick={submit} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ القالب"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SvgTemplatesAdmin;
