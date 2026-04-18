import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Database, Search, Edit, Trash2, Eye, EyeOff, Save, X, RefreshCw,
  ChevronLeft, ChevronRight, BookOpen, FileText, AlertTriangle,
  Download, Server, Loader2, HardDrive,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { bookService, invalidateBookCache } from "@/services/bookService";
import { categoryService } from "@/services/categoryService";
import { toast } from "sonner";

const PAGE_SIZE = 30;

interface BookRow {
  id: string;
  name: string;
  category: string;
  price: number;
  referenceCode: string | null;
  image: string;
  pdfUrl?: string;
  pageCount?: number;
  isActive?: boolean;
  createdAt?: string;
}

const DatabaseManager = () => {
  const [books, setBooks] = useState<BookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [editBook, setEditBook] = useState<BookRow | null>(null);
  const [editFields, setEditFields] = useState<Partial<BookRow>>({});
  const [saving, setSaving] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    categoryService.getAll().then(r => {
      if (r.data) setCategories(r.data.map(c => c.name));
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { setSearchDebounced(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    const filter = {
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      ...(searchDebounced.trim() ? { search: searchDebounced.trim() } : {}),
      ...(catFilter !== "all" ? { category: catFilter } : {}),
    };
    const [booksRes, countRes] = await Promise.all([
      bookService.getAll(filter),
      bookService.getCount(filter),
    ]);
    if (booksRes.data) {
      setBooks(booksRes.data.map(b => ({
        id: b.id,
        name: b.name,
        category: b.category,
        price: b.price,
        referenceCode: b.referenceCode || null,
        image: b.image,
        pdfUrl: b.pdfUrl,
        pageCount: b.pageCount,
        isActive: b.isActive,
        createdAt: b.createdAt,
      })));
    }
    setTotalCount(countRes.data ?? 0);
    setLoading(false);
  }, [page, searchDebounced, catFilter]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  const handleToggleActive = async (book: BookRow) => {
    const newActive = !book.isActive;
    const result = await bookService.update(book.id, { isActive: newActive });
    if (result.error) { toast.error("فشل التحديث"); return; }
    setBooks(prev => prev.map(b => b.id === book.id ? { ...b, isActive: newActive } : b));
    invalidateBookCache();
    toast.success(newActive ? "تم تفعيل الكتاب" : "تم إخفاء الكتاب");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذا الكتاب نهائياً؟")) return;
    const result = await bookService.delete(id);
    if (result.error) { toast.error("فشل الحذف"); return; }
    setBooks(prev => prev.filter(b => b.id !== id));
    setTotalCount(prev => prev - 1);
    invalidateBookCache();
    toast.success("تم الحذف");
  };

  const openEdit = (book: BookRow) => {
    setEditBook(book);
    setEditFields({ name: book.name, category: book.category, price: book.price });
  };

  const handleSave = async () => {
    if (!editBook) return;
    setSaving(true);
    const result = await bookService.update(editBook.id, {
      name: editFields.name,
      category: editFields.category,
      price: editFields.price,
    });
    setSaving(false);
    if (result.error) { toast.error("فشل الحفظ"); return; }
    setBooks(prev => prev.map(b => b.id === editBook.id ? { ...b, ...editFields } : b));
    invalidateBookCache();
    setEditBook(null);
    toast.success("تم الحفظ");
  };

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
  };

  // Validation stats
  const stats = useMemo(() => {
    const noPdf = books.filter(b => !b.pdfUrl).length;
    const noCover = books.filter(b => !b.image || b.image === "/placeholder.svg").length;
    const hidden = books.filter(b => !b.isActive).length;
    return { noPdf, noCover, hidden };
  }, [books]);

  return (
    <div className="space-y-6" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
              <Database className="w-6 h-6 text-primary" /> مدير قاعدة البيانات
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{totalCount} سجل • صفحة {page} من {totalPages}</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { invalidateBookCache(); fetchBooks(); }}>
            <RefreshCw className="w-3.5 h-3.5" /> تحديث
          </Button>
        </div>
      </motion.div>

      {/* Quick stats */}
      {(stats.noPdf > 0 || stats.noCover > 0 || stats.hidden > 0) && (
        <div className="flex gap-3 flex-wrap">
          {stats.noPdf > 0 && (
            <Badge variant="destructive" className="gap-1 text-xs"><AlertTriangle className="w-3 h-3" /> {stats.noPdf} بدون PDF</Badge>
          )}
          {stats.noCover > 0 && (
            <Badge variant="outline" className="gap-1 text-xs border-yellow-500/30 text-yellow-500">{stats.noCover} بدون غلاف</Badge>
          )}
          {stats.hidden > 0 && (
            <Badge variant="secondary" className="gap-1 text-xs"><EyeOff className="w-3 h-3" /> {stats.hidden} مخفي</Badge>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالعنوان أو التصنيف..." className="pr-9 bg-card border-border" />
        </div>
        <Select value={catFilter} onValueChange={(v) => { setCatFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px] bg-card border-border">
            <SelectValue placeholder="التصنيف" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل التصنيفات</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">الغلاف</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">العنوان</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">المرجع</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">التصنيف</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">الصفحات</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">السعر</th>
                <th className="text-center py-3 px-4 text-xs text-muted-foreground font-medium">PDF</th>
                <th className="text-center py-3 px-4 text-xs text-muted-foreground font-medium">الحالة</th>
                <th className="text-center py-3 px-4 text-xs text-muted-foreground font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-3 px-4"><Skeleton className="w-10 h-10 rounded-lg" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-3 w-16" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-3 w-20" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-3 w-10" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-3 w-14" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-3 w-8 mx-auto" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-5 w-12 mx-auto" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-6 w-20 mx-auto" /></td>
                  </tr>
                ))
              ) : books.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">لا توجد نتائج</td>
                </tr>
              ) : (
                books.map((b) => (
                  <tr key={b.id} className={`border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors ${!b.isActive ? "opacity-50" : ""}`}>
                    <td className="py-2 px-4">
                      {b.image && b.image !== "/placeholder.svg" ? (
                        <img src={b.image} alt="" className="w-10 h-12 rounded-lg object-cover" loading="lazy" />
                      ) : (
                        <div className="w-10 h-12 rounded-lg bg-secondary/50 flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-muted-foreground/40" />
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-4 font-medium text-foreground max-w-[200px] truncate">{b.name}</td>
                    <td className="py-2 px-4 font-mono text-xs text-foreground/70">{b.referenceCode || "—"}</td>
                    <td className="py-2 px-4">
                      <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">{b.category}</span>
                    </td>
                    <td className="py-2 px-4 text-xs">{b.pageCount || "—"}</td>
                    <td className="py-2 px-4 font-semibold text-foreground">{b.price} د.م</td>
                    <td className="py-2 px-4 text-center">
                      {b.pdfUrl ? (
                        <a href={b.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs flex items-center justify-center gap-1">
                          <FileText className="w-3 h-3" /> ✓
                        </a>
                      ) : (
                        <span className="text-destructive text-xs">✗</span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-center">
                      <button onClick={() => handleToggleActive(b)} className="inline-flex">
                        <Badge className={`text-[10px] cursor-pointer ${b.isActive ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : "bg-red-500/10 text-red-500 hover:bg-red-500/20"}`}>
                          {b.isActive ? <><Eye className="w-3 h-3 mr-1" /> نشط</> : <><EyeOff className="w-3 h-3 mr-1" /> مخفي</>}
                        </Badge>
                      </button>
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(b.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => goToPage(page - 1)} disabled={page === 1} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">صفحة {page} من {totalPages}</span>
          <Button variant="ghost" size="icon" onClick={() => goToPage(page + 1)} disabled={page === totalPages} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editBook} onOpenChange={(open) => !open && setEditBook(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل الكتاب</DialogTitle>
          </DialogHeader>
          {editBook && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">العنوان</label>
                <Input value={editFields.name ?? ""} onChange={(e) => setEditFields(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">التصنيف</label>
                <Select value={editFields.category ?? ""} onValueChange={(v) => setEditFields(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">السعر (د.م)</label>
                <Input type="number" min={0} value={editFields.price ?? 0} onChange={(e) => setEditFields(prev => ({ ...prev, price: Number(e.target.value) }))} />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="ghost" size="sm" onClick={() => setEditBook(null)}>
                  <X className="w-3.5 h-3.5 ml-1" /> إلغاء
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                  <Save className="w-3.5 h-3.5" /> {saving ? "جارٍ الحفظ..." : "حفظ"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DatabaseManager;
