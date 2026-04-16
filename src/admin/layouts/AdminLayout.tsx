import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, Package, Users, TrendingUp, Settings,
  Menu, X, Shield, BookOpen, Tag, LayoutDashboard,
  ShoppingCart, FileText, LogOut, Ticket, Activity, ShieldCheck, FolderUp, Globe, ScanText, DollarSign,
  Bell, AlertTriangle, XCircle, Database, Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface SmartAlert {
  id: string;
  severity: "warning" | "critical";
  message: string;
  icon: string;
}

const navItems = [
  { path: "/admin", icon: LayoutDashboard, label: "لوحة التحكم" },
  { path: "/admin/products", icon: Package, label: "إدارة المنتجات" },
  { path: "/admin/categories", icon: Tag, label: "إدارة التصنيفات" },
  { path: "/admin/book-generation", icon: FolderUp, label: "الاستيراد الذكي" },
  { path: "/admin/web-search", icon: Globe, label: "بحث المصادر المفتوحة" },
  { path: "/admin/bulk-pdf", icon: FileText, label: "رفع PDF بالجملة" },
  { path: "/admin/doc-processor", icon: ScanText, label: "معالجة المستندات" },
  { path: "/admin/orders", icon: ShoppingCart, label: "الطلبات" },
  { path: "/admin/customers", icon: Users, label: "العملاء" },
  { path: "/admin/earnings", icon: TrendingUp, label: "الأرباح" },
  { path: "/admin/coupons", icon: Ticket, label: "كوبونات الخصم" },
  { path: "/admin/pages", icon: FileText, label: "إدارة الصفحات" },
  { path: "/admin/analytics", icon: BarChart3, label: "تحليلات المتجر" },
  { path: "/admin/health-check", icon: ShieldCheck, label: "فحص صحة النظام" },
  { path: "/admin/pricing", icon: DollarSign, label: "إدارة التسعير" },
  { path: "/admin/database", icon: Database, label: "مدير قاعدة البيانات" },
  { path: "/admin/sales", icon: Crown, label: "المبيعات والاشتراكات" },
  { path: "/admin/recommendations", icon: BookOpen, label: "التوصيات" },
  { path: "/admin/settings", icon: Settings, label: "الإعدادات" },
];

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const detectAlerts = useCallback(async () => {
    const detected: SmartAlert[] = [];

    const [jobsRes, noPdfRes, noCoverRes, zeroPriceRes] = await Promise.all([
      supabase.from("upload_jobs").select("id, status, updated_at"),
      supabase.from("products").select("id", { count: "exact", head: true }).or("pdf_url.is.null,pdf_url.eq."),
      supabase.from("products").select("id", { count: "exact", head: true }).or("image.is.null,image.eq.,image.eq./placeholder.svg"),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("price", 0).not("page_count", "is", null).gt("page_count", 0),
    ]);

    const jobs = jobsRes.data || [];
    const failedCount = jobs.filter(j => j.status === "error").length;
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const stuckCount = jobs.filter(j => j.status === "processing" && j.updated_at < tenMinAgo).length;

    if (failedCount > 0) {
      detected.push({ id: "failed_jobs", severity: failedCount >= 5 ? "critical" : "warning", message: `${failedCount} مهمة رفع فاشلة`, icon: "❌" });
    }
    if (stuckCount > 0) {
      detected.push({ id: "stuck_jobs", severity: "warning", message: `${stuckCount} مهمة عالقة أكثر من 10 دقائق`, icon: "⏳" });
    }
    if ((noPdfRes.count || 0) > 0) {
      detected.push({ id: "no_pdf", severity: "critical", message: `${noPdfRes.count} كتاب بدون ملف PDF`, icon: "📄" });
    }
    if ((noCoverRes.count || 0) > 0) {
      detected.push({ id: "no_cover", severity: "warning", message: `${noCoverRes.count} كتاب بدون غلاف`, icon: "🖼️" });
    }
    if ((zeroPriceRes.count || 0) > 0) {
      detected.push({ id: "zero_price", severity: "warning", message: `${zeroPriceRes.count} كتاب بسعر 0`, icon: "💰" });
    }

    setAlerts(detected);
  }, []);

  useEffect(() => {
    detectAlerts();
    const interval = setInterval(detectAlerts, 60_000);
    return () => clearInterval(interval);
  }, [detectAlerts]);

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex" dir="rtl">
      {/* Desktop Sidebar */}
      <aside
        className={`${sidebarCollapsed ? "w-[72px]" : "w-64"} hidden lg:flex flex-col transition-all duration-300 bg-card/50 backdrop-blur-xl`}
        style={{ borderLeft: '1px solid hsl(190 90% 50% / 0.15)' }}
      >
        <div className="p-4 flex items-center gap-3" style={{ borderBottom: '1px solid hsl(190 90% 50% / 0.12)' }}>
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0 shadow-glow-accent">
            <BookOpen className="w-5 h-5 text-accent-foreground" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-lg text-foreground leading-tight">
                HN <span className="text-primary">Book</span>
              </span>
              <span className="text-[10px] text-muted-foreground">لوحة التحكم</span>
            </div>
          )}
        </div>

        {!sidebarCollapsed && (
          <div className="p-4 flex items-center gap-3" style={{ borderBottom: '1px solid hsl(190 90% 50% / 0.12)' }}>
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center" style={{ border: '1px solid hsl(190 90% 50% / 0.3)' }}>
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">المدير</p>
              <p className="text-xs text-muted-foreground">مسؤول النظام</p>
            </div>
          </div>
        )}

        <nav className="flex-1 p-2.5 space-y-1 overflow-auto">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                isActive(item.path)
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              } ${sidebarCollapsed ? "justify-center px-2" : ""}`}
              style={isActive(item.path) ? { border: '1px solid hsl(190 90% 50% / 0.25)' } : { border: '1px solid transparent' }}
            >
              <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-3" style={{ borderTop: '1px solid hsl(190 90% 50% / 0.12)' }}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center px-3 py-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors text-xs"
          >
            {sidebarCollapsed ? "»" : "طي القائمة «"}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-[100] lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: 100 }}
              animate={{ x: 0 }}
              exit={{ x: 100 }}
              transition={{ type: "spring", damping: 25 }}
              className="absolute right-0 top-0 bottom-0 w-72 bg-card flex flex-col z-10 overflow-auto"
              style={{ borderLeft: '1px solid hsl(190 90% 50% / 0.15)' }}
            >
              <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid hsl(190 90% 50% / 0.12)' }}>
                <button onClick={() => setMobileOpen(false)} className="p-1 hover:bg-secondary rounded-lg">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shadow-glow-accent">
                    <BookOpen className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <span className="font-bold text-foreground">HN Book</span>
                </div>
              </div>
              <nav className="flex-1 p-3 space-y-1 overflow-auto">
                {navItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                      isActive(item.path)
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                    style={isActive(item.path) ? { border: '1px solid hsl(190 90% 50% / 0.25)' } : { border: '1px solid transparent' }}
                  >
                    <item.icon className="w-4.5 h-4.5" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        <header
          className="px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-40 bg-background/80 backdrop-blur-xl"
          style={{ borderBottom: '1px solid hsl(190 90% 50% / 0.12)' }}
        >
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1.5 hover:bg-secondary rounded-lg">
              <Menu className="w-5 h-5 text-muted-foreground" />
            </button>
            <h2 className="text-sm font-semibold text-foreground">
              {navItems.find((i) => isActive(i.path))?.label || "لوحة التحكم"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Alerts Bell */}
            <div className="relative">
              <button
                onClick={() => setAlertsOpen(!alertsOpen)}
                className="relative p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <Bell className={`w-4.5 h-4.5 ${alerts.filter(a => !dismissedAlerts.has(a.id)).length > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
                {alerts.filter(a => !dismissedAlerts.has(a.id)).length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-red-500 text-[9px] text-white font-bold flex items-center justify-center">
                    {alerts.filter(a => !dismissedAlerts.has(a.id)).length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {alertsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    className="absolute left-0 top-full mt-2 w-80 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                      <button onClick={() => setAlertsOpen(false)} className="p-1 hover:bg-secondary rounded">
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <h4 className="text-xs font-bold text-foreground">🔔 تنبيهات النظام</h4>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {alerts.length === 0 ? (
                        <div className="p-6 text-center">
                          <p className="text-xs text-muted-foreground">✅ لا توجد تنبيهات</p>
                        </div>
                      ) : (
                        alerts.map((alert) => (
                          <div
                            key={alert.id}
                            className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 ${
                              dismissedAlerts.has(alert.id) ? "opacity-40" : ""
                            } ${alert.severity === "critical" ? "bg-red-500/5" : ""}`}
                          >
                            <span className="text-lg mt-0.5">{alert.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <Badge className={`text-[9px] h-4 ${
                                  alert.severity === "critical" ? "bg-red-500/20 text-red-500" : "bg-yellow-500/20 text-yellow-500"
                                }`}>
                                  {alert.severity === "critical" ? "حرج" : "تحذير"}
                                </Badge>
                              </div>
                              <p className="text-xs text-foreground">{alert.message}</p>
                            </div>
                            {!dismissedAlerts.has(alert.id) && (
                              <button
                                onClick={() => setDismissedAlerts(prev => new Set([...prev, alert.id]))}
                                className="p-1 hover:bg-secondary rounded text-muted-foreground"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                    {alerts.length > 0 && (
                      <div className="px-4 py-2 border-t border-border">
                        <button
                          onClick={() => { navigate("/admin/health-check"); setAlertsOpen(false); }}
                          className="text-[11px] text-primary hover:underline w-full text-center"
                        >
                          فتح صفحة الإصلاح التلقائي →
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 border-glow"
              onClick={() => navigate("/")}
            >
              <BookOpen className="w-3.5 h-3.5" />
              عرض الموقع
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1.5 text-destructive hover:text-destructive"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/admin/login");
              }}
            >
              <LogOut className="w-3.5 h-3.5" />
              خروج
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
