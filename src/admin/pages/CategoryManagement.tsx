import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Tag, Plus, Edit, Trash2, Loader2, Check, X } from "lucide-react";
import { categoryService, type Category, type CategoryCreateInput } from "@/services/categoryService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const CategoryManagement = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const fetchCategories = async () => {
    const result = await categoryService.getAllIncludingInactive();
    if (result.data) setCategories(result.data);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error("يرجى إدخال اسم التصنيف"); return; }
    setSaving(true);
    const result = await categoryService.create({ name: newName.trim(), description: newDesc.trim() || undefined });
    setSaving(false);
    if (result.error) { toast.error("فشل في إضافة التصنيف"); return; }
    toast.success("تم إضافة التصنيف");
    setNewName(""); setNewDesc("");
    fetchCategories();
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    const result = await categoryService.update(id, { name: editName.trim(), description: editDesc.trim() || undefined });
    if (result.error) { toast.error("فشل في تحديث التصنيف"); return; }
    toast.success("تم تحديث التصنيف");
    setEditingId(null);
    fetchCategories();
  };

  const handleToggleActive = async (cat: Category) => {
    const result = await categoryService.update(cat.id, { isActive: !cat.isActive });
    if (result.error) { toast.error("فشل في تحديث الحالة"); return; }
    fetchCategories();
  };

  const handleDelete = async (id: string) => {
    const result = await categoryService.delete(id);
    if (result.error) { toast.error("فشل في حذف التصنيف"); return; }
    toast.success("تم حذف التصنيف");
    fetchCategories();
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
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-extrabold text-foreground">🏷️ إدارة التصنيفات</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{categories.length} تصنيف</p>
      </motion.div>

      {/* Create new category */}
      <div className="flex flex-col sm:flex-row gap-2 p-4 rounded-xl border border-border bg-card">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="اسم التصنيف الجديد"
          className="bg-background flex-1"
        />
        <Input
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          placeholder="وصف (اختياري)"
          className="bg-background flex-1"
        />
        <Button onClick={handleCreate} disabled={saving} className="gap-1.5 whitespace-nowrap">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          إضافة
        </Button>
      </div>

      {/* Categories list */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">التصنيف</th>
              <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium hidden sm:table-cell">الوصف</th>
              <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">Slug</th>
              <th className="text-center py-3 px-4 text-xs text-muted-foreground font-medium">الحالة</th>
              <th className="text-center py-3 px-4 text-xs text-muted-foreground font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                <td className="py-3 px-4">
                  {editingId === cat.id ? (
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-background h-8 text-sm" />
                  ) : (
                    <span className="font-medium text-foreground">{cat.name}</span>
                  )}
                </td>
                <td className="py-3 px-4 hidden sm:table-cell">
                  {editingId === cat.id ? (
                    <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="bg-background h-8 text-sm" placeholder="وصف" />
                  ) : (
                    <span className="text-xs text-muted-foreground">{cat.description || "—"}</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span className="font-mono text-xs text-muted-foreground">{cat.slug}</span>
                </td>
                <td className="py-3 px-4 text-center">
                  <Switch checked={cat.isActive} onCheckedChange={() => handleToggleActive(cat)} />
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-center gap-1">
                    {editingId === cat.id ? (
                      <>
                        <button onClick={() => handleUpdate(cat.id)} className="p-1.5 rounded-lg hover:bg-secondary text-primary">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => { setEditingId(cat.id); setEditName(cat.name); setEditDesc(cat.description || ""); }}
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {categories.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">لا توجد تصنيفات</div>
        )}
      </div>
    </div>
  );
};

export default CategoryManagement;
