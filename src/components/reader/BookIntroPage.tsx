import { motion } from "framer-motion";
import { BookOpen, Play } from "lucide-react";

interface BookIntroPageProps {
  bookName: string;
  bookDescription: string | null;
  bookImage: string | null;
  category: string;
  numPages: number;
  isDarkTheme: boolean;
  onStartReading: () => void;
}

const BookIntroPage = ({
  bookName, bookDescription, bookImage, category, numPages, isDarkTheme, onStartReading,
}: BookIntroPageProps) => {
  const bg = isDarkTheme
    ? "bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#1a1a2e]"
    : "bg-gradient-to-b from-[#f5f0e8] via-[#faf8f5] to-[#f5f0e8]";
  const textTitle = isDarkTheme ? "text-white" : "text-[#3a2e22]";
  const textSub = isDarkTheme ? "text-gray-400" : "text-[#8a7a6a]";
  const cardBg = isDarkTheme ? "bg-[#16213e]/80" : "bg-white/80";
  const border = isDarkTheme ? "border-white/10" : "border-[#e0d8cc]";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`h-screen ${bg} flex flex-col items-center justify-center px-4 overflow-hidden`}
      dir="rtl"
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="flex flex-col items-center max-w-md w-full"
      >
        {/* Book cover */}
        <motion.div
          initial={{ scale: 0.8, rotateY: -20 }}
          animate={{ scale: 1, rotateY: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
          className="relative mb-6"
          style={{ perspective: "800px" }}
        >
          {bookImage ? (
            <div className="relative">
              <img
                src={bookImage}
                alt={bookName}
                className="w-48 h-72 object-cover rounded-lg shadow-2xl"
                style={{
                  boxShadow: isDarkTheme
                    ? "0 25px 60px -12px rgba(0,0,0,0.8), 0 0 40px rgba(16,185,129,0.1)"
                    : "0 25px 60px -12px rgba(0,0,0,0.3), 0 0 40px rgba(139,115,85,0.1)",
                }}
              />
              {/* Book edge effect */}
              <div
                className="absolute top-0 right-0 w-3 h-full rounded-r-sm"
                style={{
                  background: "linear-gradient(to right, transparent, rgba(0,0,0,0.15))",
                }}
              />
            </div>
          ) : (
            <div
              className={`w-48 h-72 rounded-lg ${cardBg} border ${border} flex flex-col items-center justify-center gap-3`}
              style={{
                boxShadow: isDarkTheme
                  ? "0 25px 60px -12px rgba(0,0,0,0.8)"
                  : "0 25px 60px -12px rgba(0,0,0,0.3)",
              }}
            >
              <BookOpen className={`w-12 h-12 ${textSub}`} />
              <p className={`text-xs ${textSub} text-center px-4`}>{category}</p>
            </div>
          )}
        </motion.div>

        {/* Book info */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className={`text-xl sm:text-2xl font-bold ${textTitle} text-center mb-2`}
        >
          {bookName}
        </motion.h1>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center gap-3 mb-4"
        >
          <span className={`text-xs ${textSub} px-2 py-0.5 rounded-full border ${border}`}>{category}</span>
          <span className={`text-xs ${textSub}`}>{numPages} صفحة</span>
        </motion.div>

        {bookDescription && (
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className={`text-sm ${textSub} text-center leading-relaxed mb-6 max-w-sm line-clamp-3`}
          >
            {bookDescription}
          </motion.p>
        )}

        {/* Start reading button */}
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStartReading}
          className={`flex items-center gap-2 px-8 py-3 rounded-full text-sm font-bold transition-all ${
            isDarkTheme
              ? "bg-gradient-to-r from-emerald-500 to-emerald-400 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50"
              : "bg-gradient-to-r from-[#8a7a6a] to-[#6a5a4a] text-white shadow-lg shadow-[#8a7a6a]/30 hover:shadow-[#8a7a6a]/50"
          }`}
        >
          <Play className="w-4 h-4" />
          ابدأ القراءة
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default BookIntroPage;
