import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Package, Search, Plus, Edit, Trash2, Eye, Filter } from "lucide-react";
import { products } from "@/lib/products";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const AdminProducts = () => {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = useMemo(() => {
    const cats = [...new Set(products.map((p) => p.category))];
    return ["all", ...cats];
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategory === "all" || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [search, selectedCategory]);

  return (
    <div className="space-y-6" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">📦 إدارة المنتجات</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} منتج</p>
        </div>
        <Button className="gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" />
          إضافة منتج
        </Button>
      </motion.div>

      {/* Filters */}
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

      {/* Products Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">المنتج</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">التصنيف</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">السعر</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium hidden md:table-cell">الوصف</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">الحالة</th>
                <th className="text-center py-3 px-4 text-xs text-muted-foreground font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 20).map((p) => (
                <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      <span className="font-medium text-foreground truncate max-w-[180px]">{p.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">{p.category}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">${p.price}</span>
                      {p.originalPrice && (
                        <span className="text-xs text-muted-foreground line-through">${p.originalPrice}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <p className="text-xs text-muted-foreground truncate max-w-[250px]">{p.shortDescription}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-green-400/10 text-green-400">نشط</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 20 && (
          <div className="p-4 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">عرض 20 من {filtered.length} منتج</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AdminProducts;
