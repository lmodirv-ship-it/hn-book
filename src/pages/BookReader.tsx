import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import ReaderHeader from "@/components/reader/ReaderHeader";
import SmartSidebar from "@/components/reader/SmartSidebar";
import ReaderToolbar from "@/components/reader/ReaderToolbar";
import ReaderSearchBar from "@/components/reader/ReaderSearchBar";
import ReaderSettings from "@/components/reader/ReaderSettings";
import BookIntroPage from "@/components/reader/BookIntroPage";
import { useBookmarks } from "@/components/reader/useBookmarks";
import { useNotes } from "@/components/reader/useNotes";
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

// Paper color configs
const PAPER_COLORS: Record<string, { light: string; dark: string; pageBg: string; pageBgDark: string }> = {
  warm:  { light: "#f5f0e8", dark: "#1a1a2e", pageBg: "#faf6ee", pageBgDark: "#f5f0e8" },
  white: { light: "#f0f0f0", dark: "#0f0f1a", pageBg: "#ffffff", pageBgDark: "#f5f5f5" },
  sepia: { light: "#f0e6d2", dark: "#1e1a14", pageBg: "#f5ecd8", pageBgDark: "#f0e6d2" },
  green: { light: "#f0f5ef", dark: "#141e1a", pageBg: "#f5faf4", pageBgDark: "#f0f5ef" },
};

const pageFlipVariants = {
  enterFromRight: { rotateY: -90, opacity: 0, scale: 0.92, x: 60 },
  enterFromLeft: { rotateY: 90, opacity: 0, scale: 0.92, x: -60 },
  center: { rotateY: 0, opacity: 1, scale: 1, x: 0 },
  exitToLeft: { rotateY: 90, opacity: 0, scale: 0.92, x: -60 },
  exitToRight: { rotateY: -90, opacity: 0, scale: 0.92, x: 60 },
};

