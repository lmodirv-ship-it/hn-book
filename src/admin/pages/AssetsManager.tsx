import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Search, Trash2, Eye, EyeOff, Loader2, Upload, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import {
  assetService,
  ASSET_TYPE_META,
  ASSET_CATEGORIES,
  type Asset,
  type AssetType,
  type AssetCategory,
} from "@/services/assetService";
import { supabase } from "@/integrations/supabase/client";
import { AssetPackageUpload } from "@/admin/components/AssetPackageUpload";
import { AssetDetailDialog } from "@/admin/components/AssetDetailDialog";

const ALL_TYPES = Object.keys(ASSET_TYPE_META) as AssetType[];

export default function AssetsManager() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [templateMap, setTemplateMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<AssetCategory | "all">("all");
  const [filterType, setFilterType] = useState<AssetType | "all">("all");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);

  const [form, setForm] = useState({
    title: "",
    asset_type: "CRD" as AssetType,
    description: "",
    imageFile: null as File | null,
    extraFile: null as File | null,
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await assetService.list({
        category: filterCategory,
        asset_type: filterType,
        search: search || undefined,
      });
      setAssets(data);

      // Map asset_id -> template_id for CRD assets that have an editable SVG template
      const crdIds = data.filter((a) => a.asset_type === "CRD").map((a) => a.id);
      if (crdIds.length) {
        const { data: tpls } = await supabase
          .from("svg_templates" as never)
          .select("id, asset_id")
          .in("asset_id", crdIds);
        const map: Record<string, string> = {};
        (tpls as any[] | null)?.forEach((t) => { if (t.asset_id) map[t.asset_id] = t.id; });
        setTemplateMap(map);
      } else {
        setTemplateMap({});
      }
    } catch (e: any) {
      toast.error(e.message ?? "فشل التحميل");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategory, filterType]);

  const stats = useMemo(() => {
    const byCat: Record<string, number> = { DSN: 0, MED: 0, DOC: 0, OTH: 0 };
    assets.forEach((a) => (byCat[a.category] = (byCat[a.category] ?? 0) + 1));
    return byCat;
  }, [assets]);

  const uploadFile = async (file: File, prefix: string): Promise<string> => {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("book-images").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("book-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleCreate = async () => {
    if (!form.title.trim()) return toast.error("العنوان مطلوب");
    if (!form.imageFile) return toast.error("صورة المعاينة مطلوبة");
    setCreating(true);
    try {
      const image_url = await uploadFile(form.imageFile, `assets/${form.asset_type}/preview`);
      const file_url = form.extraFile ? await uploadFile(form.extraFile, `assets/${form.asset_type}/file`) : null;
      const created = await assetService.create({
        asset_type: form.asset_type,
        title: form.title.trim(),
        description: form.description,
        image_url,
        file_url,
      });
      toast.success(`✅ تم الإنشاء: ${created.code}`);
      setOpen(false);
      setForm({ title: "", asset_type: "CRD", description: "", imageFile: null, extraFile: null });
      load();
    } catch (e: any) {
      toast.error(e.message ?? "فشل الإنشاء");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`حذف ${code}?`)) return;
    try {
      await assetService.remove(id);
      toast.success("تم الحذف");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleToggle = async (a: Asset) => {
    try {
      await assetService.toggleActive(a.id, !a.is_active);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">إدارة الأصول الرقمية</h1>
          <p className="text-muted-foreground text-sm mt-1">
            نظام موحّد للبطاقات، القوالب، الشعارات، الفلاير، الصور، الوثائق وغيرها — مع كود مرجعي تلقائي
          </p>
        </div>
        <div className="flex gap-2">
          <AssetPackageUpload onUploaded={load} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 me-2" />
                إضافة أصل
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>إنشاء أصل جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>النوع</Label>
                  <Select value={form.asset_type} onValueChange={(v) => setForm({ ...form, asset_type: v as AssetType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ALL_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {ASSET_TYPE_META[t].emoji} {ASSET_TYPE_META[t].label} ({t})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>الفئة (تلقائي)</Label>
                  <Input value={ASSET_CATEGORIES[ASSET_TYPE_META[form.asset_type].category]} disabled />
                </div>
              </div>
              <div>
                <Label>العنوان</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="عنوان الأصل" />
              </div>
              <div>
                <Label>وصف (اختياري)</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
              <div>
                <Label>صورة المعاينة *</Label>
                <Input type="file" accept="image/*" onChange={(e) => setForm({ ...form, imageFile: e.target.files?.[0] ?? null })} />
              </div>
              <div>
                <Label>الملف الأصلي (اختياري — PSD, PDF, AI...)</Label>
                <Input type="file" onChange={(e) => setForm({ ...form, extraFile: e.target.files?.[0] ?? null })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Upload className="w-4 h-4 me-2" />}
                إنشاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.keys(ASSET_CATEGORIES) as AssetCategory[]).map((c) => (
          <Card key={c} className="p-4">
            <div className="text-xs text-muted-foreground">{ASSET_CATEGORIES[c]} ({c})</div>
            <div className="text-2xl font-bold mt-1">{stats[c] ?? 0}</div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="بحث بالكود أو العنوان..."
              className="ps-9"
            />
          </div>
          <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v as AssetCategory | "all")}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفئات</SelectItem>
              {(Object.keys(ASSET_CATEGORIES) as AssetCategory[]).map((c) => (
                <SelectItem key={c} value={c}>{ASSET_CATEGORIES[c]} ({c})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={(v) => setFilterType(v as AssetType | "all")}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأنواع</SelectItem>
              {ALL_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{ASSET_TYPE_META[t].emoji} {ASSET_TYPE_META[t].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load}>تحديث</Button>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : assets.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">لا توجد أصول</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المعاينة</TableHead>
                <TableHead>الكود</TableHead>
                <TableHead>العنوان</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-end">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <img src={a.image_url} alt={a.title} className="w-12 h-12 rounded object-cover" />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{a.code}</TableCell>
                  <TableCell className="max-w-[240px] truncate">{a.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {ASSET_TYPE_META[a.asset_type].emoji} {ASSET_TYPE_META[a.asset_type].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={a.is_active ? "default" : "secondary"}>
                      {a.is_active ? "نشط" : "معطّل"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex justify-end gap-1">
                      {a.asset_type === "CRD" && templateMap[a.id] && (
                        <Link to={`/editor/${templateMap[a.id]}`}>
                          <Button size="icon" variant="ghost" title="تعديل التصميم">
                            <Pencil className="w-4 h-4 text-primary" />
                          </Button>
                        </Link>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => handleToggle(a)}>
                        {a.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(a.id, a.code)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
