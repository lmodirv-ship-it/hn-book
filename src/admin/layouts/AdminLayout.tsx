import { useState, useEffect } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, Package, Users, TrendingUp, Settings,
  Menu, X, Shield, BookOpen, Tag, LayoutDashboard,
  ShoppingCart, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { path: "/admin", icon: LayoutDashboard, label: "لوحة التحكم" },
  { path: "/admin/products", icon: Package, label: "إدارة المنتجات" },
  { path: "/admin/orders", icon: ShoppingCart, label: "الطلبات" },
  { path: "/admin/customers", icon: Users, label: "العملاء" },
  { path: "/admin/earnings", icon: TrendingUp, label: "الأرباح" },
  { path: "/admin/categories", icon: Tag, label: "التصنيفات" },
  { path: "/admin/pages", icon: FileText, label: "إدارة الصفحات" },
  { path: "/admin/settings", icon: Settings, label: "الإعدادات" },
];

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
        className={`${sidebarCollapsed ? "w-[72px]" : "w-64"} border-l border-border hidden lg:flex flex-col transition-all duration-300 bg-card/50 backdrop-blur-xl`}
      >
        <div className="p-4 flex items-center gap-3 border-b border-border">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-primary-foreground" />
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
          <div className="p-4 border-b border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
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
                  ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              } ${sidebarCollapsed ? "justify-center px-2" : ""}`}
            >
              <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-border">
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
              className="absolute right-0 top-0 bottom-0 w-72 bg-card border-l border-border flex flex-col z-10 overflow-auto"
            >
              <div className="p-4 flex items-center justify-between border-b border-border">
                <button onClick={() => setMobileOpen(false)} className="p-1 hover:bg-secondary rounded-lg">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-primary-foreground" />
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
        <header className="border-b border-border px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-40 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1.5 hover:bg-secondary rounded-lg">
              <Menu className="w-5 h-5 text-muted-foreground" />
            </button>
            <h2 className="text-sm font-semibold text-foreground">
              {navItems.find((i) => isActive(i.path))?.label || "لوحة التحكم"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => navigate("/")}
            >
              <BookOpen className="w-3.5 h-3.5" />
              عرض الموقع
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
