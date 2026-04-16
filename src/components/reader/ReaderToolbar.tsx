import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
  Headphones, Volume2, Clock
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ViewMode = "single" | "double" | "scroll";

interface ReaderToolbarProps {
  currentPage: number;
  numPages: number;
  zoom: number;
  viewMode: ViewMode;
  isTTSPlaying: boolean;
  isDarkTheme: boolean;
  pageInputValue: string;
  onNextPage: () => void;
  onPrevPage: () => void;
  onGoToPage: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSetViewMode: (mode: ViewMode) => void;
  onToggleTTS: () => void;
  onPageInputChange: (value: string) => void;
}

const ReaderToolbar = ({
  currentPage, numPages, zoom, viewMode, isTTSPlaying, isDarkTheme,
  pageInputValue, onNextPage, onPrevPage, onGoToPage,
  onZoomIn, onZoomOut, onSetViewMode, onToggleTTS, onPageInputChange,
}: ReaderToolbarProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Auto-hide toolbar after 4 seconds of inactivity
  useEffect(() => {
    const resetTimer = () => {
      setIsVisible(true);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = setTimeout(() => setIsVisible(false), 4000);
    };

    const events = ["mousemove", "touchstart", "keydown"];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  const bg = isDarkTheme ? "bg-[#1a1a2e]/95" : "bg-[#faf8f5]/95";
  const border = isDarkTheme ? "border-white/5" : "border-[#e8e0d4]";
  const btnBase = "p-1.5 rounded-lg transition-all duration-200 active:scale-90";
  const btnClass = isDarkTheme
    ? `${btnBase} hover:bg-white/10 text-gray-400 hover:text-gray-200`
    : `${btnBase} hover:bg-[#e8e0d4] text-[#8a7a6a] hover:text-[#5c4b3a]`;
  const textClass = isDarkTheme ? "text-gray-400" : "text-[#8a7a6a]";
  const textSubClass = isDarkTheme ? "text-gray-500" : "text-[#a89a8a]";
  const inputClass = isDarkTheme
    ? "bg-white/5 text-white border-white/10 focus:border-emerald-500/50"
    : "bg-[#f5f0e8] text-[#5c4b3a] border-[#e0d8cc] focus:border-[#8a7a6a]";
  const progressBg = isDarkTheme ? "bg-white/5" : "bg-[#e0d8cc]";
  const progressFill = isDarkTheme
    ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
    : "bg-gradient-to-r from-[#8a7a6a] to-[#a89a8a]";
  const progressDot = isDarkTheme ? "bg-emerald-400 shadow-emerald-500/30" : "bg-[#8a7a6a] shadow-[#8a7a6a]/30";
  const activeModeClass = isDarkTheme ? "bg-white/10 text-white" : "bg-[#e8e0d4] text-[#5c4b3a]";
  const inactiveModeClass = isDarkTheme ? "text-gray-500 hover:text-gray-300" : "text-[#a89a8a] hover:text-[#5c4b3a]";
  const modeBgClass = isDarkTheme ? "bg-white/5" : "bg-[#f0ece4]";

  const progress = numPages > 0 ? (currentPage / numPages) * 100 : 0;

  // Estimated reading time (avg 2 min per page)
  const remainingPages = numPages - currentPage;
  const estimatedMinutes = Math.ceil(remainingPages * 1.5);
  const timeDisplay = estimatedMinutes > 60
    ? `${Math.floor(estimatedMinutes / 60)} ساعة ${estimatedMinutes % 60} دقيقة`
    : `${estimatedMinutes} دقيقة`;

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInputValue);
    if (!isNaN(p)) onGoToPage(p);
    onPageInputChange("");
  };

  return (
    <TooltipProvider delayDuration={400}>
      <motion.div
        ref={toolbarRef}
        animate={{ y: isVisible ? 0 : 60, opacity: isVisible ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        onMouseEnter={() => {
          setIsVisible(true);
          if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        }}
        onMouseLeave={() => {
          hideTimeoutRef.current = setTimeout(() => setIsVisible(false), 2000);
        }}
        className={`flex-shrink-0 ${bg} backdrop-blur-md border-t ${border} z-50`}
      >
        {/* Progress bar */}
        <div
          className={`h-1.5 ${progressBg} relative cursor-pointer group`}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            onGoToPage(Math.round(ratio * numPages));
          }}
        >
          <div className={`h-full ${progressFill} transition-all duration-300 relative`} style={{ width: `${progress}%` }}>
            <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${progressDot} shadow-lg opacity-0 group-hover:opacity-100 transition-opacity`} />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-3 h-12">
          {/* Page info + time estimate */}
          <div className="flex items-center gap-2">
            <form onSubmit={handlePageSubmit} className="flex items-center gap-1">
              <span className={`text-[11px] ${textClass}`}>صفحة</span>
              <input
                type="text"
                value={pageInputValue || currentPage}
                onChange={(e) => onPageInputChange(e.target.value)}
                onFocus={() => onPageInputChange(String(currentPage))}
                onBlur={() => onPageInputChange("")}
                className={`w-10 rounded px-1.5 py-0.5 text-xs text-center border outline-none ${inputClass}`}
              />
              <span className={`text-[11px] ${textSubClass}`}>/ {numPages}</span>
            </form>
            <span className={`text-[10px] ${textSubClass} hidden sm:inline`}>
              ({Math.round(progress)}%)
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`text-[10px] ${textSubClass} hidden md:inline-flex items-center gap-0.5 cursor-default`}>
                  <Clock className="w-3 h-3" />
                  {timeDisplay}
                </span>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">الوقت المتبقي المقدّر للقراءة</p></TooltipContent>
            </Tooltip>
          </div>

          {/* Center controls */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={onZoomOut} className={btnClass}><ZoomOut className="w-4 h-4" /></button>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">تصغير</p></TooltipContent>
            </Tooltip>
            <span className={`text-[11px] ${textClass} min-w-[3rem] text-center`}>
              {Math.round(zoom * 100)}%
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={onZoomIn} className={btnClass}><ZoomIn className="w-4 h-4" /></button>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">تكبير</p></TooltipContent>
            </Tooltip>

            <div className={`w-px h-5 ${isDarkTheme ? "bg-white/10" : "bg-[#e0d8cc]"} mx-1`} />

            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={onNextPage} disabled={currentPage >= numPages} className={`${btnClass} disabled:opacity-30`}>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">الصفحة التالية</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={onPrevPage} disabled={currentPage <= 1} className={`${btnClass} disabled:opacity-30`}>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">الصفحة السابقة</p></TooltipContent>
            </Tooltip>

            <div className={`w-px h-5 ${isDarkTheme ? "bg-white/10" : "bg-[#e0d8cc]"} mx-1`} />

            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  onClick={onToggleTTS}
                  whileTap={{ scale: 0.85 }}
                  className={`${btnBase} transition-colors ${isTTSPlaying ? "bg-emerald-500/20 text-emerald-400" : btnClass}`}
                >
                  {isTTSPlaying ? <Volume2 className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
                </motion.button>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">{isTTSPlaying ? "إيقاف القراءة" : "قراءة صوتية"}</p></TooltipContent>
            </Tooltip>
          </div>

          {/* View modes */}
          <div className={`flex items-center gap-0.5 ${modeBgClass} rounded-lg p-0.5`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onSetViewMode("single")}
                  className={`p-1.5 rounded transition-all duration-200 ${viewMode === "single" ? activeModeClass : inactiveModeClass}`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="6" y="3" width="12" height="18" rx="1" />
                  </svg>
                </button>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">صفحة واحدة</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onSetViewMode("double")}
                  className={`p-1.5 rounded transition-all duration-200 hidden sm:block ${viewMode === "double" ? activeModeClass : inactiveModeClass}`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="9" height="18" rx="1" />
                    <rect x="13" y="3" width="9" height="18" rx="1" />
                  </svg>
                </button>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">صفحتين</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onSetViewMode("scroll")}
                  className={`p-1.5 rounded transition-all duration-200 ${viewMode === "scroll" ? activeModeClass : inactiveModeClass}`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="6" y="2" width="12" height="20" rx="1" />
                    <line x1="9" y1="7" x2="15" y2="7" />
                    <line x1="9" y1="11" x2="15" y2="11" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                </button>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">تمرير مستمر</p></TooltipContent>
            </Tooltip>
          </div>
        </div>
      </motion.div>
    </TooltipProvider>
  );
};

export default ReaderToolbar;
