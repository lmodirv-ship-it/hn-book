/**
 * /admin/studio — Studio management hub inside the admin dashboard.
 * Aggregates shortcuts to all Studio-related admin sections (templates, SVG,
 * card designs, logos, assets, print orders) so admins manage Studio in place
 * without leaving HN Book admin.
 */
import { Link } from "react-router-dom";
import { LayoutTemplate, CreditCard, Image as ImageIcon, Frame, Printer, Sparkles, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const sections = [
  { to: "/admin/svg-templates", icon: LayoutTemplate, title: "قوالب SVG", desc: "إدارة قوالب الاستوديو القابلة للتعديل." },
  { to: "/admin/card-templates", icon: CreditCard, title: "تصاميم البطاقات", desc: "بطاقات الزيارة وقوالب العميل." },
  { to: "/admin/logos", icon: ImageIcon, title: "مكتبة الشعارات", desc: "الشعارات المتاحة داخل المحرر." },
  { to: "/admin/assets", icon: Frame, title: "مدير الأصول", desc: "كل الصور/الملفات المستخدمة في الاستوديو." },
  { to: "/admin/print-orders", icon: Printer, title: "طلبات الطباعة", desc: "طلبات قادمة من محرر الاستوديو." },
];

const StudioAdmin = () => {
  return (
    <div className="space-y-6" dir="rtl">
      <header className="space-y-1">
        <div className="inline-flex items-center gap-2 text-primary text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" /> HN Studio
        </div>
        <h1 className="text-2xl font-bold text-foreground">إدارة الاستوديو</h1>
        <p className="text-sm text-muted-foreground">
          مركز موحّد لإدارة قوالب الاستوديو، الأصول، والطلبات. الاستوديو يعمل تحت نفس النطاق ونفس الحساب.
        </p>
        <div className="pt-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/studio" target="_blank" rel="noopener">
              <ExternalLink className="w-3.5 h-3.5" /> فتح واجهة الاستوديو
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((s) => (
          <Link key={s.to} to={s.to} className="group">
            <Card className="h-full hover:border-primary/50 transition">
              <CardContent className="p-5 space-y-2">
                <s.icon className="w-6 h-6 text-primary" />
                <h3 className="font-semibold text-foreground group-hover:text-primary transition">{s.title}</h3>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default StudioAdmin;
