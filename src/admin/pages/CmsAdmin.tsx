import { useEffect, useMemo, useState } from "react";
import { cmsService, type CmsEntry } from "@/services/cmsService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Loader2, FileText, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import RequirePermission from "@/admin/components/RequirePermission";

const CmsAdminInner = () => {
  const [entries, setEntries] = useState<CmsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({ page: "", key: "", value: "", label: "" });

  const load = async () => {
    setLoading(true);
    try {
      const data = await cmsService.listAll();
      setEntries(data);
      const d: Record<string, string> = {};
      data.forEach((e) => (d[e.id] = e.value));
      setDrafts(d);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pages = useMemo(() => {
    return Array.from(new Set(entries.map((e) => e.page))).sort();
  }, [entries]);

  const save = async (e: CmsEntry) => {
    setSaving(e.id);
    try {
      await cmsService.upsert({
        page: e.page,
        key: e.key,
        value: drafts[e.id] ?? "",
        label: e.label,
        description: e.description,
        value_type: e.value_type,
      });
      toast.success("تم الحفظ");
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("حذف هذا المحتوى؟")) return;
    try {
      await cmsService.remove(id);
      toast.success("تم الحذف");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const create = async () => {
    if (!newEntry.page || !newEntry.key) {
      toast.error("الصفحة والمفتاح مطلوبان");
      return;
    }
    try {
      await cmsService.upsert(newEntry);
      toast.success("تمت الإضافة");
      setCreateOpen(false);
      setNewEntry({ page: "", key: "", value: "", label: "" });
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">إدارة المحتوى (CMS)</h1>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />إضافة محتوى</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>محتوى جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>الصفحة (page)</Label>
                <Input value={newEntry.page} onChange={(e) => setNewEntry({ ...newEntry, page: e.target.value })} placeholder="landing" />
              </div>
              <div>
                <Label>المفتاح (key)</Label>
                <Input value={newEntry.key} onChange={(e) => setNewEntry({ ...newEntry, key: e.target.value })} placeholder="hero_title" />
              </div>
              <div>
                <Label>التسمية</Label>
                <Input value={newEntry.label} onChange={(e) => setNewEntry({ ...newEntry, label: e.target.value })} />
              </div>
              <div>
                <Label>القيمة</Label>
                <Textarea value={newEntry.value} onChange={(e) => setNewEntry({ ...newEntry, value: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={create}><Save className="h-4 w-4 mr-1" />حفظ</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue={pages[0]}>
          <TabsList className="flex-wrap h-auto">
            {pages.map((p) => (
              <TabsTrigger key={p} value={p} className="capitalize">{p}</TabsTrigger>
            ))}
          </TabsList>
          {pages.map((p) => (
            <TabsContent key={p} value={p} className="space-y-3 mt-4">
              {entries
                .filter((e) => e.page === p)
                .map((e) => (
                  <Card key={e.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between gap-2">
                        <span>
                          {e.label || e.key}
                          <span className="text-xs text-muted-foreground font-mono mr-2 ms-2">{e.key}</span>
                        </span>
                        <Button variant="ghost" size="icon" onClick={() => remove(e.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Textarea
                        value={drafts[e.id] ?? ""}
                        onChange={(ev) => setDrafts({ ...drafts, [e.id]: ev.target.value })}
                        rows={2}
                      />
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          disabled={saving === e.id || drafts[e.id] === e.value}
                          onClick={() => save(e)}
                        >
                          {saving === e.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                          حفظ
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};

const CmsAdmin = () => (
  <RequirePermission permission="manage_content">
    <CmsAdminInner />
  </RequirePermission>
);

export default CmsAdmin;
