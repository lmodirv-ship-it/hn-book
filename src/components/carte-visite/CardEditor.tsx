import { useState, useRef, useCallback } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { CardPreview, type LayoutConfig, DEFAULT_LAYOUT } from "./CardPreview";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, Loader2, User, Briefcase, Building2, Phone, Mail, MapPin } from "lucide-react";

interface CardEditorProps {
  templateName: string;
  backgroundUrl: string;
  layoutConfig: LayoutConfig | null;
  onDataChange?: (data: Record<string, string>) => void;
  initialData?: Record<string, string>;
}

const FIELD_ICONS: Record<string, any> = {
  name: User,
  job_title: Briefcase,
  company: Building2,
  phone: Phone,
  email: Mail,
  address: MapPin,
};

const FIELD_LABELS: Record<string, string> = {
  name: "الاسم الكامل",
  job_title: "المسمى الوظيفي",
  company: "الشركة",
  phone: "الهاتف",
  email: "البريد الإلكتروني",
  address: "العنوان",
};

const FIELD_PLACEHOLDERS: Record<string, string> = {
  name: "محمد أمين",
  job_title: "مدير تسويق",
  company: "HN Groupe",
  phone: "+212 6XX XXX XXX",
  email: "email@example.com",
  address: "الدار البيضاء، المغرب",
};

const CardEditor = ({ templateName, backgroundUrl, layoutConfig, onDataChange, initialData }: CardEditorProps) => {
  const layout = layoutConfig?.fields?.length ? layoutConfig : DEFAULT_LAYOUT;
  const previewRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const [formData, setFormData] = useState<Record<string, string>>(
    initialData || Object.fromEntries(layout.fields.map((f) => [f.key, ""]))
  );

  const handleChange = useCallback(
    (key: string, value: string) => {
      setFormData((prev) => {
        const next = { ...prev, [key]: value };
        onDataChange?.(next);
        return next;
      });
    },
    [onDataChange]
  );

  const handleExportPDF = async () => {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      const canvas = previewRef.current.querySelector("canvas");
      if (!canvas) return;

      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [90, 50],
      });

      pdf.addImage(imgData, "PNG", 0, 0, 90, 50);
      pdf.save(`carte-visite-${templateName || "card"}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
    }
    setExporting(false);
  };

  const filledCount = Object.values(formData).filter((v) => v.trim()).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">بيانات البطاقة</h3>
          <Badge variant="secondary" className="text-xs">
            {filledCount}/{layout.fields.length} حقول
          </Badge>
        </div>

        <div className="space-y-3">
          {layout.fields.map((field) => {
            const Icon = FIELD_ICONS[field.key] || User;
            return (
              <div key={field.key}>
                <Label className="flex items-center gap-1.5 mb-1 text-sm">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  {FIELD_LABELS[field.key] || field.label}
                </Label>
                <Input
                  value={formData[field.key] || ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={FIELD_PLACEHOLDERS[field.key] || ""}
                  className="text-sm"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" /> معاينة مباشرة
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={exporting || filledCount === 0}
            className="gap-1.5"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            تحميل PDF
          </Button>
        </div>

        <div
          ref={previewRef}
          className="rounded-xl overflow-hidden border-2 border-border shadow-lg"
        >
          <CardPreview
            backgroundUrl={backgroundUrl}
            layoutConfig={layout}
            userData={formData}
          />
        </div>

        <p className="text-xs text-muted-foreground text-center">
          الكتابة تظهر مباشرة على التصميم • الخط يتأقلم تلقائياً
        </p>
      </div>
    </div>
  );
};

export default CardEditor;
