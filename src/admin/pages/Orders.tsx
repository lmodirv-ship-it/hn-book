import { motion } from "framer-motion";
import { ShoppingCart, Clock, CheckCircle, AlertCircle } from "lucide-react";

const orders = [
  { id: "ORD-001", customer: "أحمد محمد", product: "Ultimate eBook Collection", amount: "$29.99", status: "مكتمل", date: "2026-04-13" },
  { id: "ORD-002", customer: "سارة علي", product: "Pro Design Templates", amount: "$49.99", status: "مكتمل", date: "2026-04-13" },
  { id: "ORD-003", customer: "خالد يوسف", product: "AI Mastery Course", amount: "$39.99", status: "معلق", date: "2026-04-13" },
  { id: "ORD-004", customer: "فاطمة حسن", product: "Business Growth Bundle", amount: "$59.99", status: "قيد التنفيذ", date: "2026-04-12" },
  { id: "ORD-005", customer: "عمر أمين", product: "Language Learning Pack", amount: "$19.99", status: "مكتمل", date: "2026-04-12" },
  { id: "ORD-006", customer: "ليلى سعيد", product: "Video Editing Masterclass", amount: "$34.99", status: "مكتمل", date: "2026-04-12" },
  { id: "ORD-007", customer: "يوسف كريم", product: "Graphic Design Bundle", amount: "$44.99", status: "معلق", date: "2026-04-11" },
  { id: "ORD-008", customer: "مريم أحمد", product: "Social Media Templates", amount: "$24.99", status: "مكتمل", date: "2026-04-11" },
];

const statusConfig: Record<string, { icon: any; color: string }> = {
  "مكتمل": { icon: CheckCircle, color: "text-green-400 bg-green-400/10" },
  "معلق": { icon: AlertCircle, color: "text-yellow-400 bg-yellow-400/10" },
  "قيد التنفيذ": { icon: Clock, color: "text-blue-400 bg-blue-400/10" },
};

const AdminOrders = () => (
  <div className="space-y-6" dir="rtl">
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-2xl font-extrabold text-foreground">🛒 إدارة الطلبات</h1>
      <p className="text-sm text-muted-foreground mt-0.5">{orders.length} طلب</p>
    </motion.div>

    {/* Summary Cards */}
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: "مكتمل", count: orders.filter(o => o.status === "مكتمل").length, color: "text-green-400" },
        { label: "معلق", count: orders.filter(o => o.status === "معلق").length, color: "text-yellow-400" },
        { label: "قيد التنفيذ", count: orders.filter(o => o.status === "قيد التنفيذ").length, color: "text-blue-400" },
      ].map((s) => (
        <div key={s.label} className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className={`text-2xl font-extrabold ${s.color}`}>{s.count}</p>
          <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
        </div>
      ))}
    </div>

    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">رقم الطلب</th>
              <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">العميل</th>
              <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">المنتج</th>
              <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">المبلغ</th>
              <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">التاريخ</th>
              <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const sc = statusConfig[order.status];
              const Icon = sc.icon;
              return (
                <tr key={order.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="py-3 px-4 font-mono text-xs text-primary">{order.id}</td>
                  <td className="py-3 px-4 font-medium text-foreground">{order.customer}</td>
                  <td className="py-3 px-4 text-muted-foreground">{order.product}</td>
                  <td className="py-3 px-4 font-semibold text-foreground">{order.amount}</td>
                  <td className="py-3 px-4 text-muted-foreground text-xs">{order.date}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full ${sc.color}`}>
                      <Icon className="w-3 h-3" />
                      {order.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  </div>
);

export default AdminOrders;
