import { motion, AnimatePresence } from "framer-motion";
import { X, Bookmark as BookmarkIcon, Trash2 } from "lucide-react";
import type { Bookmark } from "./useBookmarks";

interface ReaderSidebarProps {
  show: boolean;
  numPages: number;
  currentPage: number;
  bookmarks: Bookmark[];
  isDarkTheme: boolean;
  onGoToPage: (page: number) => void;
  onClose: () => void;
  onRemoveBookmark: (page: number) => void;
}

const ReaderSidebar = ({
  show, numPages, currentPage, bookmarks, isDarkTheme,
  onGoToPage, onClose, onRemoveBookmark,
}: ReaderSidebarProps) => {
  const bg = isDarkTheme ? "bg-[#16213e]" : "bg-gray-50";
  const border = isDarkTheme ? "border-white/5" : "border-gray-200";
  const textTitle = isDarkTheme ? "text-white" : "text-gray-800";
  const textSub = isDarkTheme ? "text-gray-400" : "text-gray-600";
  const activeClass = isDarkTheme ? "bg-emerald-500/20 text-emerald-400" : "bg-primary/10 text-primary";
  const hoverClass = isDarkTheme ? "hover:bg-white/5 hover:text-white" : "hover:bg-gray-100 hover:text-gray-800";
  const closeBtn = isDarkTheme ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-800";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          className={`${bg} border-l ${border} overflow-y-auto flex-shrink-0 z-30`}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-semibold ${textTitle}`}>المحتويات</h3>
              <button onClick={onClose} className={closeBtn}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bookmarks section */}
            {bookmarks.length > 0 && (
              <div className="mb-4">
                <p className={`text-[11px] font-semibold uppercase tracking-wider ${textSub} mb-2 flex items-center gap-1`}>
                  <BookmarkIcon className="w-3 h-3" /> العلامات المرجعية
                </p>
                <div className="space-y-0.5">
                  {bookmarks.map((b) => (
                    <div key={b.page} className="flex items-center gap-1">
                      <button
                        onClick={() => { onGoToPage(b.page); onClose(); }}
                        className={`flex-1 text-right px-3 py-1.5 rounded-lg text-xs transition-colors ${
                          b.page === currentPage ? activeClass : `${textSub} ${hoverClass}`
                        }`}
                      >
                        ⭐ {b.label}
                      </button>
                      <button
                        onClick={() => onRemoveBookmark(b.page)}
                        className="p-1 rounded text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className={`h-px ${isDarkTheme ? "bg-white/10" : "bg-gray-200"} my-3`} />
              </div>
            )}

            {/* Pages list */}
            <p className={`text-[11px] font-semibold uppercase tracking-wider ${textSub} mb-2`}>
              الصفحات ({numPages})
            </p>
            <div className="space-y-0.5 max-h-[calc(100vh-280px)] overflow-y-auto">
              {Array.from({ length: Math.min(numPages, 100) }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => { onGoToPage(page); onClose(); }}
                  className={`w-full text-right px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    page === currentPage ? activeClass : `${textSub} ${hoverClass}`
                  }`}
                >
                  صفحة {page}
                </button>
              ))}
              {numPages > 100 && (
                <p className={`${textSub} text-xs text-center py-2`}>
                  ... و {numPages - 100} صفحة أخرى
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReaderSidebar;
