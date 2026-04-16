import { useState, useEffect } from "react";
import { Image, Plus, Trash2, Loader2, Edit2, EyeOff, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { printService, LOGO_CATEGORIES, type Logo } from "@/services/printService";
import { toast } from "@/hooks/use-toast";
import { optimizeImage } from "@/lib/image-optimizer";

const LogosAdmin = () => {
  const [logos, setLogos] = useState<Logo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("general");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const data = await printService.getAllLogos();
    setLogos(data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const optimized = await optimizeImage(file);
    const ext = optimized.name.split(".").pop() || "webp";
    const path = `logos/${Date.now()}.${ext}`;
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
        await printService.updateLogo(editId, { name, image_url: imageUrl, category });
        toast({ title: "تم التحديث ✅" });
      } else {
        await printService.createLogo(name, imageUrl, category);
        toast({ title: "تمت الإضافة ✅" });
      }
      setShowDialog(false);
      setEditId(null);
      setName("");
      setImageUrl("");
      setCategory("general");
      fetchData();
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, active: boolean) => {
    await printService.updateLogo(id, { is_active: active });
    fetchData();
  };

  const deleteLogo = async (id: string) => {
    await printService.deleteLogo(id);
    toast({ title: "تم الحذف" });
    fetchData();
  };

  const openEdit = (l: Logo) => {
    setEditId(l.id);
    setName(l.name);
    setImageUrl(l.image_url);
    setCategory(l.category);
    setShowDialog(true);
  };

  const openCreate = () => {
    setEditId(null);
    setName("");
    setImageUrl("");
    setCategory("general");
    setShowDialog(true);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Image className="w-6 h-6 text-primary" /> مكتبة الشعارات
        </h1>
        <Button onClick={openCreate} className="gap-1.5"><Plus className="w-4 h-4" /> شعار جديد</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : logos.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Image className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-semibold">لا توجد شعارات</p>
          <Button onClick={openCreate} className="mt-4 gap-1.5"><Plus className="w-4 h-4" /> إضافة شعار</Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {logos.map(l => (
            <div key={l.id} className={`rounded-xl border border-border bg-card p-3 text-center ${!l.is_active ? "opacity-50" : ""}`}>
              <div className="w-full aspect-square bg-white rounded-lg mb-2 flex items-center justify-center p-2 relative">
                <img src={l.image_url} alt={l.name} className="max-w-full max-h-full object-contain" />
                {!l.is_active && (
                  <div className="absolute inset-0 bg-background/60 rounded-lg flex items-center justify-center">
                    <EyeOff className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <p className="text-xs font-medium text-foreground truncate mb-2">{l.name}</p>
              <div className="flex items-center justify-center gap-1">
                <Switch checked={l.is_active} onCheckedChange={v => toggleActive(l.id, v)} />
                <Button variant="ghost" size="icon" onClick={() => openEdit(l)} className="h-7 w-7"><Edit2 className="w-3 h-3" /></Button>
                <Button variant="ghost" size="icon" onClick={() => deleteLogo(l.id)} className="h-7 w-7 text-destructive"><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editId ? "تعديل الشعار" : "إضافة شعار جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>اسم الشعار</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="شعار شركة..." /></div>
            <div>
              <Label>الفئة</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LOGO_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>صورة الشعار</Label>
              {imageUrl && <img src={imageUrl} alt="" className="w-20 h-20 object-contain rounded-lg bg-white mx-auto mb-2 p-1" />}
              <div className="flex gap-2">
                <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="رابط أو ارفع ملف" className="flex-1" />
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

export default LogosAdmin;
