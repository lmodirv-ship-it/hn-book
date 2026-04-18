/**
 * /templates — premium asset gallery.
 * Black & gold theme, sectioned layout (Featured / New / Popular), hover overlays
 * with Edit / Order actions, dropdown filter, and CTA header.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Search, Edit3, Printer, Sparkles, Flame, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Heuristic style inference from a template's name/description. */
type StyleFilter = "all" | "modern" | "classic" | "luxury";
const STYLE_HINTS: Record<Exclude<StyleFilter, "all">, RegExp> = {
  modern: /(modern|minimal|clean|flat|عصري|حديث|بسيط)/i,
  classic: /(classic|vintage|retro|كلاسيك|تراث|قديم)/i,
  luxury: /(luxury|premium|gold|elegant|royal|فاخر|ذهب|راقي)/i,
};
const inferStyle = (a: { title: string; description?: string | null }): Exclude<StyleFilter, "all"> | null => {
  const hay = `${a.title} ${a.description ?? ""}`;
  for (const [style, re] of Object.entries(STYLE_HINTS)) {
    if (re.test(hay)) return style as Exclude<StyleFilter, "all">;
  }
  return null;
};
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import {
  assetService,
  ASSET_TYPE_META,
  ASSET_CATEGORIES,
  type Asset,
  type AssetType,
  type AssetCategory,
} from "@/services/assetService";
import { getRouteFor } from "@/lib/asset-registry";

type CategoryFilter = AssetCategory | "all";
type TypeFilter = AssetType | "all";

