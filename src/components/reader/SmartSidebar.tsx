import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Bookmark as BookmarkIcon, Trash2, StickyNote, BookOpen,
  FileText, Send, Highlighter
} from "lucide-react";
import type { Bookmark } from "./useBookmarks";
import type { Note } from "./useNotes";
import type { Highlight } from "./useHighlights";

type SidebarTab = "bookmarks" | "notes" | "highlights" | "summary" | "pages";

interface SmartSidebarProps {
  show: boolean;
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
  onRemoveBookmark: (page: number) => void;
  onAddNote: (page: number, text: string) => void;
  onRemoveNote: (noteId: string) => void;
  onRemoveHighlight: (highlightId: string) => void;
}

const SmartSidebar = ({
  show, numPages, currentPage, bookmarks, notes, highlights, bookDescription,
  isDarkTheme, isMobile,
  onGoToPage, onClose, onRemoveBookmark, onAddNote, onRemoveNote, onRemoveHighlight,
}: SmartSidebarProps) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>("bookmarks");
  const [noteInput, setNoteInput] = useState("");

  const bg = isDarkTheme ? "bg-[#16213e]" : "bg-gray-50";
  const border = isDarkTheme ? "border-white/5" : "border-gray-200";
  const textTitle = isDarkTheme ? "text-white" : "text-gray-800";
  const textSub = isDarkTheme ? "text-gray-400" : "text-gray-600";
  const activeClass = isDarkTheme ? "bg-emerald-500/20 text-emerald-400" : "bg-primary/10 text-primary";
  const hoverClass = isDarkTheme ? "hover:bg-white/5 hover:text-white" : "hover:bg-gray-100 hover:text-gray-800";
  const closeBtn = isDarkTheme ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-800";
  const tabActive = isDarkTheme ? "bg-white/10 text-white" : "bg-gray-200 text-gray-800";
  const tabInactive = isDarkTheme ? "text-gray-500 hover:text-gray-300 hover:bg-white/5" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100";
  const inputClass = isDarkTheme
    ? "bg-white/5 text-white border-white/10 placeholder:text-gray-600 focus:border-emerald-500/50"
    : "bg-white text-gray-800 border-gray-200 placeholder:text-gray-400 focus:border-primary/50";
  const cardBg = isDarkTheme ? "bg-white/5 border-white/5" : "bg-white border-gray-200";

  const sidebarWidth = isMobile ? "100vw" : 300;

  const tabs: { id: SidebarTab; icon: typeof BookmarkIcon; label: string; count?: number }[] = [
    { id: "bookmarks", icon: BookmarkIcon, label: "علامات", count: bookmarks.length },
    { id: "highlights", icon: Highlighter, label: "تمييز", count: highlights.length },
    { id: "notes", icon: StickyNote, label: "ملاحظات", count: notes.length },
    { id: "summary", icon: FileText, label: "ملخص" },
    { id: "pages", icon: BookOpen, label: "صفحات" },
  ];

  const handleAddNote = () => {
    if (noteInput.trim()) {
      onAddNote(currentPage, noteInput);
      setNoteInput("");
    }
  };

  return (
    <AnimatePresence>
      {show && (
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
            initial={isMobile ? { x: "100%" } : { width: 0, opacity: 0 }}
            animate={isMobile ? { x: 0 } : { width: sidebarWidth, opacity: 1 }}
            exit={isMobile ? { x: "100%" } : { width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`${bg} border-l ${border} flex-shrink-0 z-50 flex flex-col ${
              isMobile ? "fixed inset-y-0 right-0 w-[85vw] max-w-[360px]" : "overflow-hidden"
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between p-3 border-b ${border}`}>
              <h3 className={`text-sm font-semibold ${textTitle}`}>لوحة القراءة</h3>
              <button onClick={onClose} className={closeBtn}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className={`flex gap-0.5 p-1.5 border-b ${border} overflow-x-auto`}>
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
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white text-[8px] flex items-center justify-center">
                      {tab.count > 9 ? "9+" : tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3">
              {/* Bookmarks Tab */}
              {activeTab === "bookmarks" && (
                <div className="space-y-1">
                  {bookmarks.length === 0 ? (
                    <EmptyState icon={BookmarkIcon} text="لا توجد علامات مرجعية" sub="اضغط على أيقونة العلامة في الشريط العلوي" isDarkTheme={isDarkTheme} />
                  ) : (
                    bookmarks.map((b) => (
                      <div key={b.page} className={`flex items-center gap-1 rounded-lg border ${cardBg} p-2`}>
                        <button
                          onClick={() => { onGoToPage(b.page); if (isMobile) onClose(); }}
                          className={`flex-1 text-right text-xs transition-colors ${
                            b.page === currentPage ? activeClass : `${textSub} ${hoverClass}`
                          } rounded px-2 py-1`}
                        >
                          <span className="text-yellow-500">⭐</span> {b.label}
                        </button>
                        <button onClick={() => onRemoveBookmark(b.page)} className="p-1 rounded text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Highlights Tab */}
              {activeTab === "highlights" && (
                <div className="space-y-2">
                  {highlights.length === 0 ? (
                    <EmptyState icon={Highlighter} text="لا توجد تمييزات" sub="حدد نصًا في الكتاب ثم اختر لون التمييز" isDarkTheme={isDarkTheme} />
                  ) : (
                    highlights.map((h) => (
                      <div key={h.id} className={`rounded-lg border ${cardBg} p-3`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <button
                              onClick={() => { onGoToPage(h.page); if (isMobile) onClose(); }}
                              className={`text-[10px] font-medium ${isDarkTheme ? "text-emerald-400" : "text-primary"} hover:underline`}
                            >
                              صفحة {h.page}
                            </button>
                            <p
                              className={`text-xs mt-1 leading-relaxed px-2 py-1 rounded`}
                              style={{ backgroundColor: h.color + "30", borderRight: `3px solid ${h.color}` }}
                            >
                              {h.text.slice(0, 120)}{h.text.length > 120 ? "..." : ""}
                            </p>
                          </div>
                          <button onClick={() => onRemoveHighlight(h.id)} className="p-1 rounded text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-colors flex-shrink-0">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Notes Tab */}
              {activeTab === "notes" && (
                <div className="space-y-3">
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                      placeholder={`ملاحظة على صفحة ${currentPage}...`}
                      className={`flex-1 rounded-lg px-3 py-2 text-xs border outline-none ${inputClass}`}
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={!noteInput.trim()}
                      className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-30 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {notes.length === 0 ? (
                    <EmptyState icon={StickyNote} text="لا توجد ملاحظات" isDarkTheme={isDarkTheme} />
                  ) : (
                    notes.map((note) => (
                      <div key={note.id} className={`rounded-lg border ${cardBg} p-3`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <button
                              onClick={() => { onGoToPage(note.page); if (isMobile) onClose(); }}
                              className={`text-[10px] font-medium ${isDarkTheme ? "text-emerald-400" : "text-primary"} hover:underline`}
                            >
                              صفحة {note.page}
                            </button>
                            <p className={`text-xs mt-1 ${textSub} leading-relaxed`}>{note.text}</p>
                          </div>
                          <button onClick={() => onRemoveNote(note.id)} className="p-1 rounded text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-colors flex-shrink-0">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Summary Tab */}
              {activeTab === "summary" && (
                <div>
                  {bookDescription ? (
                    <div className={`rounded-lg border ${cardBg} p-4`}>
                      <h4 className={`text-xs font-semibold ${textTitle} mb-2 flex items-center gap-1`}>
                        <FileText className="w-3.5 h-3.5" /> ملخص الكتاب
                      </h4>
                      <p className={`text-xs ${textSub} leading-relaxed whitespace-pre-line`}>{bookDescription}</p>
                    </div>
                  ) : (
                    <EmptyState icon={FileText} text="لا يوجد ملخص متاح" isDarkTheme={isDarkTheme} />
                  )}

                  <div className={`mt-4 rounded-lg border ${cardBg} p-4 space-y-2`}>
                    <h4 className={`text-xs font-semibold ${textTitle} mb-2`}>📊 إحصائيات القراءة</h4>
                    <StatRow label="عدد الصفحات" value={String(numPages)} textSub={textSub} textTitle={textTitle} />
                    <StatRow label="الصفحة الحالية" value={String(currentPage)} textSub={textSub} textTitle={textTitle} />
                    <StatRow
                      label="التقدم"
                      value={`${numPages > 0 ? Math.round((currentPage / numPages) * 100) : 0}%`}
                      textSub={textSub}
                      textTitle={isDarkTheme ? "text-emerald-400" : "text-primary"}
                    />
                    <StatRow label="العلامات" value={String(bookmarks.length)} textSub={textSub} textTitle={textTitle} />
                    <StatRow label="التمييزات" value={String(highlights.length)} textSub={textSub} textTitle={textTitle} />
                    <StatRow label="الملاحظات" value={String(notes.length)} textSub={textSub} textTitle={textTitle} />
                  </div>
                </div>
              )}

              {/* Pages Tab */}
              {activeTab === "pages" && (
                <div className="space-y-0.5 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {Array.from({ length: Math.min(numPages, 200) }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => { onGoToPage(page); if (isMobile) onClose(); }}
                      className={`w-full text-right px-3 py-1.5 rounded-lg text-xs transition-colors ${
                        page === currentPage ? activeClass : `${textSub} ${hoverClass}`
                      }`}
                    >
                      صفحة {page}
                      {bookmarks.some((b) => b.page === page) && <span className="mr-1">⭐</span>}
                      {notes.some((n) => n.page === page) && <span className="mr-1">📝</span>}
                      {highlights.some((h) => h.page === page) && <span className="mr-1">🎨</span>}
                    </button>
                  ))}
                  {numPages > 200 && (
                    <p className={`${textSub} text-xs text-center py-2`}>... و {numPages - 200} صفحة أخرى</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Helper components
const EmptyState = ({ icon: Icon, text, sub, isDarkTheme }: { icon: any; text: string; sub?: string; isDarkTheme: boolean }) => (
  <div className="text-center py-8">
    <Icon className={`w-8 h-8 mx-auto mb-2 ${isDarkTheme ? "text-gray-600" : "text-gray-300"}`} />
    <p className={`text-xs ${isDarkTheme ? "text-gray-400" : "text-gray-600"}`}>{text}</p>
    {sub && <p className={`text-[10px] ${isDarkTheme ? "text-gray-600" : "text-gray-400"} mt-1`}>{sub}</p>}
  </div>
);

const StatRow = ({ label, value, textSub, textTitle }: { label: string; value: string; textSub: string; textTitle: string }) => (
  <div className="flex justify-between">
    <span className={`text-[11px] ${textSub}`}>{label}</span>
    <span className={`text-[11px] font-medium ${textTitle}`}>{value}</span>
  </div>
);

export default SmartSidebar;
