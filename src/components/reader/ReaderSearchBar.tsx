import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronUp, ChevronDown } from "lucide-react";

interface SearchResult {
  pageIndex: number; // 0-based
  matchCount: number;
}

interface ReaderSearchBarProps {
  show: boolean;
  isDarkTheme: boolean;
  numPages: number;
  pdfDocument: any; // PDFDocumentProxy
  onClose: () => void;
  onGoToPage: (page: number) => void;
}

const ReaderSearchBar = ({
  show, isDarkTheme, numPages, pdfDocument, onClose, onGoToPage,
}: ReaderSearchBarProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [currentResultIdx, setCurrentResultIdx] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);

  const bg = isDarkTheme ? "bg-[#16213e]" : "bg-white";
  const border = isDarkTheme ? "border-white/5" : "border-gray-200";
  const inputClass = isDarkTheme
    ? "bg-white/5 text-white placeholder:text-gray-500 border-white/10 focus:border-emerald-500/50"
    : "bg-gray-50 text-gray-800 placeholder:text-gray-400 border-gray-200 focus:border-primary/50";
  const btnClass = isDarkTheme ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-800";
  const resultText = isDarkTheme ? "text-gray-400" : "text-gray-500";

  const searchInPdf = useCallback(async () => {
    if (!pdfDocument || !query.trim()) {
      setResults([]);
      setTotalMatches(0);
      return;
    }

    setSearching(true);
    const q = query.toLowerCase();
    const found: SearchResult[] = [];
    let total = 0;

    try {
      for (let i = 0; i < Math.min(numPages, 500); i++) {
        const page = await pdfDocument.getPage(i + 1);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ").toLowerCase();
        
        // Count occurrences
        let idx = 0;
        let count = 0;
        while ((idx = pageText.indexOf(q, idx)) !== -1) {
          count++;
          idx += q.length;
        }

        if (count > 0) {
          found.push({ pageIndex: i, matchCount: count });
          total += count;
        }
      }
    } catch (err) {
      console.error("Search error:", err);
    }

    setResults(found);
    setTotalMatches(total);
    setCurrentResultIdx(0);
    setSearching(false);

    // Navigate to first result
    if (found.length > 0) {
      onGoToPage(found[0].pageIndex + 1);
    }
  }, [pdfDocument, query, numPages, onGoToPage]);

  const goToNextResult = useCallback(() => {
    if (results.length === 0) return;
    const next = (currentResultIdx + 1) % results.length;
    setCurrentResultIdx(next);
    onGoToPage(results[next].pageIndex + 1);
  }, [results, currentResultIdx, onGoToPage]);

  const goToPrevResult = useCallback(() => {
    if (results.length === 0) return;
    const prev = (currentResultIdx - 1 + results.length) % results.length;
    setCurrentResultIdx(prev);
    onGoToPage(results[prev].pageIndex + 1);
  }, [results, currentResultIdx, onGoToPage]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setTotalMatches(0);
      return;
    }
    const timer = setTimeout(searchInPdf, 500);
    return () => clearTimeout(timer);
  }, [query, searchInPdf]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className={`${bg} border-b ${border} overflow-hidden z-40`}
        >
          <div className="flex items-center gap-2 px-4 py-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث في الكتاب..."
              className={`flex-1 rounded-lg px-3 py-1.5 text-sm outline-none border ${inputClass}`}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (e.shiftKey) goToPrevResult();
                  else goToNextResult();
                }
              }}
            />
            
            {query && (
              <div className="flex items-center gap-1">
                <span className={`text-[11px] ${resultText} whitespace-nowrap`}>
                  {searching ? "جاري البحث..." : totalMatches > 0 ? `${currentResultIdx + 1}/${results.length} صفحة (${totalMatches} نتيجة)` : "لا توجد نتائج"}
                </span>
                <button onClick={goToPrevResult} disabled={results.length === 0} className={`p-1 rounded ${btnClass} disabled:opacity-30`}>
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={goToNextResult} disabled={results.length === 0} className={`p-1 rounded ${btnClass} disabled:opacity-30`}>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            
            <button onClick={() => { onClose(); setQuery(""); setResults([]); }} className={btnClass}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReaderSearchBar;
