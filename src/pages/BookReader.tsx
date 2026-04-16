import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ChevronLeft, ChevronRight, Search, Bookmark, BookmarkCheck, Sun, Moon, Eye, EyeOff, Settings, Maximize2, Minimize2, List, Highlighter as HighlighterIcon } from "lucide-react";
import { bookService } from "@/services";
import { accessService } from "@/services/accessService";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import LibrarySidebar from "@/components/reader/LibrarySidebar";
import ToolsPanel from "@/components/reader/ToolsPanel";
import ReaderSearchBar from "@/components/reader/ReaderSearchBar";
import ReaderSettings from "@/components/reader/ReaderSettings";
import BookIntroPage from "@/components/reader/BookIntroPage";
import TextSelectionPopup from "@/components/reader/TextSelectionPopup";
import { useBookmarks } from "@/components/reader/useBookmarks";
import { useNotes } from "@/components/reader/useNotes";
import { useHighlights } from "@/components/reader/useHighlights";
import { useReadingProgress } from "@/components/reader/useReadingProgress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

const PAPER_COLORS: Record<string, { light: string; dark: string; pageBg: string; pageBgDark: string }> = {
  warm:  { light: "#f5f0e8", dark: "#0f172a", pageBg: "#faf6ee", pageBgDark: "#1e293b" },
  white: { light: "#f0f0f0", dark: "#0a0a14", pageBg: "#ffffff", pageBgDark: "#1a1a2e" },
  sepia: { light: "#f0e6d2", dark: "#1e1a14", pageBg: "#f5ecd8", pageBgDark: "#2a2520" },
  green: { light: "#f0f5ef", dark: "#0f1a14", pageBg: "#f5faf4", pageBgDark: "#1a2e1e" },
};

const pageFlipVariants = {
  enterFromRight: { rotateY: -90, opacity: 0, scale: 0.92, x: 60 },
  enterFromLeft: { rotateY: 90, opacity: 0, scale: 0.92, x: -60 },
  center: { rotateY: 0, opacity: 1, scale: 1, x: 0 },
  exitToLeft: { rotateY: 90, opacity: 0, scale: 0.92, x: -60 },
  exitToRight: { rotateY: -90, opacity: 0, scale: 0.92, x: 60 },
};

const pageFlipTransition = { duration: 0.5, ease: [0.645, 0.045, 0.355, 1.0] };

