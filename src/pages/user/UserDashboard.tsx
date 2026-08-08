import { Link } from "react-router-dom";
import { useHnIdentity } from "@/hooks/useHnIdentity";
import HnStatsBar from "@/components/HnStatsBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, ShoppingBag, CreditCard, BookOpen, Palette } from "lucide-react";

const links = [
  { to: "/my-orders", label: "طلباتي", icon: ShoppingBag },
  { to: "/billing", label: "الاشتراك والرصيد", icon: CreditCard },
  { to: "/books", label: "مكتبتي", icon: BookOpen },
  { to: "/studio", label: "الاستوديو", icon: Palette },
  { to: "/profile", label: "ملفي الشخصي", icon: User },
];

const UserDashboard = () => {
  const { loading, role, email } = useHnIdentity();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (role === "guest") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background" dir="rtl">
        <p className="text-foreground font-bold">سجّل الدخول للوصول إلى لوحتك.</p>
        <Button asChild><Link to="/auth">تسجيل الدخول</Link></Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6" dir="rtl">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">لوحتي</h1>
          <p className="text-xs text-muted-foreground">{email}</p>
        </div>
        <Badge variant="secondary">{role}</Badge>
      </header>

      <HnStatsBar />

      <Card>
        <CardHeader><CardTitle>الخدمات</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="glass-future rounded-xl p-4 flex items-center gap-3 hover:opacity-90">
              <div className="icon-chip icon-chip-blue"><l.icon className="w-4 h-4" /></div>
              <span className="text-sm font-semibold text-foreground">{l.label}</span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserDashboard;
