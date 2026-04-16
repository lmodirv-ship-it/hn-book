import { motion, AnimatePresence } from "framer-motion";
import { X, Type, Palette, Maximize } from "lucide-react";

interface ReaderSettingsProps {
  show: boolean;
  isDarkTheme: boolean;
  fontSize: number;
  fontFamily: string;
  paperColor: string;
  pageWidth: "narrow" | "medium" | "wide";
  onClose: () => void;
  onChangeFontSize: (size: number) => void;
  onChangeFontFamily: (font: string) => void;
  onChangePaperColor: (color: string) => void;
  onChangePageWidth: (width: "narrow" | "medium" | "wide") => void;
}

const FONTS = [
  { id: "default", label: "افتراضي", family: "inherit" },
  { id: "amiri", label: "أميري", family: "'Amiri', serif" },
  { id: "noto-kufi", label: "نوتو كوفي", family: "'Noto Kufi Arabic', sans-serif" },
  { id: "cairo", label: "القاهرة", family: "'Cairo', sans-serif" },
];

const PAPER_COLORS = [
  { id: "warm", label: "ورقي دافئ", value: "#f5f0e8", dark: "#1a1a2e" },
  { id: "white", label: "أبيض", value: "#ffffff", dark: "#0f0f1a" },
  { id: "sepia", label: "سيبيا", value: "#f0e6d2", dark: "#1e1a14" },
  { id: "green", label: "أخضر ناعم", value: "#f0f5ef", dark: "#141e1a" },
];

const ReaderSettings = ({
  show, isDarkTheme, fontSize, fontFamily, paperColor, pageWidth,
  onClose, onChangeFontSize, onChangeFontFamily, onChangePaperColor, onChangePageWidth,
}: ReaderSettingsProps) => {
  const bg = isDarkTheme ? "bg-[#1a1a2e]" : "bg-[#faf8f5]";
  const border = isDarkTheme ? "border-white/10" : "border-[#e0d8cc]";
  const textTitle = isDarkTheme ? "text-white" : "text-[#3a2e22]";
  const textSub = isDarkTheme ? "text-gray-400" : "text-[#8a7a6a]";
  const cardBg = isDarkTheme ? "bg-white/5" : "bg-[#f0ece4]";
  const activeBtn = isDarkTheme ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-[#e0d8cc] text-[#3a2e22] border-[#c0b8a8]";
  const inactiveBtn = isDarkTheme ? "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10" : "bg-white text-[#8a7a6a] border-[#e0d8cc] hover:bg-[#f0ece4]";

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 ${bg} rounded-2xl border ${border} shadow-2xl w-[90vw] max-w-[380px] max-h-[80vh] overflow-y-auto`}
            dir="rtl"
          >
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b ${border}`}>
              <h3 className={`text-sm font-bold ${textTitle}`}>⚙️ إعدادات القارئ</h3>
              <button onClick={onClose} className={`p-1 rounded-lg ${textSub} hover:opacity-80`}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-5">
              {/* Font Size */}
              <div>
                <label className={`text-xs font-semibold ${textTitle} flex items-center gap-1.5 mb-2`}>
                  <Type className="w-3.5 h-3.5" /> حجم الخط
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onChangeFontSize(Math.max(12, fontSize - 2))}
                    className={`w-8 h-8 rounded-lg border text-sm font-bold ${inactiveBtn}`}
                  >أ</button>
                  <div className="flex-1">
                    <input
                      type="range"
                      min={12}
                      max={28}
                      value={fontSize}
                      onChange={(e) => onChangeFontSize(Number(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                  <button
                    onClick={() => onChangeFontSize(Math.min(28, fontSize + 2))}
                    className={`w-8 h-8 rounded-lg border text-lg font-bold ${inactiveBtn}`}
                  >أ</button>
                  <span className={`text-xs ${textSub} min-w-[2rem] text-center`}>{fontSize}</span>
                </div>
              </div>

              {/* Font Family */}
              <div>
                <label className={`text-xs font-semibold ${textTitle} mb-2 block`}>نوع الخط</label>
                <div className="grid grid-cols-2 gap-2">
                  {FONTS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => onChangeFontFamily(f.family)}
                      className={`px-3 py-2 rounded-lg border text-xs transition-all ${fontFamily === f.family ? activeBtn : inactiveBtn}`}
                      style={{ fontFamily: f.family }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paper Color */}
              <div>
                <label className={`text-xs font-semibold ${textTitle} flex items-center gap-1.5 mb-2`}>
                  <Palette className="w-3.5 h-3.5" /> لون الورق
                </label>
                <div className="flex gap-2">
                  {PAPER_COLORS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => onChangePaperColor(c.id)}
                      className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${paperColor === c.id ? activeBtn : inactiveBtn}`}
                    >
                      <div
                        className="w-8 h-8 rounded-lg border border-black/10 shadow-inner"
                        style={{ backgroundColor: isDarkTheme ? c.dark : c.value }}
                      />
                      <span className="text-[10px]">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Page Width */}
              <div>
                <label className={`text-xs font-semibold ${textTitle} flex items-center gap-1.5 mb-2`}>
                  <Maximize className="w-3.5 h-3.5" /> عرض الصفحة
                </label>
                <div className="flex gap-2">
                  {(["narrow", "medium", "wide"] as const).map((w) => (
                    <button
                      key={w}
                      onClick={() => onChangePageWidth(w)}
                      className={`flex-1 py-2 rounded-lg border text-xs transition-all ${pageWidth === w ? activeBtn : inactiveBtn}`}
                    >
                      {w === "narrow" ? "ضيق" : w === "medium" ? "متوسط" : "عريض"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ReaderSettings;
