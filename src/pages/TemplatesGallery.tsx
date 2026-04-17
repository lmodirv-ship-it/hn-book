/**
 * /templates — unified asset gallery.
 * Lists all assets from the `assets` table with type/category filters and search.
 * Each card shows type-aware actions (edit / order / view / download) based on the registry.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Loader2, Download, Edit3, Eye, Printer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  assetService,
  ASSET_TYPE_META,
  ASSET_CATEGORIES,
  type Asset,
  type AssetType,
  type AssetCategory,
} from "@/services/assetService";
import { getCapabilities, getRouteFor } from "@/lib/asset-registry";

type CategoryFilter = AssetCategory | "all";

const ACTION_ICONS = { edit: Edit3, order: Printer, view: Eye, download: Download } as const;

const TemplatesGallery = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [type, setType] = useState<AssetType | "all">("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await assetService.list({ limit: 200 });
        if (!cancelled) setAssets(list.filter((a) => a.is_active));
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
      if (q && !a.title.toLowerCase().includes(q) && !(a.code || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [assets, search, category, type]);

  // Types available within the current category filter
  const visibleTypes = useMemo<AssetType[]>(() => {
    return (Object.keys(ASSET_TYPE_META) as AssetType[]).filter((t) =>
      category === "all" ? true : ASSET_TYPE_META[t].category === category,
    );
  }, [category]);

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">معرض القوالب والأصول</h1>
          <p className="text-muted-foreground">تصفح وحرّر أو حمّل التصاميم والوسائط والوثائق المتاحة.</p>
        </header>

        {/* Search + category tabs */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative max-w-md w-full">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو الكود..."
              className="pr-10"
            />
          </div>

          <Tabs value={category} onValueChange={(v) => { setCategory(v as CategoryFilter); setType("all"); }}>
            <TabsList>
              <TabsTrigger value="all">الكل</TabsTrigger>
              {(Object.keys(ASSET_CATEGORIES) as AssetCategory[]).map((c) => (
                <TabsTrigger key={c} value={c}>{ASSET_CATEGORIES[c]}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Type chips */}
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={type === "all" ? "default" : "secondary"}
            className="cursor-pointer"
            onClick={() => setType("all")}
          >
            كل الأنواع
          </Badge>
          {visibleTypes.map((t) => (
            <Badge
              key={t}
              variant={type === t ? "default" : "secondary"}
              className="cursor-pointer gap-1"
              onClick={() => setType(t)}
            >
              <span>{ASSET_TYPE_META[t].emoji}</span> {ASSET_TYPE_META[t].label}
            </Badge>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="py-16 text-center text-muted-foreground">
            لا توجد عناصر مطابقة.
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((a) => (
              <AssetGridCard key={a.id} asset={a} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

const AssetGridCard = ({ asset }: { asset: Asset }) => {
  const cap = getCapabilities(asset.asset_type);
  const meta = ASSET_TYPE_META[asset.asset_type];
  const primaryHref = getRouteFor(asset.asset_type, asset.id);

  return (
    <Card className="overflow-hidden group hover:border-primary/40 transition">
      <Link to={primaryHref} className="block aspect-[4/3] bg-muted relative overflow-hidden">
        <img
          src={asset.image_url}
          alt={asset.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <Badge className="absolute top-2 right-2 gap-1" variant="secondary">
          <span>{meta.emoji}</span> {meta.label}
        </Badge>
      </Link>
      <CardContent className="p-3 space-y-2">
        <div>
          <h3 className="font-semibold text-sm line-clamp-1 text-foreground">{asset.title}</h3>
          {asset.code && <p className="text-[10px] text-muted-foreground font-mono">{asset.code}</p>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {cap.actions.map((action) => {
            const Icon = ACTION_ICONS[action];
            // Edit/order/view all route to the primary entry; download links to file_url if present.
            if (action === "download" && asset.file_url) {
              return (
                <Button key={action} asChild size="sm" variant="outline" className="h-7 text-xs gap-1 flex-1 min-w-[80px]">
                  <a href={asset.file_url} target="_blank" rel="noopener noreferrer" download>
                    <Icon className="w-3 h-3" /> تحميل
                  </a>
                </Button>
              );
            }
            const labels: Record<typeof action, string> = {
              edit: "تعديل", order: "اطلب طباعة", view: "عرض", download: "تحميل",
            };
            return (
              <Button
                key={action}
                asChild
                size="sm"
                variant={action === "edit" || action === "order" ? "default" : "outline"}
                className="h-7 text-xs gap-1 flex-1 min-w-[80px]"
              >
                <Link to={primaryHref}>
                  <Icon className="w-3 h-3" /> {labels[action]}
                </Link>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default TemplatesGallery;
