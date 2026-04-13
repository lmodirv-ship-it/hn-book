import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen, Home, Maximize2, Minimize2, ZoomIn, ZoomOut,
  RotateCw, ExternalLink, AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface BookData {
  id: string;
  name: string;
  description: string | null;
  category: string;
  image: string | null;
  pdf_url: string | null;
  reference_code: string | null;
}

const BookReader = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<BookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [iframeError, setIframeError] = useState(false);

  useEffect(() => {
    const fetchBook = async () => {
      if (!id) { setLoading(false); return; }

      const { data } = await supabase
        .from("products")
        .select("id, name, description, category, image, pdf_url, reference_code")
        .eq("id", id)
        .maybeSingle();

      if (!data) { setLoading(false); return; }
      setBook(data);

      // Priority: pdf_url on product → then product_files table
      if (data.pdf_url) {
        setPdfUrl(data.pdf_url);
      } else {
        const { data: files } = await supabase
          .from("product_files")
          .select("public_url, file_name")
          .eq("product_id", data.id)
          .or("file_type.eq.pdf,file_name.ilike.%.pdf")
          .limit(1);

        if (files && files.length > 0) {
          setPdfUrl(files[0].public_url);
        }
      }
      setLoading(false);
    };
    fetchBook();
  }, [id]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handleZoomIn = () => setZoom((z) => Math.min(200, z + 25));
  const handleZoomOut = () => setZoom((z) => Math.max(50, z - 25));
  const handleResetZoom = () => setZoom(100);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <BookOpen className="w-10 h-10 text-primary animate-pulse" />
          <p className="text-muted-foreground text-sm">جاري تحميل الكتاب...</p>
        </div>
      </div>
    );
  }

  // Book not found
  if (!book) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4" dir="rtl">
        <BookOpen className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-xl font-bold text-foreground">الكتاب غير موجود</h1>
        <Button asChild variant="outline">
          <Link to="/">العودة للمتجر</Link>
        </Button>
      </div>
    );
  }

  // No PDF available
  if (!pdfUrl) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-4" dir="rtl">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-lg font-bold text-foreground">{book.name}</h1>
          <p className="text-muted-foreground text-sm">
            لا يوجد ملف PDF متاح للمطالعة لهذا المنتج
          </p>
          {book.reference_code && (
            <p className="text-xs text-muted-foreground/60">
              المرجع: {book.reference_code}
            </p>
          )}
        </div>
        <Button asChild variant="outline">
          <Link to={`/product/${id}`}>العودة لصفحة المنتج</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-card/80 border-b border-border">
        <div className="flex items-center justify-between px-3 sm:px-4 h-14">
          {/* Right side - navigation */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => navigate(`/product/${id}`)}
              className="p-2 rounded-lg hover:bg-secondary/50 text-muted-foreground transition-colors flex-shrink-0"
              title="العودة"
            >
              <Home className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate text-foreground">
                {book.name}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {book.category}
                {book.reference_code && ` · ${book.reference_code}`}
              </p>
            </div>
          </div>

          {/* Center - zoom controls */}
          <div className="hidden sm:flex items-center gap-1 bg-secondary/30 rounded-lg p-1">
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded hover:bg-secondary text-muted-foreground transition-colors"
              title="تصغير"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs text-muted-foreground min-w-[3rem] text-center font-medium">
              {zoom}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded hover:bg-secondary text-muted-foreground transition-colors"
              title="تكبير"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 rounded hover:bg-secondary text-muted-foreground transition-colors"
              title="إعادة الحجم"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Left side - actions */}
          <div className="flex items-center gap-1">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-secondary/50 text-muted-foreground transition-colors"
              title="فتح في نافذة جديدة"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg hover:bg-secondary/50 text-muted-foreground transition-colors hidden sm:block"
              title={isFullscreen ? "إلغاء ملء الشاشة" : "ملء الشاشة"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto bg-secondary/10">
        {iframeError ? (
          // Fallback when iframe fails
          <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] gap-6 px-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-foreground font-semibold">تعذر عرض الكتاب هنا</p>
              <p className="text-muted-foreground text-sm">يمكنك فتح الكتاب في نافذة جديدة</p>
            </div>
            <Button asChild>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
                <ExternalLink className="w-4 h-4" />
                فتح الكتاب
              </a>
            </Button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-[calc(100vh-56px)] flex items-start justify-center"
          >
            <iframe
              src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
              className="border-0"
              style={{
                width: `${zoom}%`,
                height: "100%",
                maxWidth: "100vw",
                background: "white",
              }}
              title={book.name}
              allowFullScreen
              onError={() => setIframeError(true)}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default BookReader;