const BookReader = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<BookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessBlocked, setAccessBlocked] = useState(false);
  const [resourceUrl, setResourceUrl] = useState<string | null>(null);
  const [resourceType, setResourceType] = useState<ResourceType | null>(null);
  const [textContent, setTextContent] = useState("");
  const [pdfDocument, setPdfDocument] = useState<any>(null);

  // Reader state
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("single");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [isTTSPlaying, setIsTTSPlaying] = useState(false);
  const [pageInputValue, setPageInputValue] = useState("");
  const [pageFlipDir, setPageFlipDir] = useState<"left" | "right" | null>(null);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Panels
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryCollapsed, setLibraryCollapsed] = useState(true);
  const [showTools, setShowTools] = useState(false);
  const [toolsCollapsed, setToolsCollapsed] = useState(true);
  const [mobileLibrary, setMobileLibrary] = useState(false);
  const [mobileTools, setMobileTools] = useState(false);

  // Customization
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState("inherit");
  const [paperColor, setPaperColor] = useState("warm");
  const [pageWidthSetting, setPageWidthSetting] = useState<"narrow" | "medium" | "wide">("medium");

  // Auto-hide
  const [uiVisible, setUiVisible] = useState(true);
  const uiTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { bookmarks, addBookmark, removeBookmark, isBookmarked } = useBookmarks(id);
  const { highlights, addHighlight, removeHighlight } = useHighlights(id);
  const { notes, addNote, removeNote } = useNotes(id);
  const { getSaved, save, restored, setRestored } = useReadingProgress(id);

  // Responsive
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setViewMode("single");
        setLibraryCollapsed(true);
        setToolsCollapsed(true);
      } else {
        // Desktop: show collapsed sidebars
        setShowLibrary(true);
        setShowTools(true);
      }
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Auto-hide header
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

  // Restore progress
  useEffect(() => {
    if (numPages > 0 && !restored) {
      const saved = getSaved();
      if (saved) {
        setCurrentPage(Math.min(saved.page, numPages));
        setZoom(saved.zoom || 1);
        if (saved.viewMode && window.innerWidth >= 768) setViewMode(saved.viewMode as ViewMode);
        if (saved.page > 1) setShowIntro(false);
      }
      setRestored(true);
    }
  }, [numPages, restored, getSaved, setRestored]);

  // Auto-save
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
        const result = await bookService.getById(id);
        if (!result.data) return;
        const bookData = result.data;
        setBook({
          id: bookData.id,
          name: bookData.name,
          description: bookData.description || null,
          category: bookData.category,
          image: bookData.image || null,
          pdf_url: bookData.pdfUrl || null,
          reference_code: bookData.referenceCode || null,
        });
        if (!bookData.pdfUrl) return;

        // Check access for paid books
        if (bookData.price > 0) {
          const access = await accessService.canAccessBook(bookData.id, bookData.price);
          if (!access.canAccess) {
            setAccessBlocked(true);
            setLoading(false);
            return;
          }
        }
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
        const isInternal = bookData.pdfUrl.includes(supabaseUrl) || bookData.pdfUrl.includes("supabase.co");
        const inferredType = getResourceTypeFromUrl(bookData.pdfUrl);

        if (isInternal && (inferredType === "pdf" || inferredType === "image")) {
          setResourceUrl(bookData.pdfUrl);
          setResourceType(inferredType);
          return;
        }

        const response = await fetch(
          isInternal ? bookData.pdfUrl : `${supabaseUrl}/functions/v1/proxy-pdf`,
          isInternal ? undefined : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: bookData.pdfUrl }),
          }
        );

        if (!response.ok) {
          setResourceUrl(bookData.pdfUrl);
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
          setResourceUrl(bookData.pdfUrl);
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") prevPage();
      else if (e.key === "ArrowLeft") nextPage();
      else if ((e.key === "f" || e.key === "F") && (e.ctrlKey || e.metaKey)) { e.preventDefault(); setShowSearch(true); }
      else if (e.key === "h" || e.key === "H") {
        if (!e.ctrlKey && !e.metaKey) {
          if (isMobile) setMobileTools(true);
          else { setToolsCollapsed(false); setShowTools(true); }
        }
      }
      else if (e.key === "Escape") {
        if (isFocusMode) setIsFocusMode(false);
        if (showSearch) setShowSearch(false);
        if (showSettings) setShowSettings(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [nextPage, prevPage, isFocusMode, showSearch, showSettings, isMobile]);

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

  const pageWidth = useMemo(() => {
    if (typeof window === "undefined") return 600;
    const w = window.innerWidth;
    if (isMobile) return (w - 16) * zoom;
    // Account for sidebars
    const sidebarSpace = (libraryCollapsed ? 48 : 280) + (toolsCollapsed ? 48 : 300);
    const available = w - sidebarSpace - 60;
    const widthMultipliers = { narrow: 0.65, medium: 0.85, wide: 1.0 };
    const mult = widthMultipliers[pageWidthSetting];
    const baseWidth = viewMode === "double" ? 380 : viewMode === "scroll" ? 700 : 600;
    return Math.min(baseWidth, available * mult) * zoom;
  }, [viewMode, zoom, isMobile, pageWidthSetting, libraryCollapsed, toolsCollapsed]);

  // Theme
  const paperConfig = PAPER_COLORS[paperColor] || PAPER_COLORS.warm;
  const readerBgStyle = { backgroundColor: isDarkTheme ? paperConfig.dark : paperConfig.light };
  const pageBgColor = isDarkTheme ? paperConfig.pageBgDark : paperConfig.pageBg;
  const textColor = isDarkTheme ? "text-white" : "text-[#3a2e22]";
  const subTextColor = isDarkTheme ? "text-gray-400" : "text-[#8a7a6a]";
  const linkColor = isDarkTheme ? "text-indigo-400" : "text-indigo-600";

  const shouldShowUI = uiVisible && !isFocusMode;
  const progress = numPages > 0 ? (currentPage / numPages) * 100 : 0;

  const pageShadow = isDarkTheme
    ? "0 8px 60px rgba(0,0,0,0.7), 0 0 1px rgba(255,255,255,0.05)"
    : "0 8px 60px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.08)";

  // --- Header bar (glassmorphism) ---
  const headerBg = isDarkTheme
    ? "bg-[#0d1117]/80 backdrop-blur-xl border-white/5"
    : "bg-white/80 backdrop-blur-xl border-gray-200";
  const btnBase = "p-2 rounded-xl transition-all duration-200 active:scale-90";
  const btnClass = isDarkTheme
    ? `${btnBase} hover:bg-white/10 text-gray-400 hover:text-gray-200`
    : `${btnBase} hover:bg-gray-100 text-gray-500 hover:text-gray-700`;
  const btnActive = isDarkTheme
    ? `${btnBase} bg-indigo-500/15 text-indigo-400`
    : `${btnBase} bg-indigo-50 text-indigo-600`;

  // Navigate to different book
  const handleSelectBook = (bookId: string) => {
    navigate(`/read/${bookId}`);
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={readerBgStyle}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-2 border-indigo-500/20 rounded-full" />
            <div className="w-16 h-16 border-2 border-transparent border-t-indigo-500 rounded-full animate-spin absolute inset-0" />
            <BookOpen className="w-6 h-6 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className={`${subTextColor} text-sm`}>جاري تحميل الكتاب...</p>
        </motion.div>
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
        <h1 className={`text-lg font-bold ${textColor}`}>{book.name}</h1>
        <p className={`${subTextColor} text-sm`}>لا يوجد ملف قابل للمطالعة</p>
        <button onClick={() => navigate(`/product/${id}`)} className={`${linkColor} hover:underline text-sm`}>العودة لصفحة المنتج</button>
      </div>
    );
  }

  if (accessBlocked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4" style={readerBgStyle} dir="rtl">
        <Lock className="w-12 h-12 text-primary/60" />
        <h1 className={`text-lg font-bold ${textColor}`}>{book.name}</h1>
        <p className={`${subTextColor} text-sm`}>يجب شراء الكتاب أو الاشتراك للقراءة</p>
        <div className="flex gap-3">
          <button onClick={() => navigate(`/book/${id}`)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
            صفحة الكتاب
          </button>
          <button onClick={() => navigate("/auth")} className={`${linkColor} hover:underline text-sm py-2`}>تسجيل الدخول</button>
        </div>
      </div>
    );
  }

  // Intro page
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

  // Simple header for non-PDF content
  const simpleHeader = (
    <header className={`flex-shrink-0 h-11 border-b flex items-center justify-between px-3 z-50 ${headerBg}`}>
      <button onClick={() => navigate(`/product/${id}`)} className={btnClass}><BookOpen className="w-4 h-4" /></button>
      <p className={`text-xs font-medium ${textColor} truncate`}>{book.name}</p>
      <div className="w-8" />
    </header>
  );

  if (resourceType === "text") {
    return (
      <div className="h-screen flex flex-col overflow-hidden" style={readerBgStyle} dir="rtl">
        {simpleHeader}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <article
            className={`mx-auto max-w-[700px] rounded-2xl border p-5 text-sm leading-[1.9] whitespace-pre-wrap sm:p-8 ${isDarkTheme ? "border-white/5 bg-[#1e293b] text-gray-200" : "border-gray-200 bg-white text-[#3a2e22]"}`}
            style={{ fontSize, fontFamily, letterSpacing: "0.3px" }}
          >{textContent}</article>
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
          <iframe src={resourceUrl} title={book.name} className={`h-full w-full rounded-2xl border bg-white ${isDarkTheme ? "border-white/5" : "border-gray-200"}`} />
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
        <h1 className={`text-lg font-bold ${textColor}`}>{book.name}</h1>
        <p className={`${subTextColor} text-sm`}>{isLocalFile ? "تعذر تحميل الملف" : "رابط غير متاح"}</p>
        <button onClick={() => navigate(`/product/${id}`)} className={`${linkColor} hover:underline text-sm`}>العودة</button>
      </div>
    );
  }

  // ============ PDF READER - 3 PANEL LAYOUT ============
  const arrowBg = isDarkTheme
    ? "bg-black/40 hover:bg-black/60 text-white/70 hover:text-white"
    : "bg-white/80 hover:bg-white text-gray-500 hover:text-gray-700 shadow-lg";

  const scrollPages = viewMode === "scroll" ? Array.from({ length: numPages }, (_, i) => i + 1) : [];

  const getInitialAnim = () => {
    if (!pageFlipDir) return { opacity: 0.8, scale: 0.98 };
    return pageFlipDir === "left" ? pageFlipVariants.enterFromRight : pageFlipVariants.enterFromLeft;
  };
  const getExitAnim = () => {
    if (!pageFlipDir) return { opacity: 0.8, scale: 0.98 };
    return pageFlipDir === "left" ? pageFlipVariants.exitToLeft : pageFlipVariants.exitToRight;
  };

  // Remaining reading time
  const remainingPages = numPages - currentPage;
  const estMinutes = Math.ceil(remainingPages * 1.5);
  const timeStr = estMinutes > 60 ? `${Math.floor(estMinutes / 60)}h ${estMinutes % 60}m` : `${estMinutes} دقيقة`;

  return (
    <div className="h-screen flex flex-col overflow-hidden select-none" style={readerBgStyle} dir="rtl">
      {/* ========= TOP HEADER (Glassmorphism) ========= */}
      <AnimatePresence>
        {shouldShowUI && (
          <motion.header
            initial={{ y: -56, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -56, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex-shrink-0 h-12 border-b flex items-center justify-between px-2 sm:px-3 z-50 ${headerBg}`}
          >
            <TooltipProvider delayDuration={300}>
              {/* Right controls */}
              <div className="flex items-center gap-0.5">
                {/* Library toggle */}
                <Tooltip><TooltipTrigger asChild>
                  <button onClick={() => isMobile ? setMobileLibrary(true) : setLibraryCollapsed(!libraryCollapsed)} className={!libraryCollapsed ? btnActive : btnClass}>
                    <List className="w-4 h-4" />
                  </button>
                </TooltipTrigger><TooltipContent side="bottom"><p className="text-xs">المكتبة</p></TooltipContent></Tooltip>

                {/* Search */}
                <Tooltip><TooltipTrigger asChild>
                  <button onClick={() => setShowSearch(!showSearch)} className={showSearch ? btnActive : btnClass}>
                    <Search className="w-4 h-4" />
                  </button>
                </TooltipTrigger><TooltipContent side="bottom"><p className="text-xs">بحث (Ctrl+F)</p></TooltipContent></Tooltip>

                {/* Bookmark */}
                <Tooltip><TooltipTrigger asChild>
                  <motion.button
                    onClick={() => isBookmarked(currentPage) ? removeBookmark(currentPage) : addBookmark(currentPage)}
                    whileTap={{ scale: 0.8, rotate: isBookmarked(currentPage) ? 0 : 15 }}
                    className={isBookmarked(currentPage) ? `${btnBase} text-yellow-400 bg-yellow-400/10` : btnClass}
                  >
                    {isBookmarked(currentPage) ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  </motion.button>
                </TooltipTrigger><TooltipContent side="bottom"><p className="text-xs">{isBookmarked(currentPage) ? "إزالة العلامة" : "إضافة علامة"}</p></TooltipContent></Tooltip>
              </div>

              {/* Center - Book title + page info */}
              <div className="flex items-center gap-2 min-w-0 max-w-[40%]">
                <p className={`text-xs font-medium ${textColor} truncate`}>{book.name}</p>
                <span className={`text-[10px] ${subTextColor} flex-shrink-0 hidden sm:inline`}>
                  {currentPage}/{numPages}
                </span>
              </div>

              {/* Left controls */}
              <div className="flex items-center gap-0.5">
                {/* Focus */}
                <Tooltip><TooltipTrigger asChild>
                  <button onClick={() => setIsFocusMode(!isFocusMode)} className={isFocusMode ? `${btnBase} text-indigo-400 bg-indigo-400/10` : btnClass}>
                    {isFocusMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </TooltipTrigger><TooltipContent side="bottom"><p className="text-xs">وضع التركيز</p></TooltipContent></Tooltip>

                {/* Theme */}
                <Tooltip><TooltipTrigger asChild>
                  <button onClick={() => setIsDarkTheme(!isDarkTheme)} className={`${btnClass} hidden sm:block`}>
                    {isDarkTheme ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </button>
                </TooltipTrigger><TooltipContent side="bottom"><p className="text-xs">{isDarkTheme ? "وضع فاتح" : "وضع داكن"}</p></TooltipContent></Tooltip>

                {/* Settings */}
                <Tooltip><TooltipTrigger asChild>
                  <button onClick={() => setShowSettings(!showSettings)} className={`${btnClass} hidden sm:block`}>
                    <Settings className="w-4 h-4" />
                  </button>
                </TooltipTrigger><TooltipContent side="bottom"><p className="text-xs">إعدادات</p></TooltipContent></Tooltip>

                {/* Fullscreen */}
                <Tooltip><TooltipTrigger asChild>
                  <button onClick={toggleFullscreen} className={`${btnClass} hidden sm:block`}>
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </TooltipTrigger><TooltipContent side="bottom"><p className="text-xs">{isFullscreen ? "تصغير" : "ملء الشاشة"}</p></TooltipContent></Tooltip>

                {/* Tools toggle */}
                <Tooltip><TooltipTrigger asChild>
                  <button onClick={() => isMobile ? setMobileTools(true) : setToolsCollapsed(!toolsCollapsed)} className={!toolsCollapsed ? btnActive : btnClass}>
                    <HighlighterIcon className="w-4 h-4" />
                  </button>
                </TooltipTrigger><TooltipContent side="bottom"><p className="text-xs">أدوات القراءة (H)</p></TooltipContent></Tooltip>
              </div>
            </TooltipProvider>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Search bar */}
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

      {/* ========= 3-PANEL LAYOUT ========= */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* RIGHT: Library Sidebar (RTL → appears on right) */}
        {!isFocusMode && !isMobile && showLibrary && (
          <LibrarySidebar
            currentBookId={book.id}
            isDarkTheme={isDarkTheme}
            collapsed={libraryCollapsed}
            isMobile={false}
            onToggleCollapse={() => setLibraryCollapsed(!libraryCollapsed)}
            onSelectBook={handleSelectBook}
          />
        )}

        {/* Mobile library drawer */}
        <AnimatePresence>
          {isMobile && mobileLibrary && (
            <LibrarySidebar
              currentBookId={book.id}
              isDarkTheme={isDarkTheme}
              collapsed={false}
              isMobile={true}
              onToggleCollapse={() => setMobileLibrary(false)}
              onSelectBook={handleSelectBook}
              onClose={() => setMobileLibrary(false)}
            />
          )}
        </AnimatePresence>

        {/* CENTER: Reader area */}
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
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={nextPage} disabled={currentPage >= numPages}
                className={`absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 z-20 p-1.5 sm:p-3 rounded-full ${arrowBg} disabled:opacity-20 transition-all backdrop-blur-sm`}>
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </motion.button>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={prevPage} disabled={currentPage <= 1}
                className={`absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 z-20 p-1.5 sm:p-3 rounded-full ${arrowBg} disabled:opacity-20 transition-all backdrop-blur-sm`}>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </motion.button>
            </>
          )}

          <Document
            file={resourceUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={() => {}}
            loading={
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                <p className={`${subTextColor} text-sm`}>جاري تحميل الكتاب...</p>
              </div>
            }
            error={
              <div className="flex flex-col items-center gap-4 text-center px-4">
                <BookOpen className="w-12 h-12 text-gray-500" />
                <p className={`${textColor} font-medium`}>تعذر عرض هذا الملف</p>
                <a href={resourceUrl || book?.pdf_url || "#"} target="_blank" rel="noopener noreferrer" className={`${linkColor} hover:underline text-sm`}>فتح في نافذة جديدة ↗</a>
              </div>
            }
          >
            {viewMode === "scroll" ? (
              <div ref={scrollContainerRef} className="flex flex-col items-center gap-3 py-6 px-2 sm:px-4">
                {scrollPages.map((pageNum) => (
                  <div key={pageNum} className="rounded-xl overflow-hidden" style={{ backgroundColor: pageBgColor, boxShadow: pageShadow }}>
                    <Page pageNumber={pageNum} width={pageWidth} renderTextLayer={true} renderAnnotationLayer={true} className="book-page"
                      loading={<div style={{ width: pageWidth, height: pageWidth * 1.4 }} className="flex items-center justify-center"><div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" /></div>}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={displayPage} initial={getInitialAnim()} animate={pageFlipVariants.center} exit={getExitAnim()} transition={pageFlipTransition}
                  className="flex" style={{ perspective: "1200px", transformStyle: "preserve-3d" }}>
                  {viewMode === "double" ? (
                    <div className="flex rounded-xl overflow-hidden" style={{ boxShadow: pageShadow, transformStyle: "preserve-3d" }}>
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
                    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: pageBgColor, boxShadow: pageShadow }}>
                      <Page pageNumber={displayPage} width={pageWidth} renderTextLayer={true} renderAnnotationLayer={true} className="book-page" />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </Document>

          {/* Text Selection Popup */}
          <TextSelectionPopup
            currentPage={currentPage}
            isDarkTheme={isDarkTheme}
            onHighlight={addHighlight}
            onAddNote={addNote}
          />

          {/* Focus mode mini indicator */}
          {isFocusMode && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
              <div className={`rounded-full px-5 py-2 backdrop-blur-xl shadow-2xl flex items-center gap-3 ${isDarkTheme ? "bg-black/60 border border-white/5" : "bg-white/80 border border-gray-200"}`}>
                <span className={`text-xs font-medium ${isDarkTheme ? "text-gray-300" : "text-gray-600"}`}>
                  {currentPage} / {numPages}
                </span>
                <div className={`w-24 h-1.5 rounded-full ${isDarkTheme ? "bg-white/10" : "bg-gray-200"}`}>
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <span className={`text-[10px] ${isDarkTheme ? "text-gray-500" : "text-gray-400"}`}>{Math.round(progress)}%</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* LEFT: Tools Panel (RTL → appears on left) */}
        {!isFocusMode && !isMobile && showTools && (
          <ToolsPanel
            show={true}
            collapsed={toolsCollapsed}
            numPages={numPages}
            currentPage={currentPage}
            bookmarks={bookmarks}
            notes={notes}
            highlights={highlights}
            bookDescription={book.description}
            isDarkTheme={isDarkTheme}
            isMobile={false}
            onGoToPage={goToPage}
            onClose={() => setShowTools(false)}
            onToggleCollapse={() => setToolsCollapsed(!toolsCollapsed)}
            onRemoveBookmark={removeBookmark}
            onAddNote={addNote}
            onRemoveNote={removeNote}
            onRemoveHighlight={removeHighlight}
          />
        )}

        {/* Mobile tools drawer */}
        <AnimatePresence>
          {isMobile && mobileTools && (
            <ToolsPanel
              show={true}
              collapsed={false}
              numPages={numPages}
              currentPage={currentPage}
              bookmarks={bookmarks}
              notes={notes}
              highlights={highlights}
              bookDescription={book.description}
              isDarkTheme={isDarkTheme}
              isMobile={true}
              onGoToPage={goToPage}
              onClose={() => setMobileTools(false)}
              onToggleCollapse={() => setMobileTools(false)}
              onRemoveBookmark={removeBookmark}
              onAddNote={addNote}
              onRemoveNote={removeNote}
              onRemoveHighlight={removeHighlight}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ========= BOTTOM BAR (floating, glassmorphism) ========= */}
      <AnimatePresence>
        {shouldShowUI && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex-shrink-0 border-t z-50 ${headerBg}`}
          >
            {/* Progress bar */}
            <div
              className={`h-1.5 ${isDarkTheme ? "bg-white/5" : "bg-gray-200"} relative cursor-pointer group`}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                goToPage(Math.round(ratio * numPages));
              }}
            >
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 relative"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              >
                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-indigo-400 shadow-lg shadow-indigo-500/30 opacity-0 group-hover:opacity-100 transition-opacity`} />
              </motion.div>
            </div>

            <div className="flex items-center justify-between px-3 h-11">
              {/* Page info */}
              <div className="flex items-center gap-2">
                <span className={`text-xs ${subTextColor}`}>
                  <span className={`font-semibold ${textColor}`}>{currentPage}</span> / {numPages}
                </span>
                <span className={`text-[10px] ${subTextColor} hidden sm:inline`}>({Math.round(progress)}%)</span>
                <span className={`text-[10px] ${subTextColor} hidden md:inline`}>⏱ {timeStr}</span>
              </div>

              {/* Center: nav + zoom */}
              <div className="flex items-center gap-1">
                <button onClick={() => setZoom(z => Math.max(0.5, z - 0.15))} className={`${btnBase} ${isDarkTheme ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"} text-[11px]`}>
                  −
                </button>
                <span className={`text-[10px] ${subTextColor} min-w-[2.5rem] text-center`}>{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(2.5, z + 0.15))} className={`${btnBase} ${isDarkTheme ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"} text-[11px]`}>
                  +
                </button>

                <div className={`w-px h-5 mx-1 ${isDarkTheme ? "bg-white/10" : "bg-gray-200"}`} />

                <button onClick={nextPage} disabled={currentPage >= numPages} className={`${btnClass} disabled:opacity-30`}><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={prevPage} disabled={currentPage <= 1} className={`${btnClass} disabled:opacity-30`}><ChevronRight className="w-4 h-4" /></button>
              </div>

              {/* View modes */}
              <div className={`flex items-center gap-0.5 ${isDarkTheme ? "bg-white/5" : "bg-gray-100"} rounded-xl p-0.5`}>
                {([
                  { mode: "single" as ViewMode, label: "صفحة", svg: <rect x="6" y="3" width="12" height="18" rx="1" />, desktop: false },
                  { mode: "double" as ViewMode, label: "صفحتين", svg: <><rect x="2" y="3" width="9" height="18" rx="1" /><rect x="13" y="3" width="9" height="18" rx="1" /></>, desktop: true },
                  { mode: "scroll" as ViewMode, label: "تمرير", svg: <><rect x="6" y="2" width="12" height="20" rx="1" /><line x1="9" y1="7" x2="15" y2="7" /><line x1="9" y1="11" x2="15" y2="11" /><line x1="9" y1="15" x2="15" y2="15" /></>, desktop: false },
                ]).map(({ mode, label, svg, desktop }) => (
                  <Tooltip key={mode}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setViewMode(mode)}
                        className={`p-1.5 rounded-lg transition-all ${desktop ? "hidden sm:block" : ""} ${
                          viewMode === mode
                            ? isDarkTheme ? "bg-white/10 text-white" : "bg-white text-gray-800 shadow-sm"
                            : isDarkTheme ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"
                        }`}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{svg}</svg>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-xs">{label}</p></TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .book-page canvas { display: block !important; }
        .book-page .react-pdf__Page__textContent {
          user-select: text;
          font-family: ${fontFamily};
          font-size: ${fontSize}px;
          line-height: 1.9;
          letter-spacing: 0.3px;
        }
        .book-page .react-pdf__Page__annotations { pointer-events: auto; }
        .book-page .react-pdf__Page__textContent ::selection {
          background: rgba(99, 102, 241, 0.3);
        }
      `}</style>
    </div>
  );
};

export default BookReader;
