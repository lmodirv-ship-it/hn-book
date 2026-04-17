/**
 * /studio — Studio landing.
 * Premium grid of all asset categories. Each card links to /templates pre-filtered
 * by asset type (e.g. /templates?type=FNT for fonts).
 */
import { Link } from "react-router-dom";
import { Sparkles, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  ASSET_TYPE_META,
  ASSET_CATEGORIES,
  type AssetType,
  type AssetCategory,
} from "@/services/assetService";

// Visual order: design first, then media, fonts, docs, other.
const TYPE_ORDER: AssetType[] = [
  "CRD", "FLY", "PST", "LOG", "TPL",
  "TSH", "RES", "THM", "ICN",
  "IMG", "ART", "VFX", "PRE",
  "FNT",
  "DOC", "LST", "OTH",
];

const StudioHome = () => {
  // Group types by category for sectioned display.
  const byCategory = TYPE_ORDER.reduce<Record<AssetCategory, AssetType[]>>(
    (acc, t) => {
      const c = ASSET_TYPE_META[t].category;
      (acc[c] ||= []).push(t);
      return acc;
    },
    {} as Record<AssetCategory, AssetType[]>,
  );

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/40">
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, hsl(var(--primary)) 0, transparent 40%), radial-gradient(circle at 80% 60%, hsl(var(--primary)) 0, transparent 35%)",
            }}
          />
          <div className="relative container mx-auto px-4 py-14 md:py-20 text-center space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/40 bg-primary/10 text-primary text-[11px] font-medium tracking-wide">
              <Sparkles className="w-3 h-3" /> HN Studio · كل ما تحتاجه للتصميم
            </div>
            <h1 className="text-4xl md:text-6xl font-semibold text-foreground">
              منصة <span className="text-primary">الأصول الرقمية</span> الموحّدة
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              بطاقات، فلاير، شعارات، خطوط، بريسيتات، مؤثرات فيديو، تيشيرتات، ثيمات وأكثر.
              اختر فئتك وابدأ مباشرة.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Button asChild size="lg" className="gap-2">
                <Link to="/templates">
                  <Sparkles className="w-4 h-4" /> تصفّح كل الأصول
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="container mx-auto px-4 py-12 space-y-12">
          {(Object.keys(byCategory) as AssetCategory[]).map((cat) => (
            <div key={cat} className="space-y-5">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
                  {ASSET_CATEGORIES[cat]}
                </h2>
                <span className="h-px flex-1 bg-gradient-to-l from-transparent via-primary/30 to-transparent" />
                <Link
                  to={`/templates?category=${cat}`}
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  عرض الكل <ArrowLeft className="w-3 h-3" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {byCategory[cat].map((type) => {
                  const meta = ASSET_TYPE_META[type];
                  return (
                    <Link
                      key={type}
                      to={`/templates?type=${type}`}
                      className="group relative rounded-xl border border-border/60 bg-card hover:border-primary/60 transition-all duration-300 overflow-hidden p-5 flex flex-col items-center text-center gap-3 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-0.5"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-primary/0 transition-opacity duration-500" />
                      <div className="relative w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300">
                        {meta.emoji}
                      </div>
                      <div className="relative">
                        <h3 className="text-sm font-semibold text-foreground">{meta.label}</h3>
                        <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">{type}</p>
                      </div>
                      <span className="relative text-[11px] text-primary opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1">
                        تصفّح <ArrowLeft className="w-3 h-3" />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default StudioHome;
