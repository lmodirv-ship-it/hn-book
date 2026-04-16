import { useState, useEffect } from "react";
import {
  CreditCard, Plus, Trash2, Loader2, Edit2, EyeOff, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { printService, TEMPLATE_CATEGORIES, type CardTemplate } from "@/services/printService";
import { toast } from "@/hooks/use-toast";
import { optimizeImage } from "@/lib/image-optimizer";

const CardTemplatesAdmin = () => {
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("business");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState("all");

  const fetchData = async () => {
    const data = await printService.getAllTemplates();
    setTemplates(data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = filterCat === "all" ? templates : templates.filter(t => t.category === filterCat);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const optimized = await optimizeImage(file);
    const ext = optimized.name.split(".").pop() || "webp";
    const path = `card-templates/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("book-images").upload(path, optimized);
    if (error) {
      toast({ title: "فشل الرفع", variant: "destructive" });
    } else {
      const { data } = supabase.storage.from("book-images").getPublicUrl(path);
      setImageUrl(data.publicUrl);
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!name.trim() || !imageUrl.trim()) {
      toast({ title: "أدخل الاسم والصورة", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await printService.updateTemplate(editId, { name, image_url: imageUrl, category });
        toast({ title: "تم التحديث ✅" });
      } else {
        await printService.createTemplate(name, imageUrl, category);
        toast({ title: "تمت الإضافة ✅" });
      }
      setShowDialog(false);
      setEditId(null);
      setName("");
      setImageUrl("");
      setCategory("business");
      fetchData();
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, active: boolean) => {
    await printService.updateTemplate(id, { is_active: active });
    fetchData();
  };

  const deleteTemplate = async (id: string) => {
    await printService.deleteTemplate(id);
    toast({ title: "تم الحذف" });
    fetchData();
  };

  const openEdit = (t: CardTemplate) => {
    setEditId(t.id);
    setName(t.name);
    setImageUrl(t.image_url);
    setCategory(t.category);
    setShowDialog(true);
  };

  const openCreate = () => {
    setEditId(null);
    setName("");
    setImageUrl("");
    setCategory("business");
    setShowDialog(true);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-primary" /> تصاميم البطاقات
        </h1>
        <Button onClick={openCreate} className="gap-1.5"><Plus className="w-4 h-4" /> تصميم جديد</Button>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilterCat("all")} className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${filterCat === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"}`}>الكل ({templates.length})</button>
        {TEMPLATE_CATEGORIES.map(c => {
          const count = templates.filter(t => t.category === c.value).length;
          return (
            <button key={c.value} onClick={() => setFilterCat(c.value)} className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${filterCat === c.value ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"}`}>
              {c.label} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-semibold">لا توجد تصاميم</p>
          <Button onClick={openCreate} className="mt-4 gap-1.5"><Plus className="w-4 h-4" /> إضافة تصميم</Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(t => (
            <div key={t.id} className={`rounded-xl border border-border overflow-hidden bg-card ${!t.is_active ? "opacity-50" : ""}`}>
              <div className="aspect-[1.8/1] bg-muted/10 relative">
                <img src={t.image_url} alt={t.name} className="w-full h-full object-cover" />
                {!t.is_active && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <EyeOff className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-foreground truncate flex-1">{t.name}</p>
                  <Badge variant="secondary" className="text-[9px] px-1.5 shrink-0">
                    {TEMPLATE_CATEGORIES.find(c => c.value === t.category)?.label || t.category}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Switch checked={t.is_active} onCheckedChange={v => toggleActive(t.id, v)} />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(t)} className="h-8 w-8">
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteTemplate(t.id)} className="h-8 w-8 text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editId ? "تعديل التصميم" : "إضافة تصميم جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم التصميم</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="تصميم كلاسيكي" />
            </div>
            <div>
              <Label>الفئة</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>صورة التصميم</Label>
              {imageUrl && <img src={imageUrl} alt="" className="w-full h-28 rounded-lg object-cover mb-2" />}
              <div className="flex gap-2">
                <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="رابط الصورة أو ارفع ملف" className="flex-1" />
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                  <Button variant="outline" size="icon" asChild disabled={uploading}>
                    <span>{uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}</span>
                  </Button>
                </label>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? "حفظ التعديلات" : "إضافة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CardTemplatesAdmin;
