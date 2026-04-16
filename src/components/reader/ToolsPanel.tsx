import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Bookmark as BookmarkIcon, Trash2, StickyNote, BookOpen,
  FileText, Send, Highlighter, PanelRightClose, PanelRightOpen
} from "lucide-react";
import type { Bookmark } from "./useBookmarks";
import type { Note } from "./useNotes";
import type { Highlight } from "./useHighlights";

type ToolsTab = "highlights" | "notes" | "bookmarks" | "summary";

interface ToolsPanelProps {
  show: boolean;
  collapsed: boolean;
  numPages: number;
  currentPage: number;
  bookmarks: Bookmark[];
  notes: Note[];
  highlights: Highlight[];
  bookDescription: string | null;
  isDarkTheme: boolean;
  isMobile: boolean;
  onGoToPage: (page: number) => void;
  onClose: () => void;
  onToggleCollapse: () => void;
  onRemoveBookmark: (page: number) => void;
  onAddNote: (page: number, text: string) => void;
  onRemoveNote: (noteId: string) => void;
  onRemoveHighlight: (highlightId: string) => void;
}

const HIGHLIGHT_COLOR_LABELS: Record<string, string> = {
  "#fef08a": "مهم",
  "#bbf7d0": "فكرة",
  "#bfdbfe": "تعريف",
  "#fecaca": "سؤال",
  "#e9d5ff": "إلهام",
};

