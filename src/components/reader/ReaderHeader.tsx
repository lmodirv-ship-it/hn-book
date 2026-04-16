import { useNavigate } from "react-router-dom";
import {
  Home, List, Search, Bookmark, BookmarkCheck,
  Maximize2, Minimize2, Sun, Moon, Eye, EyeOff
} from "lucide-react";

interface ReaderHeaderProps {
  bookId: string;
  bookName: string;
  category: string;
  referenceCode: string | null;
  isFullscreen: boolean;
  showSidebar: boolean;
  showSearch: boolean;
  isBookmarked: boolean;
  isDarkTheme: boolean;
  isFocusMode: boolean;
  onToggleSidebar: () => void;
  onToggleSearch: () => void;
  onToggleFullscreen: () => void;
  onToggleBookmark: () => void;
  onToggleTheme: () => void;
  onToggleFocusMode: () => void;
}

const ReaderHeader = ({
  bookId, bookName, category, referenceCode,
  isFullscreen, showSidebar, showSearch, isBookmarked, isDarkTheme, isFocusMode,
  onToggleSidebar, onToggleSearch, onToggleFullscreen, onToggleBookmark, onToggleTheme, onToggleFocusMode,
}: ReaderHeaderProps) => {
  const navigate = useNavigate();

  const bg = isDarkTheme ? "bg-[#16213e]/95" : "bg-white/95";
  const border = isDarkTheme ? "border-white/5" : "border-gray-200";
  const textMain = isDarkTheme ? "text-gray-300" : "text-gray-700";
  const textSub = isDarkTheme ? "text-gray-500" : "text-gray-400";
  const btnHover = isDarkTheme ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500";

  return (
    <header className={`flex-shrink-0 h-11 sm:h-12 ${bg} backdrop-blur border-b ${border} flex items-center justify-between px-2 sm:px-3 z-50`}>
      <div className="flex items-center gap-0.5 sm:gap-1.5">
        <button onClick={() => navigate(`/product/${bookId}`)} className={`p-1.5 rounded-lg ${btnHover} transition-colors`}>
          <Home className="w-4 h-4" />
        </button>
        <button onClick={onToggleSidebar} className={`p-1.5 rounded-lg ${btnHover} transition-colors ${showSidebar ? (isDarkTheme ? "bg-white/10 text-white" : "bg-gray-200 text-gray-800") : ""}`}>
          <List className="w-4 h-4" />
        </button>
        <button onClick={onToggleSearch} className={`p-1.5 rounded-lg ${btnHover} transition-colors hidden sm:block ${showSearch ? (isDarkTheme ? "bg-white/10 text-white" : "bg-gray-200 text-gray-800") : ""}`}>
          <Search className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-1 min-w-0 max-w-[35%] sm:max-w-[40%]">
        <p className={`text-[11px] sm:text-xs font-medium ${textMain} truncate`}>{bookName}</p>
        <span className={`text-[10px] ${textSub} flex-shrink-0 hidden md:inline`}>
          {category} · {referenceCode}
        </span>
      </div>

      <div className="flex items-center gap-0.5">
        <button onClick={onToggleFocusMode} className={`p-1.5 rounded-lg transition-colors ${isFocusMode ? "text-emerald-400 bg-emerald-400/10" : btnHover}`} title="وضع التركيز">
          {isFocusMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button onClick={onToggleTheme} className={`p-1.5 rounded-lg ${btnHover} transition-colors hidden sm:block`} title={isDarkTheme ? "وضع فاتح" : "وضع داكن"}>
          {isDarkTheme ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button onClick={onToggleBookmark} className={`p-1.5 rounded-lg transition-colors ${isBookmarked ? "text-yellow-400 bg-yellow-400/10" : btnHover}`} title="إضافة/إزالة علامة">
          {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        </button>
        <button onClick={onToggleFullscreen} className={`p-1.5 rounded-lg ${btnHover} hidden sm:block transition-colors`}>
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};

export default ReaderHeader;
