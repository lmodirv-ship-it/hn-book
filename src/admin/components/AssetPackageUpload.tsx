import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FolderArchive, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ASSET_TYPES = [
  { value: "CRD", label: "🪪 بطاقة عمل (CRD)" },
  { value: "FLY", label: "📰 فلاير (FLY)" },
  { value: "PST", label: "🖼️ ملصق (PST)" },
  { value: "LOG", label: "🎨 شعار (LOG)" },
  { value: "TPL", label: "🧩 قالب عام (TPL)" },
  { value: "DOC", label: "📄 وثيقة (DOC)" },
];

interface Props {
  onUploaded?: () => void;
}

export function AssetPackageUpload({ onUploaded }: Props) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [assetType, setAssetType] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFile = (f: File | null) => {
    setFile(f);
    if (f && !title) {
      const stem = f.name.replace(/\.zip$/i, "").replace(/[-_]/g, " ");
      setTitle(stem);
      // auto-suggest type
      const lower = stem.toLowerCase();
      if (lower.includes("card")) setAssetType("CRD");
      else if (lower.includes("flyer")) setAssetType("FLY");
      else if (lower.includes("logo")) setAssetType("LOG");
      else if (lower.includes("poster")) setAssetType("PST");
      else if (lower.includes("template") || lower.includes("stationery")) setAssetType("TPL");
    }
  };

  const handleUpload = async () => {
    if (!file) return toast.error("اختر ملف ZIP");
    if (!file.name.toLowerCase().endsWith(".zip")) return toast.error("يجب أن يكون الملف بصيغة ZIP");

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (title) formData.append("title", title);
      if (assetType) formData.append("asset_type", assetType);

      const { data, error } = await supabase.functions.invoke("process-asset-package", {
        body: formData,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "فشل المعالجة");

      toast.success(`✅ تم إنشاء ${data.asset.code} مع ${data.files_count} ملف`);
      setOpen(false);
      setFile(null);
      setTitle("");
      setAssetType("");
      onUploaded?.();
    } catch (e: any) {
      toast.error(e.message || "فشل الرفع");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FolderArchive className="w-4 h-4 me-2" />
          رفع أرشيف ZIP
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>رفع مجلد أصل (ZIP)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            ارفع مجلد مضغوط يحوي: صور المعاينة (JPG/PNG) + الملفات المصدر (AI/EPS/PSD) + الخطوط + ملف الترخيص. سيتم تنظيمها تلقائياً وإعطاؤها كوداً فريداً.
          </div>

          <div>
            <Label>ملف ZIP *</Label>
            <Input type="file" accept=".zip" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
            {file && (
              <p className="text-xs text-muted-foreground mt-1">
                {file.name} — {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
          </div>

          <div>
            <Label>العنوان</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الأصل" />
          </div>

          <div>
            <Label>النوع (اختياري — كشف تلقائي)</Label>
            <Select value={assetType} onValueChange={setAssetType}>
              <SelectTrigger><SelectValue placeholder="كشف تلقائي" /></SelectTrigger>
              <SelectContent>
                {ASSET_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>إلغاء</Button>
          <Button onClick={handleUpload} disabled={uploading || !file}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Upload className="w-4 h-4 me-2" />}
            رفع ومعالجة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
