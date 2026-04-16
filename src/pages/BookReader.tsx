import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import ReaderHeader from "@/components/reader/ReaderHeader";
import ReaderSidebar from "@/components/reader/ReaderSidebar";
import ReaderToolbar from "@/components/reader/ReaderToolbar";
import ReaderSearchBar from "@/components/reader/ReaderSearchBar";
import { useBookmarks } from "@/components/reader/useBookmarks";
import { useReadingProgress } from "@/components/reader/useReadingProgress";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type ResourceType = "pdf" | "text" | "image" | "embed";
type ViewMode = "single" | "double" | "scroll";

const getResourceTypeFromUrl = (url?: string | null): ResourceType | null => {
  if (!url) return null;
  const c = url.split("?")[0].toLowerCase();
  if (c.endsWith(".pdf")) return "pdf";
  if (/\.(txt|md|csv|json|xml|html?)$/.test(c)) return "text";
  if (/\.(png|jpe?g|webp|gif|svg|avif)$/.test(c)) return "image";
  return null;
};

const getResourceTypeFromContentType = (ct?: string | null): ResourceType | null => {
  const n = ct?.toLowerCase() || "";
  if (n.includes("pdf")) return "pdf";
  if (n.startsWith("text/") || n.includes("json") || n.includes("xml")) return "text";
  if (n.startsWith("image/")) return "image";
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

const BookReader = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<BookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [resourceUrl, setResourceUrl] = useState<string | null>(null);
  const [resourceType, setResourceType] = useState<ResourceType | null>(null);
  const [textContent, setTextContent] = useState("");
  const [pdfDocument, setPdfDocument] = useState<any>(null);

  // Reader state
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("double");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [isTTSPlaying, setIsTTSPlaying] = useState(false);
  const [pageInputValue, setPageInputValue] = useState("");
  const [pageFlipDir, setPageFlipDir] = useState<"left" | "right" | null>(null);
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Hooks
  const { bookmarks, addBookmark, removeBookmark, isBookmarked } = useBookmarks(id);
  const { getSaved, save, restored, setRestored } = useReadingProgress(id);

  // Responsive
  useEffect(() => {
    const check = () => { if (window.innerWidth < 768) setViewMode("single"); };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Restore reading progress once PDF is loaded
  useEffect(() => {
    if (numPages > 0 && !restored) {
      const saved = getSaved();
      if (saved) {
        setCurrentPage(Math.min(saved.page, numPages));
        setZoom(saved.zoom || 1);
        if (saved.viewMode && window.innerWidth >= 768) {
          setViewMode(saved.viewMode as ViewMode);
        }
      }
      setRestored(true);
    }
  }, [numPages, restored, getSaved, setRestored]);

  // Auto-save progress
  useEffect(() => {
    if (numPages > 0 && currentPage > 0 && restored) {
      save(currentPage, zoom, viewMode);
    }
  }, [currentPage, zoom, viewMode, numPages, restored, save]);

  // Fetch book data
  useEffect(() => {
    let objectUrlToRevoke: string | null = null;
    const fetchBook = async () => {
      if (!id) { setLoading(false); return; }
      try {
        const { data } = await supabase
          .from("products")
          .select("id, name, description, category, image, pdf_url, reference_code")
          .eq("is_active", true)
          .eq("id", id)
          .maybeSingle();

        if (!data) return;
        setBook(data);
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
          isInternal ? undefined : {
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

        if ((detectedType === "pdf" || detectedType === "image") && isInternal) {
          setResourceUrl(data.pdf_url);
          setResourceType(detectedType);
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
    return () => { if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke); };
  }, [id]);

  const onDocumentLoadSuccess = useCallback((result: any) => {
    setNumPages(result.numPages);
    setPdfDocument(result);
  }, []);

  const displayPage = useMemo(() => {
    if (viewMode === "double") return currentPage % 2 === 0 ? currentPage - 1 : currentPage;
    return currentPage;
  }, [currentPage, viewMode]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(numPages, page)));
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

  // Keyboard nav
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") prevPage();
      else if (e.key === "ArrowLeft") nextPage();
      else if (e.key === "f" || e.key === "F") toggleFullscreen();
      else if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [nextPage, prevPage]);

  // Touch
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { if (diff > 0) prevPage(); else nextPage(); }
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
      const utterance = new SpeechSynthesisUtterance(`صفحة ${currentPage}`);
      utterance.lang = "ar";
      utterance.onend = () => setIsTTSPlaying(false);
      speechSynthesis.speak(utterance);
    }
  }, [isTTSPlaying, currentPage]);

  const pageWidth = useMemo(() => {
    const baseWidth = viewMode === "double" ? 380 : viewMode === "scroll" ? 700 : 600;
    if (typeof window !== "undefined") {
      const factor = viewMode === "double" ? 0.42 : 0.85;
      return Math.min(baseWidth, window.innerWidth * factor) * zoom;
    }
    return baseWidth * zoom;
  }, [viewMode, zoom]);

  // Theme colors
  const readerBg = isDarkTheme ? "bg-[#1a1a2e]" : "bg-[#f0ece4]";
  const pageBg = isDarkTheme ? "bg-[#f5f0e8]" : "bg-white";
  const textColor = isDarkTheme ? "text-white" : "text-gray-800";
  const subTextColor = isDarkTheme ? "text-gray-400" : "text-gray-500";
  const linkColor = isDarkTheme ? "text-emerald-400" : "text-primary";

  // Simple reusable header for non-PDF views
  const simpleHeader = (
    <header className={`flex-shrink-0 h-12 ${isDarkTheme ? "bg-[#16213e]/95" : "bg-white/95"} backdrop-blur border-b ${isDarkTheme ? "border-white/5" : "border-gray-200"} flex items-center justify-between px-3 z-50`}>
      <button onClick={() => navigate(`/product/${id}`)} className={`p-1.5 rounded-lg ${subTextColor} hover:opacity-80`}>
        <BookOpen className="w-4 h-4" />
      </button>
      <p className={`text-xs font-medium ${textColor} truncate`}>{book?.name}</p>
      <div className="w-8" />
    </header>
  );

  // Loading
  if (loading) {
    return (
      <div className={`min-h-screen ${readerBg} flex items-center justify-center`}>
        <div className="flex flex-col items-center gap-4">
          <BookOpen className="w-10 h-10 text-emerald-400 animate-pulse" />
          <p className={`${subTextColor} text-sm`}>جاري تحميل الكتاب...</p>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className={`min-h-screen ${readerBg} flex flex-col items-center justify-center gap-4`} dir="rtl">
        <BookOpen className="w-12 h-12 text-gray-500" />
        <h1 className={`text-xl font-bold ${textColor}`}>الكتاب غير موجود</h1>
        <button onClick={() => navigate("/")} className={`${linkColor} hover:underline text-sm`}>العودة للمتجر</button>
      </div>
    );
  }

  if (!book.pdf_url) {
    return (
      <div className={`min-h-screen ${readerBg} flex flex-col items-center justify-center gap-6 px-4`} dir="rtl">
        <BookOpen className="w-12 h-12 text-gray-500" />
        <div className="text-center space-y-2">
          <h1 className={`text-lg font-bold ${textColor}`}>{book.name}</h1>
          <p className={`${subTextColor} text-sm`}>لا يوجد ملف قابل للمطالعة</p>
        </div>
        <button onClick={() => navigate(`/product/${id}`)} className={`${linkColor} hover:underline text-sm`}>العودة لصفحة المنتج</button>
      </div>
    );
  }

  // Text resource
  if (resourceType === "text") {
    return (
      <div className={`h-screen ${readerBg} flex flex-col overflow-hidden`} dir="rtl">
        {simpleHeader}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <article className={`mx-auto max-w-4xl rounded-2xl border ${isDarkTheme ? "border-white/5 bg-[#16213e]" : "border-gray-200 bg-white"} p-5 text-sm leading-8 ${isDarkTheme ? "text-gray-200" : "text-gray-700"} whitespace-pre-wrap sm:p-8`}>
            {textContent}
          </article>
        </div>
      </div>
    );
  }

  // Image resource
  if (resourceType === "image" && resourceUrl) {
    return (
      <div className={`h-screen ${readerBg} flex flex-col overflow-hidden`} dir="rtl">
        {simpleHeader}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center">
          <img src={resourceUrl} alt={book.name} className="max-h-full max-w-full rounded-2xl shadow-2xl" />
        </div>
      </div>
    );
  }

  // Embed fallback
  if (resourceType === "embed" && resourceUrl) {
    return (
      <div className={`h-screen ${readerBg} flex flex-col overflow-hidden`} dir="rtl">
        {simpleHeader}
        <div className="flex-1 p-2 sm:p-4">
          <iframe src={resourceUrl} title={book.name} className={`h-full w-full rounded-2xl border ${isDarkTheme ? "border-white/5" : "border-gray-200"} bg-white`} />
        </div>
      </div>
    );
  }

  // No resource URL fallback
  if (!resourceUrl) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
    const isLocalFile = book.pdf_url?.includes(supabaseUrl) || book.pdf_url?.includes("supabase.co");
    return (
      <div className={`min-h-screen ${readerBg} flex flex-col items-center justify-center gap-6 px-4`} dir="rtl">
        <BookOpen className="w-12 h-12 text-gray-500" />
        <div className="text-center space-y-2">
          <h1 className={`text-lg font-bold ${textColor}`}>{book.name}</h1>
          {isLocalFile ? (
            <p className={`${subTextColor} text-sm`}>تعذر تحميل الملف من الخادم — يرجى المحاولة لاحقاً</p>
          ) : (
            <p className={`${subTextColor} text-sm`}>هذا الكتاب يعتمد على رابط خارجي غير متاح حالياً</p>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate(`/product/${id}`)} className={`${linkColor} hover:underline text-sm`}>العودة لصفحة المنتج</button>
          {book.pdf_url && (
            <a href={book.pdf_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm">فتح الرابط الخارجي ↗</a>
          )}
        </div>
      </div>
    );
  }

  // === PDF READER ===
  const glowColor = isDarkTheme ? "rgba(16, 185, 129, 0.08)" : "rgba(0, 0, 0, 0.05)";
  const arrowBg = isDarkTheme ? "bg-black/30 hover:bg-black/50 text-white/70 hover:text-white" : "bg-white/70 hover:bg-white text-gray-600 hover:text-gray-900 shadow-md";

  // Scroll mode pages to render (lazy)
  const scrollPages = useMemo(() => {
    if (viewMode !== "scroll") return [];
    return Array.from({ length: numPages }, (_, i) => i + 1);
  }, [viewMode, numPages]);

  return (
    <div className={`h-screen ${readerBg} flex flex-col overflow-hidden select-none`} dir="rtl">
      {/* Header */}
      <ReaderHeader
        bookId={book.id}
        bookName={book.name}
        category={book.category}
        referenceCode={book.reference_code}
        isFullscreen={isFullscreen}
        showSidebar={showSidebar}
        showSearch={showSearch}
        isBookmarked={isBookmarked(currentPage)}
        isDarkTheme={isDarkTheme}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        onToggleSearch={() => setShowSearch(!showSearch)}
        onToggleFullscreen={toggleFullscreen}
        onToggleBookmark={() => {
          if (isBookmarked(currentPage)) removeBookmark(currentPage);
          else addBookmark(currentPage);
        }}
        onToggleTheme={() => setIsDarkTheme(!isDarkTheme)}
      />

      {/* Search */}
      <ReaderSearchBar
        show={showSearch}
        isDarkTheme={isDarkTheme}
        numPages={numPages}
        pdfDocument={pdfDocument}
        onClose={() => setShowSearch(false)}
        onGoToPage={goToPage}
      />

      {/* Main */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <ReaderSidebar
          show={showSidebar}
          numPages={numPages}
          currentPage={currentPage}
          bookmarks={bookmarks}
          isDarkTheme={isDarkTheme}
          onGoToPage={goToPage}
          onClose={() => setShowSidebar(false)}
          onRemoveBookmark={removeBookmark}
        />

        {/* Book display */}
        <div
          ref={containerRef}
          className={`flex-1 flex ${viewMode === "scroll" ? "flex-col overflow-y-auto" : "items-center justify-center"} relative overflow-hidden`}
          onTouchStart={viewMode !== "scroll" ? handleTouchStart : undefined}
          onTouchEnd={viewMode !== "scroll" ? handleTouchEnd : undefined}
        >
          {/* Navigation arrows (not in scroll mode) */}
          {viewMode !== "scroll" && (
            <>
              <button
                onClick={nextPage}
                disabled={currentPage >= numPages}
                className={`absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-3 rounded-full ${arrowBg} disabled:opacity-20 transition-all backdrop-blur-sm`}
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <button
                onClick={prevPage}
                disabled={currentPage <= 1}
                className={`absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-3 rounded-full ${arrowBg} disabled:opacity-20 transition-all backdrop-blur-sm`}
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </>
          )}

          {/* Glow (not in scroll mode) */}
          {viewMode !== "scroll" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="rounded-2xl opacity-30"
                style={{
                  width: viewMode === "double" ? pageWidth * 2 + 20 : pageWidth + 20,
                  height: pageWidth * 1.4 + 20,
                  boxShadow: `0 0 80px 20px ${glowColor}, 0 25px 60px -12px rgba(0,0,0,0.5)`,
                }}
              />
            </div>
          )}

          <Document
            file={resourceUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={() => {}}
            loading={
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                <p className={`${subTextColor} text-sm`}>جاري تحميل الكتاب...</p>
              </div>
            }
            error={
              <div className="flex flex-col items-center gap-4 text-center px-4">
                <BookOpen className="w-12 h-12 text-gray-500" />
                <p className={`${textColor} font-medium`}>تعذر عرض هذا الملف</p>
                <div className="flex gap-3">
                  <a href={resourceUrl || book?.pdf_url || "#"} target="_blank" rel="noopener noreferrer" className={`${linkColor} hover:underline text-sm`}>فتح في نافذة جديدة ↗</a>
                  <button onClick={() => navigate(`/product/${id}`)} className="text-blue-400 hover:underline text-sm">العودة لصفحة المنتج</button>
                </div>
              </div>
            }
          >
            {viewMode === "scroll" ? (
              /* Continuous scroll mode */
              <div ref={scrollContainerRef} className="flex flex-col items-center gap-4 py-6 px-4">
                {scrollPages.map((pageNum) => (
                  <div key={pageNum} className={`${pageBg} shadow-xl rounded-lg overflow-hidden`}>
                    <Page
                      pageNumber={pageNum}
                      width={pageWidth}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      className="book-page"
                      loading={
                        <div style={{ width: pageWidth, height: pageWidth * 1.4 }} className="flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                        </div>
                      }
                    />
                  </div>
                ))}
              </div>
            ) : (
              /* Single / Double page mode */
              <AnimatePresence mode="wait">
                <motion.div
                  key={displayPage}
                  initial={{ rotateY: pageFlipDir === "left" ? -15 : pageFlipDir === "right" ? 15 : 0, opacity: 0.7, scale: 0.97 }}
                  animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                  exit={{ rotateY: pageFlipDir === "left" ? 15 : -15, opacity: 0.7, scale: 0.97 }}
                  transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="flex"
                  style={{ perspective: "1200px" }}
                >
                  {viewMode === "double" ? (
                    <div className="flex shadow-2xl rounded-lg overflow-hidden">
                      <div className={`${pageBg} relative`} style={{ boxShadow: "inset -4px 0 12px rgba(0,0,0,0.08)" }}>
                        <Page pageNumber={displayPage} width={pageWidth} renderTextLayer={true} renderAnnotationLayer={true} className="book-page" />
                        <div className="absolute inset-y-0 left-0 w-8 pointer-events-none" style={{ background: "linear-gradient(to right, rgba(0,0,0,0.06), transparent)" }} />
                      </div>
                      <div className="w-[3px] bg-gradient-to-b from-[#8B7355] via-[#6B5940] to-[#8B7355] flex-shrink-0 shadow-inner" />
                      {displayPage + 1 <= numPages && (
                        <div className={`${pageBg} relative`} style={{ boxShadow: "inset 4px 0 12px rgba(0,0,0,0.08)" }}>
                          <Page pageNumber={displayPage + 1} width={pageWidth} renderTextLayer={true} renderAnnotationLayer={true} className="book-page" />
                          <div className="absolute inset-y-0 right-0 w-8 pointer-events-none" style={{ background: "linear-gradient(to left, rgba(0,0,0,0.06), transparent)" }} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`shadow-2xl rounded-lg overflow-hidden ${pageBg}`}>
                      <Page pageNumber={displayPage} width={pageWidth} renderTextLayer={true} renderAnnotationLayer={true} className="book-page" />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </Document>
        </div>
      </div>

      {/* Bottom Toolbar */}
      <ReaderToolbar
        currentPage={currentPage}
        numPages={numPages}
        zoom={zoom}
        viewMode={viewMode}
        isTTSPlaying={isTTSPlaying}
        isDarkTheme={isDarkTheme}
        pageInputValue={pageInputValue}
        onNextPage={nextPage}
        onPrevPage={prevPage}
        onGoToPage={goToPage}
        onZoomIn={() => setZoom(z => Math.min(2.5, z + 0.15))}
        onZoomOut={() => setZoom(z => Math.max(0.5, z - 0.15))}
        onSetViewMode={setViewMode}
        onToggleTTS={toggleTTS}
        onPageInputChange={setPageInputValue}
      />

      <style>{`
        .book-page canvas { display: block !important; }
        .book-page .react-pdf__Page__textContent { user-select: text; }
        .book-page .react-pdf__Page__annotations { pointer-events: auto; }
      `}</style>
    </div>
  );
};

export default BookReader;
