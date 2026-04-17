import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Download, FileImage, FileType2, FileText, FolderTree, Type } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Asset } from "@/services/assetService";

interface AssetFile {
  id: string;
  file_kind: string;
  file_name: string;
  file_extension: string | null;
  public_url: string;
  file_size: number | null;
  folder_path: string | null;
  is_primary: boolean;
}

const KIND_META: Record<string, { label: string; icon: any; color: string }> = {
  preview: { label: "معاينة", icon: FileImage, color: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  source: { label: "مصدر", icon: FileType2, color: "bg-purple-500/10 text-purple-700 dark:text-purple-300" },
  license: { label: "ترخيص", icon: FileText, color: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  font: { label: "خط", icon: Type, color: "bg-pink-500/10 text-pink-700 dark:text-pink-300" },
  document: { label: "وثيقة", icon: FileText, color: "bg-green-500/10 text-green-700 dark:text-green-300" },
  other: { label: "أخرى", icon: FolderTree, color: "bg-muted text-muted-foreground" },
};

const fmtSize = (b?: number | null) => {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
};

interface Props {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function AssetDetailDialog({ asset, open, onOpenChange }: Props) {
  const [files, setFiles] = useState<AssetFile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!asset || !open) return;
    setLoading(true);
    supabase
      .from("asset_files" as never)
      .select("*")
      .eq("asset_id", asset.id)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        setFiles((data as any[] | null) ?? []);
        setLoading(false);
      });
  }, [asset, open]);

  if (!asset) return null;

  const grouped = files.reduce<Record<string, AssetFile[]>>((acc, f) => {
    const k = f.file_kind || "other";
    (acc[k] ??= []).push(f);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{asset.code}</span>
            {asset.title}
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="aspect-square bg-muted rounded-lg overflow-hidden">
            <img src={asset.image_url} alt={asset.title} className="w-full h-full object-cover" />
          </div>
          <div className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">النوع:</span> <Badge variant="outline">{asset.asset_type}</Badge></div>
            <div><span className="text-muted-foreground">الفئة:</span> {asset.category}</div>
            <div><span className="text-muted-foreground">عدد الملفات:</span> {files.length}</div>
            {asset.description && <p className="text-muted-foreground">{asset.description}</p>}
          </div>
        </div>

        <div className="mt-4">
          <h3 className="font-semibold mb-2">الملفات المرتبطة</h3>
          {loading ? (
            <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
          ) : files.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">لا توجد ملفات إضافية</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([kind, items]) => {
                const meta = KIND_META[kind] || KIND_META.other;
                const Icon = meta.icon;
                return (
                  <div key={kind}>
                    <div className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded mb-2 ${meta.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {meta.label} ({items.length})
                    </div>
                    <div className="grid gap-2">
                      {items.map((f) => (
                        <div key={f.id} className="flex items-center gap-2 p-2 border rounded-lg hover:bg-muted/50">
                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-xs truncate">{f.file_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {f.folder_path && <span>{f.folder_path}/ • </span>}
                              {fmtSize(f.file_size)} • {f.file_extension?.toUpperCase()}
                            </div>
                          </div>
                          <a href={f.public_url} target="_blank" rel="noreferrer" download>
                            <Button size="sm" variant="ghost"><Download className="w-4 h-4" /></Button>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
