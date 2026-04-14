import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Home, Maximize2, Minimize2, ZoomIn, ZoomOut,
  ChevronLeft, ChevronRight, List, Search, X, Headphones,
  Volume2, VolumeX, Settings, Bookmark
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type ResourceType = "pdf" | "text" | "image" | "embed";

const getResourceTypeFromUrl = (url?: string | null): ResourceType | null => {
  if (!url) return null;
  const cleanUrl = url.split("?")[0].toLowerCase();

  if (cleanUrl.endsWith(".pdf")) return "pdf";
  if (/\.(txt|md|csv|json|xml|html?)$/.test(cleanUrl)) return "text";
  if (/\.(png|jpe?g|webp|gif|svg|avif)$/.test(cleanUrl)) return "image";

  return null;
};

const getResourceTypeFromContentType = (contentType?: string | null): ResourceType | null => {
  const normalized = contentType?.toLowerCase() || "";

  if (normalized.includes("pdf")) return "pdf";
  if (normalized.startsWith("text/") || normalized.includes("json") || normalized.includes("xml")) return "text";
  if (normalized.startsWith("image/")) return "image";

  return null;
};

interface BookData {
  id: string;
  name: string;
  description: string | null;
  category: string;
  image: string | null;
  pdf_url: string | null;
  reference_code: string | null;
}

type ViewMode = "single" | "double" | "scroll";

