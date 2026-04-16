import { useState, useEffect, useMemo } from "react";
import {
  Star, Plus, Trash2, Loader2, Search, GripVertical,
  Flame, TrendingUp, BookOpen, Filter, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Recommendation {
  id: string;
  book_id: string;
  type: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  product?: { id: string; name: string; image: string; category: string; price: number };
}

interface Product {
  id: string;
  name: string;
  image: string;
  category: string;
  price: number;
}

const TYPE_MAP: Record<string, { label: string; icon: any; color: string }> = {
  featured: { label: "مختارات", icon: Star, color: "bg-amber-500/15 text-amber-500" },
  trending: { label: "رائج", icon: Flame, color: "bg-red-500/15 text-red-500" },
  recommended: { label: "مقترح", icon: TrendingUp, color: "bg-emerald-500/15 text-emerald-500" },
};

const RecommendationsManagement = () => {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [addForm, setAddForm] = useState({ bookId: "", type: "featured", priority: 0 });
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  const fetchData = async () => {
    const [recsRes, prodsRes] = await Promise.all([
      supabase.from("manual_recommendations").select("*").order("priority", { ascending: true }),
      supabase.from("products").select("id, name, image, category, price").eq("is_active", true).order("name"),
    ]);
    const recsData = (recsRes.data || []) as any[];
    const prodsData = (prodsRes.data || []) as Product[];
    setProducts(prodsData);
    
    const prodMap = new Map(prodsData.map(p => [p.id, p]));
    setRecs(recsData.map((r: any) => ({ ...r, product: prodMap.get(r.book_id) })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    let list = recs;
    if (filterType !== "all") list = list.filter(r => r.type === filterType);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => r.product?.name.toLowerCase().includes(q));
    }
    return list;
  }, [recs, search, filterType]);

  const stats = useMemo(() => ({
    total: recs.length,
    featured: recs.filter(r => r.type === "featured").length,
    trending: recs.filter(r => r.type === "trending").length,
    recommended: recs.filter(r => r.type === "recommended").length,
  }), [recs]);

  const existingBookIds = useMemo(() => {
    if (addForm.type === "all") return new Set<string>();
    return new Set(recs.filter(r => r.type === addForm.type).map(r => r.book_id));
  }, [recs, addForm.type]);

  const availableProducts = useMemo(() => {
    let list = products.filter(p => !existingBookIds.has(p.id));
    if (productSearch) {
      const q = productSearch.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    return list.slice(0, 20);
  }, [products, existingBookIds, productSearch]);

  const handleAdd = async () => {
    if (!addForm.bookId) {
      toast({ title: "اختر كتاباً", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("manual_recommendations").insert({
      book_id: addForm.bookId,
      type: addForm.type,
      priority: addForm.priority,
    } as any);
    if (error) {
      toast({ title: error.message.includes("unique") ? "الكتاب موجود مسبقاً في هذا القسم" : "حدث خطأ", variant: "destructive" });
    } else {
      toast({ title: "تمت الإضافة بنجاح ✅" });
      setShowAdd(false);
      setAddForm({ bookId: "", type: "featured", priority: 0 });
      fetchData();
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("manual_recommendations").update({ is_active: active } as any).eq("id", id);
    fetchData();
  };

  const updatePriority = async (id: string, priority: number) => {
    await supabase.from("manual_recommendations").update({ priority } as any).eq("id", id);
    fetchData();
  };

  const deleteRec = async (id: string) => {
    await supabase.from("manual_recommendations").delete().eq("id", id);
    fetchData();
    toast({ title: "تم الحذف" });
  };

  const TypeBadge = ({ type }: { type: string }) => {
    const info = TYPE_MAP[type] || TYPE_MAP.featured;
    const Icon = info.icon;
    return (
      <Badge className={`${info.color} gap-1`}>
        <Icon className="w-3 h-3" /> {info.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Star className="w-6 h-6 text-primary" /> إدارة التوصيات
        </h1>
        <Button onClick={() => setShowAdd(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> إضافة توصية
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: BookOpen, label: "الإجمالي", value: stats.total, color: "bg-primary/15 text-primary" },
          { icon: Star, label: "مختارات", value: stats.featured, color: "bg-amber-500/15 text-amber-500" },
          { icon: Flame, label: "رائج", value: stats.trending, color: "bg-red-500/15 text-red-500" },
          { icon: TrendingUp, label: "مقترح", value: stats.recommended, color: "bg-emerald-500/15 text-emerald-500" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث بالعنوان..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
        </div>
        <Select value={filterType} onValueChange={v => setFilterType(v)}>
          <SelectTrigger className="w-[140px]"><Filter className="w-4 h-4 ml-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="featured">مختارات</SelectItem>
            <SelectItem value="trending">رائج</SelectItem>
            <SelectItem value="recommended">مقترح</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-semibold">لا توجد توصيات</p>
          <p className="text-sm mt-1">أضف كتباً للأقسام المختلفة</p>
          <Button onClick={() => setShowAdd(true)} className="mt-4 gap-1.5"><Plus className="w-4 h-4" /> إضافة توصية</Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">الترتيب</TableHead>
                <TableHead>الكتاب</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-center">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Input
                      type="number"
                      value={r.priority}
                      onChange={e => updatePriority(r.id, +e.target.value)}
                      className="w-16 h-8 text-center text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        src={r.product?.image || "/placeholder.svg"}
                        alt={r.product?.name}
                        className="w-10 h-14 rounded object-cover border border-border"
                      />
                      <div>
                        <p className="font-medium text-sm text-foreground line-clamp-1">{r.product?.name || "كتاب محذوف"}</p>
                        <p className="text-xs text-muted-foreground">{r.product?.category} • {r.product?.price} د.م</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><TypeBadge type={r.type} /></TableCell>
                  <TableCell>
                    <Switch checked={r.is_active} onCheckedChange={v => toggleActive(r.id, v)} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" onClick={() => deleteRec(r.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة توصية جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">النوع</label>
              <Select value={addForm.type} onValueChange={v => setAddForm({ ...addForm, type: v, bookId: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">⭐ مختارات</SelectItem>
                  <SelectItem value="trending">🔥 رائج</SelectItem>
                  <SelectItem value="recommended">📈 مقترح</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">الترتيب</label>
              <Input type="number" value={addForm.priority} onChange={e => setAddForm({ ...addForm, priority: +e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">اختر كتاباً</label>
              <Input placeholder="بحث..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="mb-2" />
              <div className="max-h-60 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                {availableProducts.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">لا توجد كتب متاحة</p>
                ) : availableProducts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setAddForm({ ...addForm, bookId: p.id })}
                    className={`w-full flex items-center gap-3 p-2.5 text-right hover:bg-secondary/50 transition-colors ${addForm.bookId === p.id ? "bg-primary/10 border-r-2 border-primary" : ""}`}
                  >
                    <img src={p.image} alt={p.name} className="w-8 h-11 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.category} • {p.price} د.م</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleAdd} disabled={saving || !addForm.bookId} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "إضافة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecommendationsManagement;
