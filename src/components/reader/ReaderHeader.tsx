import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, List, Search, Bookmark, BookmarkCheck,
  Maximize2, Minimize2, Sun, Moon, Eye, EyeOff,
  Settings, Type, Palette
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  onToggleSettings?: () => void;
}

const ReaderHeader = ({
  bookId, bookName, category, referenceCode,
  isFullscreen, showSidebar, showSearch, isBookmarked, isDarkTheme, isFocusMode,
  onToggleSidebar, onToggleSearch, onToggleFullscreen, onToggleBookmark, onToggleTheme, onToggleFocusMode,
  onToggleSettings,
}: ReaderHeaderProps) => {
  const navigate = useNavigate();

  const bg = isDarkTheme ? "bg-[#1a1a2e]/95" : "bg-[#faf8f5]/95";
  const border = isDarkTheme ? "border-white/5" : "border-[#e8e0d4]";
  const textMain = isDarkTheme ? "text-gray-300" : "text-[#5c4b3a]";
  const textSub = isDarkTheme ? "text-gray-500" : "text-[#8a7a6a]";
  const btnBase = "p-1.5 rounded-lg transition-all duration-200 active:scale-90";
  const btnHover = isDarkTheme
    ? `${btnBase} hover:bg-white/10 text-gray-400 hover:text-gray-200`
    : `${btnBase} hover:bg-[#f0ece4] text-[#8a7a6a] hover:text-[#5c4b3a]`;
  const btnActive = isDarkTheme
    ? `${btnBase} bg-white/10 text-white`
    : `${btnBase} bg-[#e8e0d4] text-[#5c4b3a]`;

  return (
    <TooltipProvider delayDuration={400}>
      <header className={`flex-shrink-0 h-11 sm:h-12 ${bg} backdrop-blur-md border-b ${border} flex items-center justify-between px-2 sm:px-3 z-50`}>
        <div className="flex items-center gap-0.5 sm:gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => navigate(`/product/${bookId}`)} className={btnHover}>
                <Home className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p className="text-xs">العودة للمنتج</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={onToggleSidebar} className={showSidebar ? btnActive : btnHover}>
                <List className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p className="text-xs">اللوحة الجانبية</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={onToggleSearch} className={`${showSearch ? btnActive : btnHover} hidden sm:block`}>
                <Search className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p className="text-xs">بحث في الكتاب</p></TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-1 min-w-0 max-w-[35%] sm:max-w-[40%]">
          <p className={`text-[11px] sm:text-xs font-medium ${textMain} truncate`}>{bookName}</p>
          <span className={`text-[10px] ${textSub} flex-shrink-0 hidden md:inline`}>
            {category} · {referenceCode}
          </span>
        </div>

        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={onToggleFocusMode} className={isFocusMode ? `${btnBase} text-emerald-400 bg-emerald-400/10` : btnHover}>
                {isFocusMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p className="text-xs">وضع التركيز</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={onToggleTheme} className={`${btnHover} hidden sm:block`}>
                {isDarkTheme ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p className="text-xs">{isDarkTheme ? "وضع فاتح" : "وضع داكن"}</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                onClick={onToggleBookmark}
                whileTap={{ scale: 0.8, rotate: isBookmarked ? 0 : 15 }}
                className={isBookmarked ? `${btnBase} text-yellow-400 bg-yellow-400/10` : btnHover}
              >
                {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              </motion.button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p className="text-xs">{isBookmarked ? "إزالة العلامة" : "إضافة علامة"}</p></TooltipContent>
          </Tooltip>

          {onToggleSettings && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={onToggleSettings} className={`${btnHover} hidden sm:block`}>
                  <Settings className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p className="text-xs">إعدادات القارئ</p></TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={onToggleFullscreen} className={`${btnHover} hidden sm:block`}>
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p className="text-xs">{isFullscreen ? "إنهاء ملء الشاشة" : "ملء الشاشة"}</p></TooltipContent>
          </Tooltip>
        </div>
      </header>
    </TooltipProvider>
  );
};

export default ReaderHeader;
