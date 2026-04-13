import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface Customer {
  id: string;
  name: string;
  email: string;
  total_orders: number | null;
  total_spent: number | null;
  created_at: string;
}

const AdminCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      const { data } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });
      setCustomers(data || []);
      setLoading(false);
    };
    fetchCustomers();
  }, []);

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
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {c.name[0]}
                      </div>
                      <span className="font-medium text-foreground">{c.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-xs">{c.email}</td>
                  <td className="py-3 px-4 font-semibold text-foreground">{c.total_orders || 0}</td>
                  <td className="py-3 px-4 font-semibold text-primary">${(c.total_spent || 0).toFixed(2)}</td>
                  <td className="py-3 px-4 text-muted-foreground text-xs">{new Date(c.created_at).toLocaleDateString("ar-MA")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminCustomers;