const ToolsPanel = ({
  show, collapsed, numPages, currentPage, bookmarks, notes, highlights, bookDescription,
  isDarkTheme, isMobile,
  onGoToPage, onClose, onToggleCollapse, onRemoveBookmark, onAddNote, onRemoveNote, onRemoveHighlight,
}: ToolsPanelProps) => {
  const [activeTab, setActiveTab] = useState<ToolsTab>("highlights");
  const [noteInput, setNoteInput] = useState("");

  const bg = isDarkTheme ? "bg-[#0d1117]/95 backdrop-blur-xl" : "bg-white/95 backdrop-blur-xl";
  const border = isDarkTheme ? "border-white/5" : "border-gray-200";
  const textTitle = isDarkTheme ? "text-white" : "text-gray-800";
  const textSub = isDarkTheme ? "text-gray-400" : "text-gray-600";
  const hoverBg = isDarkTheme ? "hover:bg-white/5" : "hover:bg-gray-50";
  const activeClass = isDarkTheme ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-indigo-600";
  const tabActive = isDarkTheme ? "bg-white/10 text-white" : "bg-gray-200 text-gray-800";
  const tabInactive = isDarkTheme ? "text-gray-500 hover:text-gray-300 hover:bg-white/5" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100";
  const inputClass = isDarkTheme
    ? "bg-white/5 text-white border-white/10 placeholder:text-gray-600 focus:border-indigo-500/50"
    : "bg-gray-50 text-gray-800 border-gray-200 placeholder:text-gray-400 focus:border-indigo-500/50";
  const cardBg = isDarkTheme ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-100";

  const tabs: { id: ToolsTab; icon: typeof BookmarkIcon; label: string; count: number }[] = [
    { id: "highlights", icon: Highlighter, label: "تمييز", count: highlights.length },
    { id: "notes", icon: StickyNote, label: "ملاحظات", count: notes.length },
    { id: "bookmarks", icon: BookmarkIcon, label: "مرجعية", count: bookmarks.length },
    { id: "summary", icon: FileText, label: "ملخص", count: 0 },
  ];

  const handleAddNote = () => {
    if (noteInput.trim()) {
      onAddNote(currentPage, noteInput);
      setNoteInput("");
    }
  };

  // Collapsed mini-bar
  if (collapsed && !isMobile) {
    return (
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: 48 }}
        className={`${bg} border-r ${border} flex flex-col items-center py-3 gap-2 flex-shrink-0`}
      >
        <button onClick={onToggleCollapse} className={`p-2 rounded-lg ${hoverBg} ${textSub}`}>
          <PanelRightOpen className="w-4 h-4" />
        </button>
        <div className={`w-px h-4 ${isDarkTheme ? "bg-white/5" : "bg-gray-200"}`} />
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); onToggleCollapse(); }}
            className={`p-2 rounded-lg relative ${tabInactive}`}
            title={tab.label}
          >
            <tab.icon className="w-4 h-4" />
            {tab.count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-indigo-500 text-white text-[7px] flex items-center justify-center font-bold">
                {tab.count > 9 ? "9+" : tab.count}
              </span>
            )}
          </button>
        ))}
      </motion.div>
    );
  }

  if (!show) return null;

  return (
    <>
      {isMobile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}
      <motion.div
        initial={isMobile ? { x: "-100%" } : { width: 0, opacity: 0 }}
        animate={isMobile ? { x: 0 } : { width: 300, opacity: 1 }}
        exit={isMobile ? { x: "-100%" } : { width: 0, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={`${bg} border-r ${border} flex flex-col flex-shrink-0 z-50 ${
          isMobile ? "fixed inset-y-0 left-0 w-[85vw] max-w-[360px]" : "overflow-hidden"
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-3 border-b ${border}`}>
          <h3 className={`text-sm font-bold ${textTitle} flex items-center gap-2`}>
            <span className="text-indigo-400">🧠</span> أدوات القراءة
          </h3>
          <button onClick={isMobile ? onClose : onToggleCollapse} className={`p-1.5 rounded-lg ${hoverBg} ${textSub}`}>
            {isMobile ? <X className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex gap-0.5 p-1.5 border-b ${border}`}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] font-medium transition-all relative ${
                activeTab === tab.id ? tabActive : tabInactive
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-indigo-500 text-white text-[7px] flex items-center justify-center font-bold">
                  {tab.count > 9 ? "9+" : tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {/* Highlights */}
          {activeTab === "highlights" && (
            <div className="space-y-2">
              {highlights.length === 0 ? (
                <EmptyState isDarkTheme={isDarkTheme} icon="🎨" text="لا توجد تمييزات" sub="حدد نصًا واختر لون التمييز" />
              ) : (
                highlights.map((h) => (
                  <motion.div
                    key={h.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-xl border ${cardBg} p-3 group`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <button
                            onClick={() => { onGoToPage(h.page); if (isMobile) onClose(); }}
                            className={`text-[10px] font-medium ${isDarkTheme ? "text-indigo-400" : "text-indigo-500"} hover:underline`}
                          >
                            صفحة {h.page}
                          </button>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: h.color + "40", color: isDarkTheme ? "#fff" : "#333" }}>
                            {HIGHLIGHT_COLOR_LABELS[h.color] || "تمييز"}
                          </span>
                        </div>
                        <p
                          className={`text-xs leading-relaxed rounded-lg px-2.5 py-1.5 ${textSub}`}
                          style={{ backgroundColor: h.color + "15", borderRight: `3px solid ${h.color}` }}
                        >
                          {h.text.slice(0, 150)}{h.text.length > 150 ? "..." : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => onRemoveHighlight(h.id)}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {/* Notes */}
          {activeTab === "notes" && (
            <div className="space-y-3">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                  placeholder={`ملاحظة على صفحة ${currentPage}...`}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs border outline-none ${inputClass}`}
                />
                <button
                  onClick={handleAddNote}
                  disabled={!noteInput.trim()}
                  className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 disabled:opacity-30 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
              {notes.length === 0 ? (
                <EmptyState isDarkTheme={isDarkTheme} icon="📝" text="لا توجد ملاحظات" />
              ) : (
                notes.map((note) => (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-xl border ${cardBg} p-3 group`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => { onGoToPage(note.page); if (isMobile) onClose(); }}
                          className={`text-[10px] font-medium ${isDarkTheme ? "text-indigo-400" : "text-indigo-500"} hover:underline`}
                        >
                          صفحة {note.page}
                        </button>
                        <p className={`text-xs mt-1 ${textSub} leading-relaxed`}>{note.text}</p>
                      </div>
                      <button
                        onClick={() => onRemoveNote(note.id)}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {/* Bookmarks */}
          {activeTab === "bookmarks" && (
            <div className="space-y-1.5">
              {bookmarks.length === 0 ? (
                <EmptyState isDarkTheme={isDarkTheme} icon="🔖" text="لا توجد علامات مرجعية" sub="اضغط ⭐ في الشريط العلوي" />
              ) : (
                bookmarks.map((b) => (
                  <motion.div
                    key={b.page}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center gap-2 rounded-xl border ${cardBg} p-2.5 group`}
                  >
                    <button
                      onClick={() => { onGoToPage(b.page); if (isMobile) onClose(); }}
                      className={`flex-1 text-right text-xs transition-colors rounded-lg px-2 py-1 ${
                        b.page === currentPage ? activeClass : `${textSub} ${hoverBg}`
                      }`}
                    >
                      <span className="text-yellow-500 ml-1">⭐</span>{b.label}
                    </button>
                    <button
                      onClick={() => onRemoveBookmark(b.page)}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {/* Summary */}
          {activeTab === "summary" && (
            <div className="space-y-4">
              {bookDescription ? (
                <div className={`rounded-xl border ${cardBg} p-4`}>
                  <h4 className={`text-xs font-semibold ${textTitle} mb-2`}>📖 ملخص الكتاب</h4>
                  <p className={`text-xs ${textSub} leading-relaxed whitespace-pre-line`}>{bookDescription}</p>
                </div>
              ) : (
                <EmptyState isDarkTheme={isDarkTheme} icon="📄" text="لا يوجد ملخص متاح" />
              )}

              <div className={`rounded-xl border ${cardBg} p-4 space-y-2.5`}>
                <h4 className={`text-xs font-semibold ${textTitle}`}>📊 إحصائيات</h4>
                <StatRow label="الصفحات" value={`${currentPage} / ${numPages}`} textSub={textSub} textTitle={textTitle} />
                <div className="relative">
                  <div className={`h-2 rounded-full ${isDarkTheme ? "bg-white/5" : "bg-gray-200"}`}>
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${numPages > 0 ? (currentPage / numPages) * 100 : 0}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <span className={`text-[10px] ${isDarkTheme ? "text-indigo-400" : "text-indigo-500"} mt-1 block text-center font-medium`}>
                    {numPages > 0 ? Math.round((currentPage / numPages) * 100) : 0}% مكتمل
                  </span>
                </div>
                <StatRow label="العلامات" value={String(bookmarks.length)} textSub={textSub} textTitle={textTitle} />
                <StatRow label="التمييزات" value={String(highlights.length)} textSub={textSub} textTitle={textTitle} />
                <StatRow label="الملاحظات" value={String(notes.length)} textSub={textSub} textTitle={textTitle} />
                {numPages > 0 && (
                  <StatRow
                    label="وقت القراءة المتبقي"
                    value={`~${Math.ceil((numPages - currentPage) * 1.5)} دقيقة`}
                    textSub={textSub}
                    textTitle={isDarkTheme ? "text-indigo-400" : "text-indigo-500"}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
};

const EmptyState = ({ isDarkTheme, icon, text, sub }: { isDarkTheme: boolean; icon: string; text: string; sub?: string }) => (
  <div className="text-center py-8">
    <span className="text-3xl block mb-2">{icon}</span>
    <p className={`text-xs ${isDarkTheme ? "text-gray-400" : "text-gray-500"}`}>{text}</p>
    {sub && <p className={`text-[10px] ${isDarkTheme ? "text-gray-600" : "text-gray-400"} mt-1`}>{sub}</p>}
  </div>
);

const StatRow = ({ label, value, textSub, textTitle }: { label: string; value: string; textSub: string; textTitle: string }) => (
  <div className="flex justify-between">
    <span className={`text-[11px] ${textSub}`}>{label}</span>
    <span className={`text-[11px] font-medium ${textTitle}`}>{value}</span>
  </div>
);

export default ToolsPanel;
