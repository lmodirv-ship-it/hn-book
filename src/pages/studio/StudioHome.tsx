/**
 * /studio — Studio landing.
 * Entry point for the design studio (templates, editors). Shares auth/db/admin
 * with the rest of the platform; lives under the same domain.
 */
import { Link } from "react-router-dom";
import { Sparkles, LayoutTemplate, Wand2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const StudioHome = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 space-y-10">
        <header className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> HN Studio
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground">استوديو التصميم</h1>
          <p className="text-muted-foreground">
            صمّم بطاقاتك، قوالبك ومطبوعاتك مباشرة من نفس حسابك في HN Book.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Button asChild size="lg">
              <Link to="/studio/templates"><LayoutTemplate className="w-4 h-4" /> تصفح القوالب</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/templates"><Wand2 className="w-4 h-4" /> كل الأصول</Link>
            </Button>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: LayoutTemplate, title: "قوالب جاهزة", desc: "بطاقات، شعارات، فلايرز جاهزة للتعديل." },
            { icon: Wand2, title: "محرر متقدم", desc: "خصّص النصوص والصور والألوان بسهولة." },
            { icon: Sparkles, title: "حساب موحّد", desc: "نفس تسجيل الدخول والمشتريات في HN Book." },
          ].map((f) => (
            <Card key={f.title} className="hover:border-primary/40 transition">
              <CardContent className="p-5 space-y-2">
                <f.icon className="w-6 h-6 text-primary" />
                <h3 className="font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default StudioHome;
