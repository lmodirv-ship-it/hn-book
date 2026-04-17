/**
 * /viewer/:id — lightweight viewer for non-editable assets (IMG/ART/DOC/PRE/LST/OTH).
 * Renders an image preview or embedded PDF and a download button.
 * Editable types are redirected to /editor/:id automatically.
 */
import { useEffect, useState } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { Loader2, Download, ArrowRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { ASSET_TYPE_META, type Asset } from "@/services/assetService";
import { getCapabilities } from "@/lib/asset-registry";

const isPdf = (url: string | null | undefined) =>
  !!url && /\.pdf($|\?)/i.test(url);

const AssetViewer = () => {
  const { id } = useParams<{ id: string }>();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("assets" as never)
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (!data) setNotFound(true);
      else setAsset(data as unknown as Asset);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !asset) {
    return <Navigate to="/templates" replace />;
  }

  // Redirect editable assets to the editor.
  const cap = getCapabilities(asset.asset_type);
  if (cap.editable) {
    return <Navigate to={`/editor/${asset.id}`} replace />;
  }

  const meta = ASSET_TYPE_META[asset.asset_type];
  const downloadUrl = asset.file_url || asset.image_url;
  const showPdf = isPdf(downloadUrl);

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link to="/templates"><ArrowRight className="w-4 h-4" /> رجوع للمعرض</Link>
          </Button>
          <Badge variant="secondary" className="gap-1">
            <span>{meta.emoji}</span> {meta.label}
          </Badge>
        </div>

        <header className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{asset.title}</h1>
          {asset.code && <p className="text-xs text-muted-foreground font-mono">{asset.code}</p>}
          {asset.description && <p className="text-sm text-muted-foreground max-w-2xl">{asset.description}</p>}
        </header>

        <Card className="overflow-hidden bg-muted/20">
          {showPdf ? (
            <iframe
              src={downloadUrl!}
              title={asset.title}
              className="w-full h-[70vh] bg-white"
            />
          ) : (
            <div className="flex items-center justify-center min-h-[400px] p-4">
              <img
                src={asset.image_url}
                alt={asset.title}
                loading="lazy"
                className="max-w-full max-h-[70vh] object-contain rounded"
              />
            </div>
          )}
        </Card>

        <div className="flex flex-wrap gap-3">
          {downloadUrl && (
            <Button asChild className="gap-1.5">
              <a href={downloadUrl} target="_blank" rel="noopener noreferrer" download>
                <Download className="w-4 h-4" /> تحميل
              </a>
            </Button>
          )}
          {asset.file_url && asset.file_url !== asset.image_url && (
            <Button asChild variant="outline" className="gap-1.5">
              <a href={asset.image_url} target="_blank" rel="noopener noreferrer" download>
                <FileText className="w-4 h-4" /> تحميل المعاينة
              </a>
            </Button>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AssetViewer;