const TemplatesGallery = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [editableAssetIds, setEditableAssetIds] = useState<Set<string>>(new Set());
  const [editableTemplateIds, setEditableTemplateIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();

  // Initial filters from URL (?type=FNT or ?category=DSN)
  const urlType = (searchParams.get("type") as TypeFilter) || "all";
  const urlCat = (searchParams.get("category") as CategoryFilter) || "all";
  const urlStyle = (searchParams.get("style") as StyleFilter) || "all";
  const [category, setCategory] = useState<CategoryFilter>(urlCat);
  const [type, setType] = useState<TypeFilter>(urlType);
  const [style, setStyle] = useState<StyleFilter>(urlStyle);

  // Keep URL in sync so links/share work.
  useEffect(() => {
    const next = new URLSearchParams();
    if (category !== "all") next.set("category", category);
    if (type !== "all") next.set("type", type);
    if (style !== "all") next.set("style", style);
    setSearchParams(next, { replace: true });
  }, [category, type, style, setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [list, tplRes] = await Promise.all([
          assetService.list({ limit: 200 }),
          supabase.from("svg_templates" as never).select("id,asset_id").eq("is_active", true),
        ]);
        if (cancelled) return;
        const tpls = (tplRes.data as Array<{ id: string; asset_id: string | null }>) || [];
        setEditableAssetIds(new Set(tpls.map((t) => t.asset_id).filter(Boolean) as string[]));
        setEditableTemplateIds(new Set(tpls.map((t) => t.id)));
        setAssets(list.filter((a) => a.is_active));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((a) => {
      if (category !== "all" && a.category !== category) return false;
      if (type !== "all" && a.asset_type !== type) return false;
      if (style !== "all" && inferStyle(a) !== style) return false;
      if (q && !a.title.toLowerCase().includes(q) && !(a.code || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [assets, search, category, type, style]);

  // "Suggested" = a curated mix not affected by current filters (always shown).
  const suggested = useMemo(
    () => [...assets].sort(() => Math.random() - 0.5).slice(0, 4),
    [assets],
  );

  // Derive sections from the filtered set (no schema changes needed)
  const featured = useMemo(() => filtered.slice(0, 8), [filtered]);
  const newItems = useMemo(
    () => [...filtered].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 8),
    [filtered],
  );
  const popular = useMemo(() => {
    // Heuristic until a real popularity metric exists: stable hash on id.
    return [...filtered]
      .sort((a, b) => (a.id < b.id ? 1 : -1))
      .slice(0, 8);
  }, [filtered]);

  const visibleTypes = useMemo<AssetType[]>(() => {
    return (Object.keys(ASSET_TYPE_META) as AssetType[]).filter((t) =>
      category === "all" ? true : ASSET_TYPE_META[t].category === category,
    );
  }, [category]);

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <Navbar />

      <main className="flex-1">
        {/* Premium hero */}
        <section className="relative overflow-hidden border-b border-border/40">
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, hsl(var(--primary)) 0, transparent 40%), radial-gradient(circle at 80% 60%, hsl(var(--primary)) 0, transparent 35%)",
            }}
          />
          <div className="relative container mx-auto px-4 py-14 md:py-20 text-center space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/40 bg-primary/10 text-primary text-[11px] font-medium tracking-wide">
              <Sparkles className="w-3 h-3" /> HN Studio · Premium Templates
            </div>
            <h1 className="text-4xl md:text-6xl font-semibold text-foreground">
              معرض القوالب <span className="text-primary">الذهبية</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              تصاميم احترافية جاهزة للتعديل والطباعة. ابدأ مشروعك خلال دقائق.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Button asChild size="lg" className="gap-2 shadow-lg shadow-primary/20">
                <Link to="/studio/templates">
                  <Sparkles className="w-4 h-4" /> ابدأ التصميم
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="container mx-auto px-4 pt-8 pb-2">
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بالاسم أو الكود..."
                className="pr-10 h-11 bg-card/60 border-border/60"
              />
            </div>

            <div className="flex gap-2 md:gap-3">
              <Select
                value={category}
                onValueChange={(v) => { setCategory(v as CategoryFilter); setType("all"); }}
              >
                <SelectTrigger className="h-11 min-w-[160px] bg-card/60 border-border/60">
                  <SelectValue placeholder="الفئة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الفئات</SelectItem>
                  {(Object.keys(ASSET_CATEGORIES) as AssetCategory[]).map((c) => (
                    <SelectItem key={c} value={c}>{ASSET_CATEGORIES[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={type} onValueChange={(v) => setType(v as TypeFilter)}>
                <SelectTrigger className="h-11 min-w-[160px] bg-card/60 border-border/60">
                  <SelectValue placeholder="النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأنواع</SelectItem>
                  {visibleTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ASSET_TYPE_META[t].emoji} {ASSET_TYPE_META[t].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={style} onValueChange={(v) => setStyle(v as StyleFilter)}>
                <SelectTrigger className="h-11 min-w-[140px] bg-card/60 border-border/60">
                  <SelectValue placeholder="النمط" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأنماط</SelectItem>
                  <SelectItem value="modern">✨ عصري</SelectItem>
                  <SelectItem value="classic">📜 كلاسيكي</SelectItem>
                  <SelectItem value="luxury">👑 فاخر</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Sections */}
        {loading ? (
          <div className="container mx-auto px-4 py-10 space-y-10">
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="container mx-auto my-16 py-16 text-center text-muted-foreground bg-card/40">
            لا توجد تصاميم حالياً
          </Card>
        ) : (
          <div className="container mx-auto px-4 py-10 space-y-14">
            <SectionRow title="القوالب المميزة" icon={Sparkles} items={featured} editableIds={editableAssetIds} />
            <SectionRow title="جديدنا" icon={Clock} items={newItems} editableIds={editableAssetIds} />
            <SectionRow title="الأكثر طلبًا" icon={Flame} items={popular} editableIds={editableAssetIds} />
            <SectionRow title="تصاميم مقترحة" icon={Sparkles} items={suggested} editableIds={editableAssetIds} />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

const SectionRow = ({
  title, icon: Icon, items, editableIds,
}: { title: string; icon: typeof Sparkles; items: Asset[]; editableIds: Set<string> }) => {
  if (items.length === 0) return null;
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-2.5">
        <Icon className="w-5 h-5 text-primary" />
        <h2 className="text-2xl md:text-3xl font-semibold text-foreground">{title}</h2>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent via-primary/30 to-transparent ms-3" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {items.map((a) => <PremiumCard key={a.id} asset={a} editable={editableIds.has(a.id)} />)}
      </div>
    </section>
  );
};

const PremiumCard = ({ asset }: { asset: Asset }) => {
  const meta = ASSET_TYPE_META[asset.asset_type];
  const navigate = useNavigate();
  const location = useLocation();
  // Inside Studio, always route to the studio editor; elsewhere fall back
  // to the asset-type-specific route (book reader, tablou page, etc.).
  // Editable design types always open in the Studio editor.
  // Non-editable assets (books, tablou) fall back to their dedicated route.
  const editableTypes = new Set(["CRD", "TPL", "LOG", "FLY", "PST", "IMG", "ART"]);
  const isEditable = editableTypes.has(asset.asset_type);
  const inStudio = location.pathname.startsWith("/studio");
  const editHref = inStudio || isEditable
    ? `/studio/editor/${asset.id}?from=${inStudio ? "studio" : "templates"}`
    : getRouteFor(asset.asset_type, asset.id);

  const goToEditor = () => {
    console.log("[TemplateCard] navigate →", editHref, { id: asset.id, type: asset.asset_type });
    navigate(editHref);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={goToEditor}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goToEditor(); } }}
      className="group relative cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-xl transition-transform duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/20"
    >
      {/* Subtle gold glow on hover */}
      <div className="absolute -inset-px rounded-xl bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/40 group-hover:to-primary/10 transition-all duration-500 blur-sm" />

      <div className="relative rounded-xl overflow-hidden bg-card border border-border/60 group-hover:border-primary/50 transition-all duration-300">
        <div className="relative aspect-[4/5] overflow-hidden bg-muted">
          <img
            src={asset.image_url}
            alt={asset.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />

          {/* Type chip */}
          <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-background/80 backdrop-blur text-[10px] font-medium text-foreground border border-border/60">
            <span className="me-1">{meta.emoji}</span>{meta.label}
          </div>

          {/* Hover overlay */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 gap-2"
          >
            <Button asChild size="sm" className="w-full gap-1.5 shadow-lg shadow-primary/30">
              <Link to={editHref}>
                <Edit3 className="w-3.5 h-3.5" /> تعديل التصميم
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="w-full gap-1.5 border-primary/40 text-foreground hover:bg-primary/10">
              <Link to={editHref}>
                <Printer className="w-3.5 h-3.5" /> اطلب الطباعة
              </Link>
            </Button>
          </div>
        </div>

        {/* Title */}
        <div className="px-4 py-3 text-center">
          <h3 className="text-sm font-medium text-foreground line-clamp-1">{asset.title}</h3>
          {asset.code && (
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">{asset.code}</p>
          )}
        </div>
      </div>
    </div>
  );
};

/** Loading placeholder mirroring SectionRow's grid for a smooth perceived load. */
const SkeletonRow = () => (
  <section className="space-y-5">
    <Skeleton className="h-7 w-48" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden border border-border/60 bg-card">
          <Skeleton className="aspect-[4/5] w-full rounded-none" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-3/4 mx-auto" />
            <Skeleton className="h-3 w-1/3 mx-auto" />
          </div>
        </div>
      ))}
    </div>
  </section>
);

export default TemplatesGallery;
