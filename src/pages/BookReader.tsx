import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen, Home, Maximize2, Minimize2, ZoomIn, ZoomOut,
  ChevronLeft, ChevronRight, Download, RotateCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface BookData {
  id: string;
  name: string;
  description: string | null;
  category: string;
  image: string | null;
  pdf_url: string | null;
}

const BookReader = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<BookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchBook = async () => {
      if (!id) return;
      const { data } = await supabase
        .from("products")
        .select("id, name, description, category, image, pdf_url")
        .eq("id", id)
        .single();
      setBook(data);

      // Try to get PDF from product_files if no direct pdf_url
      if (data && !data.pdf_url) {
        const { data: files } = await supabase
          .from("product_files")
          .select("public_url")
          .eq("product_id", data.id)
          .eq("file_type", "pdf")
          .limit(1);
        if (files && files.length > 0) {
          setPdfUrl(files[0].public_url);
        }
      } else if (data?.pdf_url) {
        setPdfUrl(data.pdf_url);
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

  if (!book) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <BookOpen className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-xl font-bold text-foreground">الكتاب غير موجود</h1>
        <Button asChild variant="outline">
          <Link to="/">العودة للمتجر</Link>
        </Button>
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4" dir="rtl">
        <BookOpen className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-lg font-bold text-foreground">{book.name}</h1>
        <p className="text-muted-foreground text-sm">لا يوجد ملف PDF متاح لهذا الكتاب</p>
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
        <div className="flex items-center justify-between px-4 h-14">
          {/* Right side - navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/product/${id}`)}
              className="p-2 rounded-lg hover:bg-secondary/50 text-muted-foreground transition-colors"
              title="العودة"
            >
              <Home className="w-4 h-4" />
            </button>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold truncate max-w-[300px] text-foreground">
                {book.name}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {book.category}
              </p>
            </div>
          </div>

          {/* Center - zoom controls */}
          <div className="flex items-center gap-1 bg-secondary/30 rounded-lg p-1">
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
              title="تحميل"
            >
              <Download className="w-4 h-4" />
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
      <div className="flex-1 overflow-auto bg-secondary/20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full h-[calc(100vh-56px)] flex items-center justify-center"
        >
          <iframe
            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
            className="border-0 shadow-2xl"
            style={{
              width: `${zoom}%`,
              height: "100%",
              maxWidth: "100vw",
              background: "white",
            }}
            title={book.name}
            allowFullScreen
          />
        </motion.div>
      </div>
    </div>
  );
};

export default BookReader;
