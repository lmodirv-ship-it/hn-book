import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Highlighter, StickyNote, Copy, Check } from "lucide-react";

const HIGHLIGHT_COLORS = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fecaca", "#e9d5ff"];

interface TextSelectionPopupProps {
  currentPage: number;
  isDarkTheme: boolean;
  onHighlight: (page: number, text: string, color: string) => void;
  onAddNote: (page: number, text: string) => void;
}

const TextSelectionPopup = ({
  currentPage, isDarkTheme, onHighlight, onAddNote,
}: TextSelectionPopupProps) => {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState("");
  const [copied, setCopied] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  const handleSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      // Small delay to allow click events to process
      setTimeout(() => setShow(false), 200);
      return;
    }

    const text = sel.toString().trim();
    if (text.length < 2) return;

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setSelectedText(text);
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
    setShow(true);
    setCopied(false);
    setShowColors(false);
  }, []);

  useEffect(() => {
    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("touchend", handleSelection);
    return () => {
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("touchend", handleSelection);
    };
  }, [handleSelection]);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShow(false);
      }
    };
    if (show) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [show]);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedText);
    setCopied(true);
    setTimeout(() => { setCopied(false); setShow(false); }, 1000);
  };

  const handleHighlight = (color: string) => {
    onHighlight(currentPage, selectedText, color);
    setShow(false);
    window.getSelection()?.removeAllRanges();
  };

  const handleNote = () => {
    onAddNote(currentPage, `📝 "${selectedText.slice(0, 80)}${selectedText.length > 80 ? "..." : ""}"`);
    setShow(false);
    window.getSelection()?.removeAllRanges();
  };

  const bg = isDarkTheme ? "bg-[#1e293b]" : "bg-white";
  const border = isDarkTheme ? "border-white/10" : "border-gray-200";
  const btnClass = isDarkTheme
    ? "hover:bg-white/10 text-gray-300 hover:text-white"
    : "hover:bg-gray-100 text-gray-600 hover:text-gray-900";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          ref={popupRef}
          initial={{ opacity: 0, y: 8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.9 }}
          transition={{ duration: 0.15 }}
          className={`fixed z-[100] ${bg} border ${border} rounded-xl shadow-2xl`}
          style={{
            left: Math.max(20, Math.min(position.x - 80, window.innerWidth - 180)),
            top: Math.max(10, position.y - 50),
          }}
        >
          <div className="flex items-center gap-0.5 p-1.5">
            {/* Highlight */}
            <button
              onClick={() => setShowColors(!showColors)}
              className={`p-2 rounded-lg transition-all duration-150 ${btnClass}`}
              title="تمييز"
            >
              <Highlighter className="w-4 h-4" />
            </button>

            {/* Note */}
            <button
              onClick={handleNote}
              className={`p-2 rounded-lg transition-all duration-150 ${btnClass}`}
              title="إضافة ملاحظة"
            >
              <StickyNote className="w-4 h-4" />
            </button>

            {/* Copy */}
            <button
              onClick={handleCopy}
              className={`p-2 rounded-lg transition-all duration-150 ${copied ? "text-emerald-400" : btnClass}`}
              title="نسخ"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Color picker */}
          <AnimatePresence>
            {showColors && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className={`flex items-center gap-1.5 px-2 pb-2 pt-0.5 border-t ${border}`}>
                  {HIGHLIGHT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleHighlight(color)}
                      className="w-6 h-6 rounded-full border-2 border-transparent hover:border-gray-400 transition-all hover:scale-110"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TextSelectionPopup;
