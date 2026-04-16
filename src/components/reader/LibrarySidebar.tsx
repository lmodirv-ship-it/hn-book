import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Search, FolderOpen, Settings, ChevronRight, ChevronLeft,
  PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LibraryBook {
  id: string;
  name: string;
  category: string;
  image: string | null;
}

interface LibrarySidebarProps {
  currentBookId: string;
  isDarkTheme: boolean;
  collapsed: boolean;
  isMobile: boolean;
  onToggleCollapse: () => void;
  onSelectBook: (id: string) => void;
  onClose?: () => void;
}

const CATEGORIES = [
  { id: "all", label: "الكل", icon: "📚" },
  { id: "روايات", label: "روايات", icon: "📖" },
  { id: "تطوير الذات", label: "تطوير الذات", icon: "🧠" },
  { id: "تعليم", label: "تعليم", icon: "🎓" },
  { id: "تقنية", label: "تقنية", icon: "💻" },
  { id: "دين", label: "دين", icon: "🕌" },
];

const LibrarySidebar = ({
  currentBookId, isDarkTheme, collapsed, isMobile,
  onToggleCollapse, onSelectBook, onClose,
}: LibrarySidebarProps) => {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooks = async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, category, image")
        .eq("is_active", true)
        .not("pdf_url", "is", null)
        .order("name");
      setBooks(data || []);
      setLoading(false);
    };
    fetchBooks();
  }, []);

  const filtered = books.filter((b) => {
    const matchSearch = !search || b.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === "all" || b.category === activeCategory;
    return matchSearch && matchCat;
  });

  const bg = isDarkTheme
    ? "bg-[#0d1117]/95 backdrop-blur-xl"
    : "bg-white/95 backdrop-blur-xl";
  const border = isDarkTheme ? "border-white/5" : "border-gray-200";
  const textMain = isDarkTheme ? "text-gray-200" : "text-gray-800";
  const textSub = isDarkTheme ? "text-gray-500" : "text-gray-500";
  const inputBg = isDarkTheme
    ? "bg-white/5 border-white/10 text-white placeholder:text-gray-600"
    : "bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400";
  const hoverBg = isDarkTheme ? "hover:bg-white/5" : "hover:bg-gray-50";
  const activeBg = isDarkTheme ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" : "bg-indigo-50 border-indigo-200 text-indigo-600";
  const catActive = isDarkTheme ? "bg-white/10 text-white" : "bg-gray-200 text-gray-800";
  const catInactive = isDarkTheme ? "text-gray-500 hover:text-gray-300 hover:bg-white/5" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100";

  if (collapsed && !isMobile) {
    return (
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: 48 }}
        className={`${bg} border-l ${border} flex flex-col items-center py-3 gap-2 flex-shrink-0`}
      >
        <button onClick={onToggleCollapse} className={`p-2 rounded-lg ${hoverBg} ${textSub}`}>
          <PanelLeftOpen className="w-4 h-4" />
        </button>
        <div className={`w-px h-4 ${isDarkTheme ? "bg-white/5" : "bg-gray-200"}`} />
        {CATEGORIES.slice(0, 5).map((cat) => (
          <button
            key={cat.id}
            onClick={() => { setActiveCategory(cat.id); onToggleCollapse(); }}
            className={`p-2 rounded-lg text-sm ${catInactive}`}
            title={cat.label}
          >
            {cat.icon}
          </button>
        ))}
      </motion.div>
    );
  }

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
        initial={isMobile ? { x: "100%" } : { width: 0, opacity: 0 }}
        animate={isMobile ? { x: 0 } : { width: 280, opacity: 1 }}
        exit={isMobile ? { x: "100%" } : { width: 0, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={`${bg} border-l ${border} flex flex-col flex-shrink-0 z-50 ${
          isMobile ? "fixed inset-y-0 right-0 w-[80vw] max-w-[320px]" : "overflow-hidden"
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-3 border-b ${border}`}>
          <div className="flex items-center gap-2">
            <BookOpen className={`w-4 h-4 ${isDarkTheme ? "text-indigo-400" : "text-indigo-500"}`} />
            <h3 className={`text-sm font-bold ${textMain}`}>المكتبة</h3>
          </div>
          <button onClick={isMobile ? onClose : onToggleCollapse} className={`p-1.5 rounded-lg ${hoverBg} ${textSub}`}>
            {isMobile ? <ChevronLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search className={`absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${textSub}`} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث في المكتبة..."
              className={`w-full rounded-xl pr-9 pl-3 py-2 text-xs border outline-none ${inputBg}`}
            />
          </div>
        </div>

        {/* Categories */}
        <div className={`flex gap-1 px-3 pb-2 overflow-x-auto`}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.id ? catActive : catInactive
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* Book list */}
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className={`text-center py-8 text-xs ${textSub}`}>لا توجد كتب</p>
          ) : (
            filtered.map((b) => (
              <button
                key={b.id}
                onClick={() => { onSelectBook(b.id); if (isMobile && onClose) onClose(); }}
                className={`w-full flex items-center gap-2.5 p-2 rounded-xl mb-1 text-right transition-all border ${
                  b.id === currentBookId ? activeBg : `border-transparent ${hoverBg}`
                }`}
              >
                {b.image ? (
                  <img src={b.image} alt="" className="w-9 h-12 rounded-md object-cover shadow-sm flex-shrink-0" />
                ) : (
                  <div className={`w-9 h-12 rounded-md flex items-center justify-center flex-shrink-0 ${isDarkTheme ? "bg-white/5" : "bg-gray-100"}`}>
                    <BookOpen className="w-4 h-4 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium truncate ${b.id === currentBookId ? "" : textMain}`}>{b.name}</p>
                  <p className={`text-[10px] ${textSub} mt-0.5`}>{b.category}</p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className={`p-3 border-t ${border}`}>
          <p className={`text-[10px] ${textSub} text-center`}>
            {filtered.length} كتاب متاح
          </p>
        </div>
      </motion.div>
    </>
  );
};

export default LibrarySidebar;
