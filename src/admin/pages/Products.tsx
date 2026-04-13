import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Package, Search, Plus, Edit, Trash2, Eye, X, Upload, ExternalLink, Copy, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProductImageUpload } from "@/admin/components/ProductImageUpload";
import { BookPdfUpload } from "@/admin/components/BookPdfUpload";
import { ProductCreateDialog } from "@/admin/components/ProductCreateDialog";
import { BookCatalogUpload } from "@/admin/components/BookCatalogUpload";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  short_description: string | null;
  price: number;
  original_price: number | null;
  category: string;
  image: string | null;
  is_active: boolean | null;
  badge: string | null;
  pdf_url: string | null;
}

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, name, short_description, price, original_price, category, image, is_active, badge, pdf_url")
      .order("created_at", { ascending: false });
    setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const categories = useMemo(() => {
    const cats = [...new Set(products.map((p) => p.category))];
    return ["all", ...cats];
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategory === "all" || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, search, selectedCategory]);

  const handleDelete = async (id: string) => {
    await supabase.from("products").delete().eq("id", id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    toast.success("تم حذف المنتج");
  };

  const handleImageUpdated = (productId: string, url: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, image: url || null } : p))
    );
    if (editProduct?.id === productId) {
      setEditProduct((prev) => prev ? { ...prev, image: url || null } : null);
    }
  };

  const handlePdfUpdated = (productId: string, url: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, pdf_url: url || null } : p))
    );
    if (editProduct?.id === productId) {
      setEditProduct((prev) => prev ? { ...prev, pdf_url: url || null } : null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">📦 إدارة المنتجات</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} منتج في قاعدة البيانات</p>
        </div>
        <Button className="gap-1.5 text-xs" onClick={() => setShowCreate(true)}>
          <Plus className="w-3.5 h-3.5" />
          إضافة منتج
        </Button>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث عن منتج..."
            className="pr-9 bg-card border-border"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap px-3 py-2 rounded-lg text-xs transition-all ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat === "all" ? "الكل" : cat}
            </button>
          ))}
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">المنتج</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">التصنيف</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">السعر</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">الأيقونة</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">الرابط</th>
                <th className="text-center py-3 px-4 text-xs text-muted-foreground font-medium">PDF</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium hidden md:table-cell">الوصف</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">الحالة</th>
                <th className="text-center py-3 px-4 text-xs text-muted-foreground font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const productLink = `/product/${p.id}`;
                const fullLink = `${window.location.origin}${productLink}`;
                return (
                <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0">
                          <Upload className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className="font-medium text-foreground truncate max-w-[180px]">{p.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">{p.category}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">${p.price}</span>
                      {p.original_price && (
                        <span className="text-xs text-muted-foreground line-through">${p.original_price}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {p.badge ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">{p.badge}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <a
                        href={productLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline truncate max-w-[120px]"
                        title={fullLink}
                      >
                        {productLink}
                      </a>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(fullLink);
                          toast.success("تم نسخ الرابط");
                        }}
                        className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {p.pdf_url ? (
                      <a href={p.pdf_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <FileText className="w-3.5 h-3.5" /> PDF
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <p className="text-xs text-muted-foreground truncate max-w-[250px]">{p.short_description}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${
                      p.is_active ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"
                    }`}>
                      {p.is_active ? "نشط" : "معطل"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1">
                      <a href={productLink} target="_blank" className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                        <Eye className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => setEditProduct(p)}
                        className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">لا توجد منتجات</div>
        )}
      </motion.div>

      {/* Edit Product Dialog */}
      <Dialog open={!!editProduct} onOpenChange={(open) => !open && setEditProduct(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-foreground">تعديل المنتج</DialogTitle>
          </DialogHeader>
          {editProduct && (
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium text-foreground">{editProduct.name}</p>
                <p className="text-xs text-muted-foreground">{editProduct.category} · ${editProduct.price}</p>
              </div>
              <ProductImageUpload
                productId={editProduct.id}
                currentImage={editProduct.image}
                onImageUpdated={(url) => handleImageUpdated(editProduct.id, url)}
              />
              <div className="border-t border-border pt-4">
                <BookPdfUpload
                  productId={editProduct.id}
                  currentPdfUrl={editProduct.pdf_url}
                  onPdfUpdated={(url) => handlePdfUpdated(editProduct.id, url)}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ProductCreateDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onProductCreated={fetchProducts}
      />
    </div>
  );
};

export default AdminProducts;