const BookReader = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<BookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [resourceUrl, setResourceUrl] = useState<string | null>(null);
  const [resourceType, setResourceType] = useState<ResourceType | null>(null);
  const [pdfLoadError, setPdfLoadError] = useState(false);
  const [textContent, setTextContent] = useState("");

  // PDF state
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("double");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [pageFlipDir, setPageFlipDir] = useState<"left" | "right" | null>(null);
  const [isTTSPlaying, setIsTTSPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pageInputValue, setPageInputValue] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);

  // Responsive: use single page on mobile
  useEffect(() => {
    const checkWidth = () => {
      if (window.innerWidth < 768) {
        setViewMode("single");
      }
    };
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  useEffect(() => {
    let objectUrlToRevoke: string | null = null;

    const fetchBook = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from("products")
          .select("id, name, description, category, image, pdf_url, reference_code")
          .eq("is_active", true)
          .eq("id", id)
          .maybeSingle();

        if (!data) return;

        setBook(data);
        setResourceUrl(null);
        setResourceType(null);
        setTextContent("");

        if (!data.pdf_url) return;

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
        const isInternal = data.pdf_url.includes(supabaseUrl) || data.pdf_url.includes("supabase.co");
        const inferredType = getResourceTypeFromUrl(data.pdf_url);

        if (isInternal && (inferredType === "pdf" || inferredType === "image")) {
          setResourceUrl(data.pdf_url);
          setResourceType(inferredType);
          return;
        }

        const response = await fetch(
          isInternal ? data.pdf_url : `${supabaseUrl}/functions/v1/proxy-pdf`,
          isInternal
            ? undefined
            : {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: data.pdf_url }),
              }
        );

        if (!response.ok) {
          setResourceUrl(data.pdf_url);
          setResourceType(inferredType || "embed");
          return;
        }

        const detectedType = getResourceTypeFromContentType(response.headers.get("content-type")) || inferredType;

        if (detectedType === "text") {
          setTextContent(await response.text());
          setResourceType("text");
          return;
        }

        if (detectedType === "pdf" && isInternal) {
          setResourceUrl(data.pdf_url);
          setResourceType("pdf");
          return;
        }

        if (detectedType === "image" && isInternal) {
          setResourceUrl(data.pdf_url);
          setResourceType("image");
          return;
        }

        const blob = await response.blob();
        objectUrlToRevoke = URL.createObjectURL(blob);
        setResourceUrl(objectUrlToRevoke);
        setResourceType(detectedType || "embed");
      } finally {
        setLoading(false);
      }
    };

    fetchBook();

    return () => {
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
    };
  }, [id]);

  const onDocumentLoadSuccess = useCallback(({ numPages: total }: { numPages: number }) => {
    setNumPages(total);
  }, []);

  // In double mode, ensure currentPage is odd for proper spread
  const displayPage = useMemo(() => {
    if (viewMode === "double") {
      return currentPage % 2 === 0 ? currentPage - 1 : currentPage;
    }
    return currentPage;
  }, [currentPage, viewMode]);

  const goToPage = useCallback((page: number) => {
    const p = Math.max(1, Math.min(numPages, page));
    setCurrentPage(p);
  }, [numPages]);

  const nextPage = useCallback(() => {
    const step = viewMode === "double" ? 2 : 1;
    if (currentPage + step <= numPages) {
      setPageFlipDir("left");
      setCurrentPage(p => Math.min(numPages, p + step));
      setTimeout(() => setPageFlipDir(null), 400);
    }
  }, [currentPage, numPages, viewMode]);

  const prevPage = useCallback(() => {
    const step = viewMode === "double" ? 2 : 1;
    if (currentPage > 1) {
      setPageFlipDir("right");
      setCurrentPage(p => Math.max(1, p - step));
      setTimeout(() => setPageFlipDir(null), 400);
    }
  }, [currentPage, viewMode]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        // RTL: right = prev, left = next
        if (e.key === "ArrowRight") prevPage();
        else nextPage();
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [nextPage, prevPage]);

  // Touch/swipe for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      // RTL: swipe left = prev, swipe right = next
      if (diff > 0) prevPage();
      else nextPage();
    }
  };

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const toggleTTS = useCallback(() => {
    if (isTTSPlaying) {
      speechSynthesis.cancel();
      setIsTTSPlaying(false);
    } else {
      setIsTTSPlaying(true);
      // TTS would extract text from current page - placeholder
      const utterance = new SpeechSynthesisUtterance(`صفحة ${currentPage}`);
      utterance.lang = "ar";
      utterance.onend = () => setIsTTSPlaying(false);
      speechSynthesis.speak(utterance);
    }
  }, [isTTSPlaying, currentPage]);

  const handlePageInput = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInputValue);
    if (!isNaN(p)) goToPage(p);
    setPageInputValue("");
  };

  // Page dimensions
  const pageWidth = useMemo(() => {
    const baseWidth = viewMode === "double" ? 380 : 600;
    if (typeof window !== "undefined") {
      const maxW = window.innerWidth * (viewMode === "double" ? 0.42 : 0.85);
      return Math.min(baseWidth, maxW) * zoom;
    }
    return baseWidth * zoom;
  }, [viewMode, zoom]);

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <BookOpen className="w-10 h-10 text-emerald-400 animate-pulse" />
          <p className="text-gray-400 text-sm">جاري تحميل الكتاب...</p>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center gap-4" dir="rtl">
        <BookOpen className="w-12 h-12 text-gray-500" />
        <h1 className="text-xl font-bold text-white">الكتاب غير موجود</h1>
        <button onClick={() => navigate("/")} className="text-emerald-400 hover:underline text-sm">
          العودة للمتجر
        </button>
      </div>
    );
  }

  if (!book.pdf_url) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center gap-6 px-4" dir="rtl">
        <BookOpen className="w-12 h-12 text-gray-500" />
        <div className="text-center space-y-2">
          <h1 className="text-lg font-bold text-white">{book.name}</h1>
          <p className="text-gray-400 text-sm">لا يوجد ملف قابل للمطالعة</p>
        </div>
        <button onClick={() => navigate(`/product/${id}`)} className="text-emerald-400 hover:underline text-sm">
          العودة لصفحة المنتج
        </button>
      </div>
    );
  }

  const readerHeader = (
    <header className="flex-shrink-0 h-12 bg-[#16213e]/95 backdrop-blur border-b border-white/5 flex items-center justify-between px-3 z-50">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => navigate(`/product/${id}`)}
          className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 transition-colors"
        >
          <Home className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-1 min-w-0 max-w-[70%]">
        <p className="text-xs font-medium text-gray-300 truncate">{book.name}</p>
        <span className="text-[10px] text-gray-500 flex-shrink-0">
          {book.category} · {book.reference_code}
        </span>
      </div>

      <div className="w-8" />
    </header>
  );

  if (resourceType === "text") {
    return (
      <div className="h-screen bg-[#1a1a2e] flex flex-col overflow-hidden" dir="rtl">
        {readerHeader}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <article className="mx-auto max-w-4xl rounded-2xl border border-white/5 bg-[#16213e] p-5 text-sm leading-8 text-gray-200 whitespace-pre-wrap sm:p-8">
            {textContent}
          </article>
        </div>
      </div>
    );
  }

  if (resourceType === "image" && resourceUrl) {
    return (
      <div className="h-screen bg-[#1a1a2e] flex flex-col overflow-hidden" dir="rtl">
        {readerHeader}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center">
          <img src={resourceUrl} alt={book.name} className="max-h-full max-w-full rounded-2xl shadow-2xl" />
        </div>
      </div>
    );
  }

  if (resourceType === "embed" && resourceUrl) {
    return (
      <div className="h-screen bg-[#1a1a2e] flex flex-col overflow-hidden" dir="rtl">
        {readerHeader}
        <div className="flex-1 p-2 sm:p-4">
          <iframe
            src={resourceUrl}
            title={book.name}
            className="h-full w-full rounded-2xl border border-white/5 bg-white"
          />
        </div>
      </div>
    );
  }

  if (!resourceUrl) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
    const isLocalFile = book.pdf_url?.includes(supabaseUrl) || book.pdf_url?.includes("supabase.co");

    return (
      <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center gap-6 px-4" dir="rtl">
        <BookOpen className="w-12 h-12 text-gray-500" />
        <div className="text-center space-y-2">
          <h1 className="text-lg font-bold text-white">{book.name}</h1>
          {isLocalFile ? (
            <p className="text-gray-400 text-sm">تعذر تحميل الملف من الخادم — يرجى المحاولة لاحقاً</p>
          ) : (
            <div className="space-y-1">
              <p className="text-gray-400 text-sm">هذا الكتاب يعتمد على رابط خارجي غير متاح حالياً</p>
              <p className="text-gray-500 text-xs">الملف لم يُخزّن محلياً أثناء الاستيراد — يمكن إعادة استيراده من لوحة التحكم</p>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate(`/product/${id}`)} className="text-emerald-400 hover:underline text-sm">
            العودة لصفحة المنتج
          </button>
          {book.pdf_url && (
            <a href={book.pdf_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm">
              فتح الرابط الخارجي ↗
            </a>
          )}
        </div>
      </div>
    );
  }

  const progress = numPages > 0 ? (currentPage / numPages) * 100 : 0;

  return (
    <div className="h-screen bg-[#1a1a2e] flex flex-col overflow-hidden select-none" dir="rtl">
      {/* Top Header */}
      <header className="flex-shrink-0 h-12 bg-[#16213e]/95 backdrop-blur border-b border-white/5 flex items-center justify-between px-3 z-50">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(`/product/${id}`)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 transition-colors"
          >
            <Home className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 transition-colors"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 min-w-0 max-w-[50%]">
          <p className="text-xs font-medium text-gray-300 truncate">{book.name}</p>
          <span className="text-[10px] text-gray-500 flex-shrink-0">
            {book.category} · {book.reference_code}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => navigate(`/product/${id}`)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400">
            <Bookmark className="w-4 h-4" />
          </button>
          <button onClick={toggleFullscreen} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hidden sm:block">
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Search Bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-[#16213e] border-b border-white/5 overflow-hidden z-40"
          >
            <div className="flex items-center gap-2 px-4 py-2">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="بحث في الكتاب..."
                className="flex-1 bg-white/5 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-gray-500 outline-none border border-white/10 focus:border-emerald-500/50"
                autoFocus
              />
              <button onClick={() => { setShowSearch(false); setSearchText(""); }} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar - Table of Contents */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-[#16213e] border-l border-white/5 overflow-y-auto flex-shrink-0 z-30"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white">فهرس الصفحات</h3>
                  <button onClick={() => setShowSidebar(false)} className="text-gray-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-1 max-h-[calc(100vh-180px)] overflow-y-auto">
                  {Array.from({ length: Math.min(numPages, 50) }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => { goToPage(page); setShowSidebar(false); }}
                      className={`w-full text-right px-3 py-2 rounded-lg text-sm transition-colors ${
                        page === currentPage
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "text-gray-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      صفحة {page}
                    </button>
                  ))}
                  {numPages > 50 && (
                    <p className="text-gray-500 text-xs text-center py-2">
                      ... و {numPages - 50} صفحة أخرى
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Book display area */}
        <div
          ref={containerRef}
          className="flex-1 flex items-center justify-center relative overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Page navigation arrows */}
          <button
            onClick={nextPage}
            disabled={currentPage >= numPages}
            className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-3 rounded-full bg-black/30 hover:bg-black/50 text-white/70 hover:text-white disabled:opacity-20 transition-all backdrop-blur-sm"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <button
            onClick={prevPage}
            disabled={currentPage <= 1}
            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-3 rounded-full bg-black/30 hover:bg-black/50 text-white/70 hover:text-white disabled:opacity-20 transition-all backdrop-blur-sm"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Book shadow/glow effect */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="rounded-2xl opacity-30"
              style={{
                width: viewMode === "double" ? pageWidth * 2 + 20 : pageWidth + 20,
                height: pageWidth * 1.4 + 20,
                boxShadow: "0 0 80px 20px rgba(16, 185, 129, 0.08), 0 25px 60px -12px rgba(0,0,0,0.5)",
              }}
            />
          </div>

          {/* Pages container */}
          <Document
            file={resourceUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={() => setPdfLoadError(true)}
            loading={
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                <p className="text-gray-400 text-sm">جاري تحميل الكتاب...</p>
              </div>
            }
            error={
              <div className="flex flex-col items-center gap-4 text-center px-4">
                <BookOpen className="w-12 h-12 text-gray-500" />
                <p className="text-gray-300 font-medium">تعذر عرض هذا الملف — قد يكون تالفاً أو بصيغة غير مدعومة</p>
                <p className="text-gray-500 text-xs max-w-md">يمكنك محاولة فتحه مباشرة في نافذة جديدة أو العودة لصفحة المنتج</p>
                <div className="flex gap-3">
                  <a
                    href={resourceUrl || book?.pdf_url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:underline text-sm"
                  >
                    فتح في نافذة جديدة ↗
                  </a>
                  <button onClick={() => navigate(`/product/${id}`)} className="text-blue-400 hover:underline text-sm">
                    العودة لصفحة المنتج
                  </button>
                </div>
              </div>
            }
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={displayPage}
                initial={{
                  rotateY: pageFlipDir === "left" ? -15 : pageFlipDir === "right" ? 15 : 0,
                  opacity: 0.7,
                  scale: 0.97,
                }}
                animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                exit={{
                  rotateY: pageFlipDir === "left" ? 15 : -15,
                  opacity: 0.7,
                  scale: 0.97,
                }}
                transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="flex"
                style={{ perspective: "1200px" }}
              >
                {viewMode === "double" ? (
                  <div className="flex shadow-2xl rounded-lg overflow-hidden">
                    {/* Right page (RTL) */}
                    <div
                      className="bg-[#f5f0e8] relative"
                      style={{
                        boxShadow: "inset -4px 0 12px rgba(0,0,0,0.08)",
                      }}
                    >
                      <Page
                        pageNumber={displayPage}
                        width={pageWidth}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        className="book-page"
                      />
                      {/* Page fold effect */}
                      <div
                        className="absolute inset-y-0 left-0 w-8 pointer-events-none"
                        style={{
                          background: "linear-gradient(to right, rgba(0,0,0,0.06), transparent)",
                        }}
                      />
                    </div>

                    {/* Center spine */}
                    <div className="w-[3px] bg-gradient-to-b from-[#8B7355] via-[#6B5940] to-[#8B7355] flex-shrink-0 shadow-inner" />

                    {/* Left page (RTL) */}
                    {displayPage + 1 <= numPages && (
                      <div
                        className="bg-[#f5f0e8] relative"
                        style={{
                          boxShadow: "inset 4px 0 12px rgba(0,0,0,0.08)",
                        }}
                      >
                        <Page
                          pageNumber={displayPage + 1}
                          width={pageWidth}
                          renderTextLayer={true}
                          renderAnnotationLayer={true}
                          className="book-page"
                        />
                        {/* Page fold effect */}
                        <div
                          className="absolute inset-y-0 right-0 w-8 pointer-events-none"
                          style={{
                            background: "linear-gradient(to left, rgba(0,0,0,0.06), transparent)",
                          }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="shadow-2xl rounded-lg overflow-hidden bg-[#f5f0e8]">
                    <Page
                      pageNumber={displayPage}
                      width={pageWidth}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      className="book-page"
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </Document>
        </div>
      </div>

      {/* Bottom Toolbar */}
      <div className="flex-shrink-0 bg-[#16213e]/95 backdrop-blur border-t border-white/5 z-50">
        {/* Progress bar */}
        <div className="h-1 bg-white/5 relative cursor-pointer group"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            goToPage(Math.round(ratio * numPages));
          }}
        >
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300 relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-400 shadow-lg shadow-emerald-500/30 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-3 h-12">
          {/* Left: Page info */}
          <div className="flex items-center gap-2">
            <form onSubmit={handlePageInput} className="flex items-center gap-1">
              <span className="text-[11px] text-gray-400">صفحة</span>
              <input
                type="text"
                value={pageInputValue || displayPage}
                onChange={(e) => setPageInputValue(e.target.value)}
                onFocus={() => setPageInputValue(String(displayPage))}
                onBlur={() => setPageInputValue("")}
                className="w-10 bg-white/5 rounded px-1.5 py-0.5 text-xs text-center text-white border border-white/10 outline-none focus:border-emerald-500/50"
              />
              <span className="text-[11px] text-gray-500">({numPages})</span>
            </form>
          </div>

          {/* Center: Main controls */}
          <div className="flex items-center gap-1">
            {/* Zoom */}
            <button
              onClick={() => setZoom(z => Math.max(0.5, z - 0.15))}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 transition-colors"
              title="تصغير"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[11px] text-gray-400 min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(2.5, z + 0.15))}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 transition-colors"
              title="تكبير"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-white/10 mx-1" />

            {/* Page navigation */}
            <button
              onClick={nextPage}
              disabled={currentPage >= numPages}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={prevPage}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-white/10 mx-1" />

            {/* TTS */}
            <button
              onClick={toggleTTS}
              className={`p-1.5 rounded-lg transition-colors ${isTTSPlaying ? "bg-emerald-500/20 text-emerald-400" : "hover:bg-white/10 text-gray-400"}`}
              title="قراءة صوتية"
            >
              {isTTSPlaying ? <Volume2 className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
            </button>
          </div>

          {/* Right: View modes */}
          <div className="flex items-center gap-0.5 bg-white/5 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("single")}
              className={`p-1.5 rounded transition-colors ${viewMode === "single" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"}`}
              title="صفحة واحدة"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="6" y="3" width="12" height="18" rx="1" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("double")}
              className={`p-1.5 rounded transition-colors hidden sm:block ${viewMode === "double" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"}`}
              title="صفحتين"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="9" height="18" rx="1" />
                <rect x="13" y="3" width="9" height="18" rx="1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Custom styles */}
      <style>{`
        .book-page canvas {
          display: block !important;
        }
        .book-page .react-pdf__Page__textContent {
          user-select: text;
        }
        .book-page .react-pdf__Page__annotations {
          pointer-events: auto;
        }
      `}</style>
    </div>
  );
};

export default BookReader;
