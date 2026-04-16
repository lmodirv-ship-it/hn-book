import { useState, useEffect, useRef } from "react";
import { Frame, Plus, Trash2, Loader2, Edit2, EyeOff, Upload, Eye, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { tablouService, TABLOU_CATEGORIES, SIZE_LABELS, type Tablou, type TablouSize } from "@/services/tablouService";

const TablouAdmin = () => {
  const [items, setItems] = useState<Tablou[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editItem, setEditItem] = useState<Tablou | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editSizes, setEditSizes] = useState<TablouSize[]>([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    const data = await tablouService.getAllAdmin();
    setItems(data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    let success = 0;
    for (const file of files) {
      try {
        await tablouService.smartUpload(file);
        success++;
      } catch (err: any) {
        console.error(err);
      }
    }
    toast({ title: `✅ تم رفع ${success}/${files.length} تابلو` });
    setUploading(false);
    fetchData();
    if (fileRef.current) fileRef.current.value = "";
  };

  const openEdit = async (item: Tablou) => {
    setEditItem({ ...item });
    const sizes = await tablouService.getSizes(item.id);
    setEditSizes(sizes);
    setShowEdit(true);
  };

  const handleSave = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      await tablouService.update(editItem.id, {
        title: editItem.title,
        category: editItem.category,
        base_price: editItem.base_price,
        description: editItem.description,
        is_active: editItem.is_active,
      });
      for (const s of editSizes) {
        await tablouService.updateSize(s.id, {
          price_multiplier: s.price_multiplier,
          is_available: s.is_available,
        });
      }
      toast({ title: "تم الحفظ ✅" });
      setShowEdit(false);
      fetchData();
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await tablouService.delete(id);
    toast({ title: "تم الحذف" });
    fetchData();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await tablouService.update(id, { is_active: active });
    fetchData();
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Frame className="w-6 h-6 text-primary" /> إدارة التابلوهات
        </h1>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleBulkUpload} className="hidden" />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-1.5">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            رفع ذكي
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        ارفع صور متعددة — النظام يُنشئ عنوان وسعر تلقائياً مع 3 أحجام (صغير، متوسط، كبير)
      </p>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Frame className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-semibold">لا توجد تابلوهات</p>
          <Button onClick={() => fileRef.current?.click()} className="mt-4 gap-1.5"><Plus className="w-4 h-4" /> رفع تابلوهات</Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map(t => (
            <div key={t.id} className={`rounded-xl border border-border bg-card overflow-hidden ${!t.is_active ? "opacity-50" : ""}`}>
              <div className="aspect-square bg-muted/10 relative">
                <img src={t.image_url} alt={t.title} className="w-full h-full object-cover" />
                {!t.is_active && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <EyeOff className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="p-3 space-y-2">
                <p className="text-sm font-semibold text-foreground truncate">{t.title}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-[10px]">
                    {TABLOU_CATEGORIES.find(c => c.value === t.category)?.label}
                  </Badge>
                  <span className="text-sm font-bold text-primary">{t.base_price} د.م</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <Switch checked={t.is_active} onCheckedChange={v => toggleActive(t.id, v)} />
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل التابلو</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div><Label>العنوان</Label><Input value={editItem.title} onChange={e => setEditItem({ ...editItem, title: e.target.value })} /></div>
              <div>
                <Label>الفئة</Label>
                <Select value={editItem.category} onValueChange={v => setEditItem({ ...editItem, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TABLOU_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>السعر الأساسي (د.م)</Label><Input type="number" value={editItem.base_price} onChange={e => setEditItem({ ...editItem, base_price: Number(e.target.value) })} /></div>
              <div><Label>الوصف</Label><Input value={editItem.description || ""} onChange={e => setEditItem({ ...editItem, description: e.target.value })} /></div>

              {/* Sizes */}
              <div>
                <Label className="font-semibold">الأحجام</Label>
                <div className="space-y-2 mt-2">
                  {editSizes.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                      <span className="text-xs font-medium w-14">{SIZE_LABELS[s.size] || s.size}</span>
                      <span className="text-[10px] text-muted-foreground w-16">{s.width_cm}×{s.height_cm}</span>
                      <Input
                        type="number"
                        step="0.1"
                        value={s.price_multiplier}
                        onChange={e => {
                          const updated = [...editSizes];
                          updated[i] = { ...s, price_multiplier: Number(e.target.value) };
                          setEditSizes(updated);
                        }}
                        className="w-20 h-7 text-xs"
                      />
                      <span className="text-[10px] text-muted-foreground">×</span>
                      <span className="text-xs font-bold text-primary">{Math.round(editItem.base_price * s.price_multiplier)} د.م</span>
                      <Switch
                        checked={s.is_available}
                        onCheckedChange={v => {
                          const updated = [...editSizes];
                          updated[i] = { ...s, is_available: v };
                          setEditSizes(updated);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ التعديلات"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TablouAdmin;