const pageFlipTransition = {
  duration: 0.5,
  ease: [0.645, 0.045, 0.355, 1.0],
};

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
  const [showSettings, setShowSettings] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [isTTSPlaying, setIsTTSPlaying] = useState(false);
  const [pageInputValue, setPageInputValue] = useState("");
  const [pageFlipDir, setPageFlipDir] = useState<"left" | "right" | null>(null);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Customization
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState("inherit");
  const [paperColor, setPaperColor] = useState("warm");
  const [pageWidthSetting, setPageWidthSetting] = useState<"narrow" | "medium" | "wide">("medium");

  // Auto-hide UI
  const [uiVisible, setUiVisible] = useState(true);
  const uiTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { bookmarks, addBookmark, removeBookmark, isBookmarked } = useBookmarks(id);
  const { notes, addNote, removeNote } = useNotes(id);
  const { getSaved, save, restored, setRestored } = useReadingProgress(id);

  // Responsive
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setViewMode("single");
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Auto-hide header/toolbar
  useEffect(() => {
    if (isFocusMode) return;
    const resetTimer = () => {
      setUiVisible(true);
      if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
      uiTimeoutRef.current = setTimeout(() => setUiVisible(false), 5000);
    };
    const events = ["mousemove", "touchstart", "keydown", "click"];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    };
  }, [isFocusMode]);

  // Restore reading progress
  useEffect(() => {
    if (numPages > 0 && !restored) {
      const saved = getSaved();
      if (saved) {
        setCurrentPage(Math.min(saved.page, numPages));
        setZoom(saved.zoom || 1);
        if (saved.viewMode && window.innerWidth >= 768) setViewMode(saved.viewMode as ViewMode);
        if (saved.page > 1) setShowIntro(false); // Skip intro if returning
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

  // Fetch book
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
      setTimeout(() => setPageFlipDir(null), 550);
    }
  }, [currentPage, numPages, viewMode]);

  const prevPage = useCallback(() => {
    const step = viewMode === "double" ? 2 : 1;
    if (currentPage > 1) {
      setPageFlipDir("right");
      setCurrentPage(p => Math.max(1, p - step));
      setTimeout(() => setPageFlipDir(null), 550);
    }
  }, [currentPage, viewMode]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") prevPage();
      else if (e.key === "ArrowLeft") nextPage();
      else if (e.key === "f" || e.key === "F") {
        if (e.ctrlKey || e.metaKey) { e.preventDefault(); setShowSearch(true); }
        else toggleFullscreen();
      } else if (e.key === "Escape") {
        if (isFocusMode) setIsFocusMode(false);
        if (showSearch) setShowSearch(false);
        if (showSidebar) setShowSidebar(false);
        if (showSettings) setShowSettings(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [nextPage, prevPage, isFocusMode, showSearch, showSidebar, showSettings]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) prevPage(); else nextPage();
    }
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && isMobile) {
      const screenW = window.innerWidth;
      const tapX = e.changedTouches[0].clientX;
      if (tapX > screenW * 0.3 && tapX < screenW * 0.7) {
        setIsFocusMode(!isFocusMode);
      }
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
      const utterance = new SpeechSynthesisUtterance(`صفحة ${currentPage}`);
      utterance.lang = "ar";
      utterance.onend = () => setIsTTSPlaying(false);
      speechSynthesis.speak(utterance);
    }
  }, [isTTSPlaying, currentPage]);

  // Dynamic page width based on setting
  const pageWidth = useMemo(() => {
    if (typeof window === "undefined") return 600;
    const w = window.innerWidth;
    if (isMobile) return (w - 16) * zoom;
    const widthMultipliers = { narrow: 0.65, medium: 0.85, wide: 1.0 };
    const mult = widthMultipliers[pageWidthSetting];
    const baseWidth = viewMode === "double" ? 380 : viewMode === "scroll" ? 700 : 600;
    const factor = viewMode === "double" ? 0.42 : mult;
    return Math.min(baseWidth, w * factor) * zoom;
  }, [viewMode, zoom, isMobile, pageWidthSetting]);

  // Theme colors based on paper color
  const paperConfig = PAPER_COLORS[paperColor] || PAPER_COLORS.warm;
  const readerBg = isDarkTheme ? `bg-[${paperConfig.dark}]` : `bg-[${paperConfig.light}]`;
  const readerBgStyle = { backgroundColor: isDarkTheme ? paperConfig.dark : paperConfig.light };
  const pageBgColor = isDarkTheme ? paperConfig.pageBgDark : paperConfig.pageBg;
  const textColor = isDarkTheme ? "text-white" : "text-[#3a2e22]";
  const subTextColor = isDarkTheme ? "text-gray-400" : "text-[#8a7a6a]";
  const linkColor = isDarkTheme ? "text-emerald-400" : "text-[#6a5a4a]";

  const shouldShowUI = uiVisible && !isFocusMode;

  const simpleHeader = (
    <header className={`flex-shrink-0 h-11 backdrop-blur-md border-b flex items-center justify-between px-3 z-50 ${isDarkTheme ? "bg-[#1a1a2e]/95 border-white/5" : "bg-[#faf8f5]/95 border-[#e8e0d4]"}`}>
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
      <div className="min-h-screen flex items-center justify-center" style={readerBgStyle}>
        <div className="flex flex-col items-center gap-4">
          <BookOpen className="w-10 h-10 text-emerald-400 animate-pulse" />
          <p className={`${subTextColor} text-sm`}>جاري تحميل الكتاب...</p>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={readerBgStyle} dir="rtl">
        <BookOpen className="w-12 h-12 text-gray-500" />
        <h1 className={`text-xl font-bold ${textColor}`}>الكتاب غير موجود</h1>
        <button onClick={() => navigate("/")} className={`${linkColor} hover:underline text-sm`}>العودة للمتجر</button>
      </div>
    );
  }

  if (!book.pdf_url) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4" style={readerBgStyle} dir="rtl">
        <BookOpen className="w-12 h-12 text-gray-500" />
        <div className="text-center space-y-2">
          <h1 className={`text-lg font-bold ${textColor}`}>{book.name}</h1>
          <p className={`${subTextColor} text-sm`}>لا يوجد ملف قابل للمطالعة</p>
        </div>
        <button onClick={() => navigate(`/product/${id}`)} className={`${linkColor} hover:underline text-sm`}>العودة لصفحة المنتج</button>
      </div>
    );
  }

  // Show intro page
  if (showIntro && resourceType === "pdf") {
    return (
      <BookIntroPage
        bookName={book.name}
        bookDescription={book.description}
        bookImage={book.image}
        category={book.category}
        numPages={numPages}
        isDarkTheme={isDarkTheme}
        onStartReading={() => setShowIntro(false)}
      />
    );
  }

  if (resourceType === "text") {
    return (
      <div className="h-screen flex flex-col overflow-hidden" style={readerBgStyle} dir="rtl">
        {simpleHeader}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <article
            className={`mx-auto max-w-4xl rounded-2xl border p-5 text-sm leading-8 whitespace-pre-wrap sm:p-8 ${isDarkTheme ? "border-white/5 bg-[#16213e] text-gray-200" : "border-[#e0d8cc] bg-white text-[#3a2e22]"}`}
            style={{ fontSize, fontFamily }}
          >
            {textContent}
          </article>
        </div>
      </div>
    );
  }

  if (resourceType === "image" && resourceUrl) {
    return (
      <div className="h-screen flex flex-col overflow-hidden" style={readerBgStyle} dir="rtl">
        {simpleHeader}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center">
          <img src={resourceUrl} alt={book.name} className="max-h-full max-w-full rounded-2xl shadow-2xl" />
        </div>
      </div>
    );
  }

  if (resourceType === "embed" && resourceUrl) {
    return (
      <div className="h-screen flex flex-col overflow-hidden" style={readerBgStyle} dir="rtl">
        {simpleHeader}
        <div className="flex-1 p-2 sm:p-4">
          <iframe src={resourceUrl} title={book.name} className={`h-full w-full rounded-2xl border bg-white ${isDarkTheme ? "border-white/5" : "border-[#e0d8cc]"}`} />
        </div>
      </div>
    );
  }

  if (!resourceUrl) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
    const isLocalFile = book.pdf_url?.includes(supabaseUrl) || book.pdf_url?.includes("supabase.co");
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4" style={readerBgStyle} dir="rtl">
        <BookOpen className="w-12 h-12 text-gray-500" />
        <div className="text-center space-y-2">
          <h1 className={`text-lg font-bold ${textColor}`}>{book.name}</h1>
          <p className={`${subTextColor} text-sm`}>{isLocalFile ? "تعذر تحميل الملف من الخادم" : "رابط خارجي غير متاح حالياً"}</p>
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
  const arrowBg = isDarkTheme
    ? "bg-black/40 hover:bg-black/60 text-white/70 hover:text-white"
    : "bg-white/80 hover:bg-white text-[#8a7a6a] hover:text-[#5c4b3a] shadow-md";

  const scrollPages = useMemo(() => {
    if (viewMode !== "scroll") return [];
    return Array.from({ length: numPages }, (_, i) => i + 1);
  }, [viewMode, numPages]);

  const getInitialAnim = () => {
    if (!pageFlipDir) return { opacity: 0.8, scale: 0.98 };
    return pageFlipDir === "left" ? pageFlipVariants.enterFromRight : pageFlipVariants.enterFromLeft;
  };

  const getExitAnim = () => {
    if (!pageFlipDir) return { opacity: 0.8, scale: 0.98 };
    return pageFlipDir === "left" ? pageFlipVariants.exitToLeft : pageFlipVariants.exitToRight;
  };

  const progress = numPages > 0 ? (currentPage / numPages) * 100 : 0;

  // Page shadow for real book feel
  const pageShadow = isDarkTheme
    ? "0 4px 40px rgba(0,0,0,0.6), 0 0 1px rgba(255,255,255,0.05)"
    : "0 4px 40px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)";

  return (
    <div className="h-screen flex flex-col overflow-hidden select-none" style={readerBgStyle} dir="rtl">
      {/* Header */}
      <AnimatePresence>
        {shouldShowUI && (
          <motion.div
            initial={{ y: -48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -48, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
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
              isFocusMode={isFocusMode}
              onToggleSidebar={() => setShowSidebar(!showSidebar)}
              onToggleSearch={() => setShowSearch(!showSearch)}
              onToggleFullscreen={toggleFullscreen}
              onToggleBookmark={() => {
                if (isBookmarked(currentPage)) removeBookmark(currentPage);
                else addBookmark(currentPage);
              }}
              onToggleTheme={() => setIsDarkTheme(!isDarkTheme)}
              onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
              onToggleSettings={() => setShowSettings(!showSettings)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      {shouldShowUI && (
        <ReaderSearchBar
          show={showSearch}
          isDarkTheme={isDarkTheme}
          numPages={numPages}
          pdfDocument={pdfDocument}
          onClose={() => setShowSearch(false)}
          onGoToPage={goToPage}
        />
      )}

      {/* Settings modal */}
      <ReaderSettings
        show={showSettings}
        isDarkTheme={isDarkTheme}
        fontSize={fontSize}
        fontFamily={fontFamily}
        paperColor={paperColor}
        pageWidth={pageWidthSetting}
        onClose={() => setShowSettings(false)}
        onChangeFontSize={setFontSize}
        onChangeFontFamily={setFontFamily}
        onChangePaperColor={setPaperColor}
        onChangePageWidth={setPageWidthSetting}
      />

      {/* Main */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Smart Sidebar */}
        {shouldShowUI && (
          <SmartSidebar
            show={showSidebar}
            numPages={numPages}
            currentPage={currentPage}
            bookmarks={bookmarks}
            notes={notes}
            bookDescription={book.description}
            isDarkTheme={isDarkTheme}
            isMobile={isMobile}
            onGoToPage={goToPage}
            onClose={() => setShowSidebar(false)}
            onRemoveBookmark={removeBookmark}
            onAddNote={addNote}
            onRemoveNote={removeNote}
          />
        )}

        {/* Book display */}
        <div
          ref={containerRef}
          className={`flex-1 flex ${viewMode === "scroll" ? "flex-col overflow-y-auto" : "items-center justify-center"} relative overflow-hidden`}
          onTouchStart={viewMode !== "scroll" ? handleTouchStart : undefined}
          onTouchEnd={viewMode !== "scroll" ? handleTouchEnd : undefined}
          onClick={() => {
            if (!isMobile) {
              setUiVisible(true);
              if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
              uiTimeoutRef.current = setTimeout(() => setUiVisible(false), 5000);
            }
          }}
        >
          {/* Nav arrows */}
          {viewMode !== "scroll" && !(isMobile && isFocusMode) && (
            <>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={nextPage}
                disabled={currentPage >= numPages}
                className={`absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 z-20 p-1.5 sm:p-3 rounded-full ${arrowBg} disabled:opacity-20 transition-all backdrop-blur-sm`}
              >
                <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={prevPage}
                disabled={currentPage <= 1}
                className={`absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 z-20 p-1.5 sm:p-3 rounded-full ${arrowBg} disabled:opacity-20 transition-all backdrop-blur-sm`}
              >
                <ChevronRight className="w-4 h-4 sm:w-6 sm:h-6" />
              </motion.button>
            </>
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
                  <button onClick={() => navigate(`/product/${id}`)} className="text-blue-400 hover:underline text-sm">العودة</button>
                </div>
              </div>
            }
          >
            {viewMode === "scroll" ? (
              <div ref={scrollContainerRef} className="flex flex-col items-center gap-2 sm:gap-4 py-4 sm:py-6 px-1 sm:px-4">
                {scrollPages.map((pageNum) => (
                  <div
                    key={pageNum}
                    className="rounded-lg overflow-hidden"
                    style={{ backgroundColor: pageBgColor, boxShadow: pageShadow }}
                  >
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
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={displayPage}
                  initial={getInitialAnim()}
                  animate={pageFlipVariants.center}
                  exit={getExitAnim()}
                  transition={pageFlipTransition}
                  className="flex"
                  style={{ perspective: "1200px", transformStyle: "preserve-3d" }}
                >
                  {viewMode === "double" ? (
                    <div className="flex rounded-lg overflow-hidden" style={{ boxShadow: pageShadow, transformStyle: "preserve-3d" }}>
                      <div className="relative" style={{ backgroundColor: pageBgColor, boxShadow: "inset -4px 0 12px rgba(0,0,0,0.06)" }}>
                        <Page pageNumber={displayPage} width={pageWidth} renderTextLayer={true} renderAnnotationLayer={true} className="book-page" />
                        <div className="absolute inset-y-0 left-0 w-8 pointer-events-none" style={{ background: "linear-gradient(to right, rgba(0,0,0,0.04), transparent)" }} />
                      </div>
                      <div className="w-[3px] bg-gradient-to-b from-[#8B7355] via-[#6B5940] to-[#8B7355] flex-shrink-0 shadow-inner" />
                      {displayPage + 1 <= numPages && (
                        <div className="relative" style={{ backgroundColor: pageBgColor, boxShadow: "inset 4px 0 12px rgba(0,0,0,0.06)" }}>
                          <Page pageNumber={displayPage + 1} width={pageWidth} renderTextLayer={true} renderAnnotationLayer={true} className="book-page" />
                          <div className="absolute inset-y-0 right-0 w-8 pointer-events-none" style={{ background: "linear-gradient(to left, rgba(0,0,0,0.04), transparent)" }} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg overflow-hidden" style={{ backgroundColor: pageBgColor, boxShadow: pageShadow }}>
                      <Page pageNumber={displayPage} width={pageWidth} renderTextLayer={true} renderAnnotationLayer={true} className="book-page" />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </Document>

          {/* Focus mode indicator */}
          {isFocusMode && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30"
            >
              <div className={`rounded-full px-4 py-1.5 backdrop-blur-md shadow-lg flex items-center gap-3 ${isDarkTheme ? "bg-black/60" : "bg-white/80"}`}>
                <span className={`text-[11px] font-medium ${isDarkTheme ? "text-gray-300" : "text-[#5c4b3a]"}`}>
                  {currentPage} / {numPages}
                </span>
                <div className={`w-20 h-1 rounded-full ${isDarkTheme ? "bg-white/10" : "bg-[#e0d8cc]"}`}>
                  <div
                    className={`h-full rounded-full transition-all ${isDarkTheme ? "bg-emerald-400" : "bg-[#8a7a6a]"}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <AnimatePresence>
        {shouldShowUI && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
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
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .book-page canvas { display: block !important; }
        .book-page .react-pdf__Page__textContent { user-select: text; font-family: ${fontFamily}; font-size: ${fontSize}px; }
        .book-page .react-pdf__Page__annotations { pointer-events: auto; }
      `}</style>
    </div>
  );
};

export default BookReader;
