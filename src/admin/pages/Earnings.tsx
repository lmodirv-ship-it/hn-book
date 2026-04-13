import { motion } from "framer-motion";
import { DollarSign, TrendingUp, CreditCard, Wallet } from "lucide-react";

const months = [
  { month: "يناير", revenue: 2340, orders: 78 },
  { month: "فبراير", revenue: 3120, orders: 104 },
  { month: "مارس", revenue: 4560, orders: 152 },
  { month: "أبريل", revenue: 2847, orders: 95 },
];

const AdminEarnings = () => {
  const totalRevenue = months.reduce((s, m) => s + m.revenue, 0);
  const totalOrders = months.reduce((s, m) => s + m.orders, 0);
  const maxRevenue = Math.max(...months.map(m => m.revenue));

  return (
    <div className="space-y-6" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-extrabold text-foreground">💰 الأرباح</h1>
        <p className="text-sm text-muted-foreground mt-0.5">نظرة عامة على الإيرادات</p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: DollarSign, label: "إجمالي الإيرادات", value: `$${totalRevenue.toLocaleString()}`, color: "text-primary" },
          { icon: CreditCard, label: "إجمالي الطلبات", value: totalOrders.toString(), color: "text-blue-400" },
          { icon: Wallet, label: "متوسط قيمة الطلب", value: `$${(totalRevenue / totalOrders).toFixed(2)}`, color: "text-yellow-400" },
          { icon: TrendingUp, label: "النمو الشهري", value: "+23%", color: "text-green-400" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <stat.icon className={`w-5 h-5 ${stat.color} mb-3`} />
            <p className="text-2xl font-extrabold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-bold text-foreground mb-6">الإيرادات الشهرية</h3>
        <div className="flex items-end gap-6 h-48">
          {months.map((m) => {
            const pct = (m.revenue / maxRevenue) * 100;
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-semibold text-foreground">${m.revenue}</span>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${pct}%` }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="w-full max-w-[48px] rounded-t-xl bg-gradient-to-t from-primary/60 to-primary"
                />
                <span className="text-xs text-muted-foreground">{m.month}</span>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default AdminEarnings;
