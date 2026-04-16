import { useState, useEffect } from "react";
import {
  Printer, Eye, Loader2, Search, Filter, Truck, Clock, Package, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { printService, PAPER_TYPES, PRINT_TYPES, type PrintOrder } from "@/services/printService";
import { toast } from "@/hooks/use-toast";

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "قيد الانتظار", color: "bg-yellow-500/15 text-yellow-500", icon: Clock },
  printing: { label: "جاري الطباعة", color: "bg-blue-500/15 text-blue-500", icon: Printer },
  shipped: { label: "تم الشحن", color: "bg-purple-500/15 text-purple-500", icon: Truck },
  delivered: { label: "تم التوصيل", color: "bg-emerald-500/15 text-emerald-500", icon: CheckCircle2 },
};

const STATUSES = ["pending", "printing", "shipped", "delivered"];

const PrintOrdersAdmin = () => {
  const [orders, setOrders] = useState<PrintOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [detail, setDetail] = useState<PrintOrder | null>(null);

  const fetchOrders = async () => {
    const data = await printService.getAllOrders();
    setOrders(data);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const filtered = orders.filter(o => {
    if (filterStatus !== "all" && o.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return o.customer_name.toLowerCase().includes(q) || o.phone.includes(q);
    }
    return true;
  });

  const updateStatus = async (id: string, status: string) => {
    await printService.updateOrderStatus(id, status);
    toast({ title: "تم تحديث الحالة ✅" });
    fetchOrders();
  };

  return (
    <div className="space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Printer className="w-6 h-6 text-primary" /> طلبات الطباعة
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATUSES.map(s => {
          const info = STATUS_MAP[s];
          const Icon = info.icon;
          const count = orders.filter(o => o.status === s).length;
          return (
            <div key={s} className="rounded-xl border border-border bg-card/60 p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${info.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{count}</p>
                <p className="text-xs text-muted-foreground">{info.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث بالاسم أو الهاتف..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
        </div>
        <Select value={filterStatus} onValueChange={v => setFilterStatus(v)}>
          <SelectTrigger className="w-[150px]"><Filter className="w-4 h-4 ml-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_MAP[s].label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Printer className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-semibold">لا توجد طلبات</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>العميل</TableHead>
                <TableHead>التصميم</TableHead>
                <TableHead>الكمية</TableHead>
                <TableHead>السعر</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-center">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(o => {
                const info = STATUS_MAP[o.status] || STATUS_MAP.pending;
                return (
                  <TableRow key={o.id}>
                    <TableCell>
                      <p className="font-medium text-foreground">{o.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{o.phone}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {o.template && <img src={o.template.image_url} alt="" className="w-10 h-6 rounded object-cover" />}
                        <span className="text-sm">{o.template?.name || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell>{o.quantity}</TableCell>
                    <TableCell className="font-semibold">{o.total_price} د.م</TableCell>
                    <TableCell>
                      <Select value={o.status} onValueChange={v => updateStatus(o.id, v)}>
                        <SelectTrigger className="h-8 w-[130px]">
                          <Badge className={`${info.color} text-[10px]`}>{info.label}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_MAP[s].label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" onClick={() => setDetail(o)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>تفاصيل الطلب</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              {detail.template && (
                <img src={detail.template.image_url} alt="" className="w-full h-32 rounded-xl object-cover" />
              )}
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">التصميم</span><span className="font-medium">{detail.template?.name}</span>
                <span className="text-muted-foreground">الكمية</span><span className="font-medium">{detail.quantity}</span>
                <span className="text-muted-foreground">الورق</span><span className="font-medium">{PAPER_TYPES.find(p => p.value === detail.paper_type)?.label}</span>
                <span className="text-muted-foreground">الطباعة</span><span className="font-medium">{PRINT_TYPES.find(p => p.value === detail.print_type)?.label}</span>
                <span className="text-muted-foreground">السعر</span><span className="font-bold text-primary">{detail.total_price} د.م</span>
              </div>
              <hr className="border-border" />
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">الاسم</span><span className="font-medium">{detail.customer_name}</span>
                <span className="text-muted-foreground">الهاتف</span><span className="font-medium">{detail.phone}</span>
                <span className="text-muted-foreground">العنوان</span><span className="font-medium">{detail.address}, {detail.city}</span>
                <span className="text-muted-foreground">البلد</span><span className="font-medium">{detail.country}</span>
              </div>
              {detail.notes && (
                <>
                  <hr className="border-border" />
                  <div>
                    <span className="text-muted-foreground block mb-1">ملاحظات</span>
                    <p className="text-foreground">{detail.notes}</p>
                  </div>
                </>
              )}
              <p className="text-xs text-muted-foreground">{new Date(detail.created_at).toLocaleString("ar")}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrintOrdersAdmin;
