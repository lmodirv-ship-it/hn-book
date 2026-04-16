import {
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
  Headphones, Volume2
} from "lucide-react";

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
  const bg = isDarkTheme ? "bg-[#16213e]/95" : "bg-white/95";
  const border = isDarkTheme ? "border-white/5" : "border-gray-200";
  const btnClass = isDarkTheme ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500";
  const textClass = isDarkTheme ? "text-gray-400" : "text-gray-500";
  const textSubClass = isDarkTheme ? "text-gray-500" : "text-gray-400";
  const inputClass = isDarkTheme
    ? "bg-white/5 text-white border-white/10 focus:border-emerald-500/50"
    : "bg-gray-100 text-gray-800 border-gray-200 focus:border-primary/50";
  const progressBg = isDarkTheme ? "bg-white/5" : "bg-gray-200";
  const progressFill = isDarkTheme
    ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
    : "bg-gradient-to-r from-primary to-primary/80";
  const progressDot = isDarkTheme ? "bg-emerald-400 shadow-emerald-500/30" : "bg-primary shadow-primary/30";
  const activeModeClass = isDarkTheme ? "bg-white/10 text-white" : "bg-gray-200 text-gray-800";
  const inactiveModeClass = isDarkTheme ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600";
  const modeBgClass = isDarkTheme ? "bg-white/5" : "bg-gray-100";

  const progress = numPages > 0 ? (currentPage / numPages) * 100 : 0;

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInputValue);
    if (!isNaN(p)) onGoToPage(p);
    onPageInputChange("");
  };

  return (
    <div className={`flex-shrink-0 ${bg} backdrop-blur border-t ${border} z-50`}>
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
        {/* Page info */}
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
        </div>

        {/* Center controls */}
        <div className="flex items-center gap-1">
          <button onClick={onZoomOut} className={`p-1.5 rounded-lg ${btnClass} transition-colors`}>
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className={`text-[11px] ${textClass} min-w-[3rem] text-center`}>
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={onZoomIn} className={`p-1.5 rounded-lg ${btnClass} transition-colors`}>
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className={`w-px h-5 ${isDarkTheme ? "bg-white/10" : "bg-gray-200"} mx-1`} />

          <button onClick={onNextPage} disabled={currentPage >= numPages} className={`p-1.5 rounded-lg ${btnClass} disabled:opacity-30 transition-colors`}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={onPrevPage} disabled={currentPage <= 1} className={`p-1.5 rounded-lg ${btnClass} disabled:opacity-30 transition-colors`}>
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className={`w-px h-5 ${isDarkTheme ? "bg-white/10" : "bg-gray-200"} mx-1`} />

          <button
            onClick={onToggleTTS}
            className={`p-1.5 rounded-lg transition-colors ${isTTSPlaying ? "bg-emerald-500/20 text-emerald-400" : btnClass}`}
          >
            {isTTSPlaying ? <Volume2 className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
          </button>
        </div>

        {/* View modes */}
        <div className={`flex items-center gap-0.5 ${modeBgClass} rounded-lg p-0.5`}>
          <button
            onClick={() => onSetViewMode("single")}
            className={`p-1.5 rounded transition-colors ${viewMode === "single" ? activeModeClass : inactiveModeClass}`}
            title="صفحة واحدة"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="6" y="3" width="12" height="18" rx="1" />
            </svg>
          </button>
          <button
            onClick={() => onSetViewMode("double")}
            className={`p-1.5 rounded transition-colors hidden sm:block ${viewMode === "double" ? activeModeClass : inactiveModeClass}`}
            title="صفحتين"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="9" height="18" rx="1" />
              <rect x="13" y="3" width="9" height="18" rx="1" />
            </svg>
          </button>
          <button
            onClick={() => onSetViewMode("scroll")}
            className={`p-1.5 rounded transition-colors ${viewMode === "scroll" ? activeModeClass : inactiveModeClass}`}
            title="تمرير مستمر"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="6" y="2" width="12" height="20" rx="1" />
              <line x1="9" y1="7" x2="15" y2="7" />
              <line x1="9" y1="11" x2="15" y2="11" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReaderToolbar;
