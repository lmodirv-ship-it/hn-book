import { motion } from "framer-motion";
import { Users, Mail, ShoppingBag } from "lucide-react";

const customers = [
  { name: "أحمد محمد", email: "ahmed@email.com", orders: 5, spent: "$189.95", joined: "2026-03-01" },
  { name: "سارة علي", email: "sara@email.com", orders: 3, spent: "$124.97", joined: "2026-03-05" },
  { name: "خالد يوسف", email: "khaled@email.com", orders: 8, spent: "$342.92", joined: "2026-02-15" },
  { name: "فاطمة حسن", email: "fatima@email.com", orders: 2, spent: "$79.98", joined: "2026-03-20" },
  { name: "عمر أمين", email: "omar@email.com", orders: 12, spent: "$498.88", joined: "2026-01-10" },
  { name: "ليلى سعيد", email: "layla@email.com", orders: 4, spent: "$159.96", joined: "2026-03-12" },
];

const AdminCustomers = () => (
  <div className="space-y-6" dir="rtl">
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-2xl font-extrabold text-foreground">👥 العملاء</h1>
      <p className="text-sm text-muted-foreground mt-0.5">{customers.length} عميل مسجل</p>
    </motion.div>

    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">العميل</th>
              <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">البريد</th>
              <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">الطلبات</th>
              <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">الإنفاق</th>
              <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">تاريخ التسجيل</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {c.name[0]}
                    </div>
                    <span className="font-medium text-foreground">{c.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-muted-foreground text-xs">{c.email}</td>
                <td className="py-3 px-4 font-semibold text-foreground">{c.orders}</td>
                <td className="py-3 px-4 font-semibold text-primary">{c.spent}</td>
                <td className="py-3 px-4 text-muted-foreground text-xs">{c.joined}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  </div>
);

export default AdminCustomers;
