import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ArrowLeft, BookOpen, ChevronRight, ChevronLeft,
  Sun, Moon, Type, Minus, Plus, List, X, Home, Maximize2, Minimize2,
  Bookmark, Share2, Settings2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

interface BookData {
  id: string;
  name: string;
  description: string | null;
  category: string;
  image: string | null;
  features: string[] | null;
}

// Demo chapters for display
const generateChapters = (bookName: string) => [
  { id: 1, title: "المقدمة", content: `مرحباً بكم في كتاب "${bookName}". هذا الكتاب يقدم لكم رحلة معرفية فريدة من نوعها، حيث نستكشف معاً أعماق هذا الموضوع المثير. سنتناول في هذا الفصل الأساسيات التي تحتاجون إليها لفهم باقي محتوى الكتاب.\n\nيهدف هذا الكتاب إلى تزويدكم بالمعرفة والأدوات اللازمة للنجاح في هذا المجال. سواء كنتم مبتدئين أو محترفين، ستجدون ما يناسب مستواكم.\n\nعبر الفصول القادمة، سنغوص في التفاصيل ونقدم أمثلة عملية وتمارين تطبيقية تساعدكم على تطبيق ما تعلمتموه في حياتكم العملية.` },
  { id: 2, title: "الفصل الأول: الأساسيات", content: `في هذا الفصل نبدأ بالأساسيات المهمة. كل رحلة تبدأ بخطوة، وخطوتنا الأولى هي فهم المبادئ الأساسية.\n\nالمبدأ الأول: التعلم المستمر\nالتعلم لا يتوقف عند حد معين. كل يوم يحمل فرصة جديدة لاكتساب مهارة أو معرفة جديدة.\n\nالمبدأ الثاني: التطبيق العملي\nلا قيمة للمعرفة النظرية بدون تطبيق عملي. حاولوا تطبيق كل مفهوم تتعلمونه فوراً.\n\nالمبدأ الثالث: المثابرة\nالنجاح يتطلب صبراً ومثابرة. لا تستسلموا عند أول عقبة.` },
  { id: 3, title: "الفصل الثاني: التطبيق", content: `الآن وقد فهمنا الأساسيات، حان وقت التطبيق العملي.\n\nالتمرين الأول:\nقم بتحديد هدف واضح تريد تحقيقه خلال الشهر القادم. اكتبه بوضوح وحدد الخطوات اللازمة للوصول إليه.\n\nالتمرين الثاني:\nراجع تقدمك بشكل يومي. سجل ما أنجزته وما تحتاج لتحسينه.\n\nالتمرين الثالث:\nشارك ما تعلمته مع الآخرين. التعليم هو أفضل طريقة للتعلم.` },
  { id: 4, title: "الفصل الثالث: الاستراتيجيات المتقدمة", content: `بعد إتقان الأساسيات والتطبيق، ننتقل إلى الاستراتيجيات المتقدمة.\n\nالاستراتيجية الأولى: التفكير النقدي\nلا تقبل كل شيء كما هو. تعلم كيف تحلل وتقيم المعلومات.\n\nالاستراتيجية الثانية: الابتكار\nابحث دائماً عن طرق جديدة وأفضل لحل المشاكل.\n\nالاستراتيجية الثالثة: بناء الشبكات\nتواصل مع أشخاص يشاركونك نفس الاهتمامات. التعاون يضاعف النتائج.` },
  { id: 5, title: "الخاتمة", content: `وصلنا إلى نهاية رحلتنا مع هذا الكتاب. نأمل أن تكونوا قد استفدتم من المحتوى وأن تطبقوا ما تعلمتموه.\n\nتذكروا دائماً:\n- المعرفة قوة، لكن التطبيق هو القوة الحقيقية\n- النجاح رحلة وليس وجهة\n- كل خطوة صغيرة تقربكم من هدفكم\n\nنتمنى لكم كل التوفيق والنجاح. وإلى اللقاء في كتاب آخر!` },
];

const BookReader = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<BookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [fontSize, setFontSize] = useState(18);
  const [lightMode, setLightMode] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bookmarked, setBookmarked] = useState<number[]>([]);
  const [readProgress, setReadProgress] = useState(0);

  useEffect(() => {
    const fetchBook = async () => {
      if (!id) return;
      const { data } = await supabase
        .from("products")
        .select("id, name, description, category, image, features")
        .eq("id", id)
        .single();
      setBook(data);
      setLoading(false);
    };
    fetchBook();
  }, [id]);

  const chapters = book ? generateChapters(book.name) : [];

  useEffect(() => {
    if (chapters.length > 0) {
      setReadProgress(Math.round(((currentChapter + 1) / chapters.length) * 100));
    }
  }, [currentChapter, chapters.length]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleBookmark = () => {
    setBookmarked((prev) =>
      prev.includes(currentChapter)
        ? prev.filter((c) => c !== currentChapter)
        : [...prev, currentChapter]
    );
    toast.success(
      bookmarked.includes(currentChapter) ? "تم إزالة الإشارة المرجعية" : "تم حفظ الإشارة المرجعية"
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <BookOpen className="w-10 h-10 text-primary animate-pulse" />
          <p className="text-muted-foreground text-sm">جاري تحميل الكتاب...</p>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <BookOpen className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-xl font-bold text-foreground">الكتاب غير موجود</h1>
        <Button asChild variant="outline">
          <Link to="/">العودة للمتجر</Link>
        </Button>
      </div>
    );
  }

  const chapter = chapters[currentChapter];
  const bgClass = lightMode ? "bg-amber-50" : "bg-background";
  const textClass = lightMode ? "text-stone-800" : "text-foreground/90";
  const secondaryTextClass = lightMode ? "text-stone-500" : "text-muted-foreground";
  const cardClass = lightMode ? "bg-white border-stone-200" : "bg-card border-border";
  const headerClass = lightMode ? "bg-white/80 border-stone-200" : "bg-card/80 border-border";

  return (
    <div className={`min-h-screen ${bgClass} transition-colors duration-300`} dir="rtl">
      {/* Top Bar */}
      <header className={`sticky top-0 z-50 backdrop-blur-xl ${headerClass} border-b`}>
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/product/${id}`)}
              className={`p-2 rounded-lg hover:bg-secondary/50 ${secondaryTextClass} transition-colors`}
            >
              <Home className="w-4 h-4" />
            </button>
            <div className="hidden sm:block">
              <p className={`text-sm font-semibold truncate max-w-[250px] ${lightMode ? "text-stone-900" : "text-foreground"}`}>
                {book.name}
              </p>
              <p className={`text-[11px] ${secondaryTextClass}`}>
                {chapter.title} · {readProgress}% مكتمل
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSidebar(true)}
              className={`p-2 rounded-lg hover:bg-secondary/50 ${secondaryTextClass} transition-colors`}
              title="الفهرس"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={toggleBookmark}
              className={`p-2 rounded-lg hover:bg-secondary/50 transition-colors ${
                bookmarked.includes(currentChapter) ? "text-primary" : secondaryTextClass
              }`}
              title="إشارة مرجعية"
            >
              <Bookmark className={`w-4 h-4 ${bookmarked.includes(currentChapter) ? "fill-primary" : ""}`} />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg hover:bg-secondary/50 ${secondaryTextClass} transition-colors`}
              title="الإعدادات"
            >
              <Settings2 className="w-4 h-4" />
            </button>
            <button
              onClick={toggleFullscreen}
              className={`p-2 rounded-lg hover:bg-secondary/50 ${secondaryTextClass} transition-colors hidden sm:block`}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-secondary/30">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${readProgress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </header>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`fixed top-[58px] left-4 right-4 sm:left-auto sm:right-4 sm:w-72 z-40 rounded-xl ${cardClass} border shadow-2xl p-4 space-y-4`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-sm font-semibold ${lightMode ? "text-stone-900" : "text-foreground"}`}>إعدادات القراءة</span>
              <button onClick={() => setShowSettings(false)} className={`p-1 rounded ${secondaryTextClass}`}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Font size */}
            <div className="space-y-2">
              <label className={`text-xs ${secondaryTextClass}`}>حجم الخط</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setFontSize((s) => Math.max(14, s - 2))}
                  className={`p-1.5 rounded-lg border ${cardClass} ${secondaryTextClass}`}
                >
                  <Minus className="w-3 h-3" />
                </button>
                <Slider
                  value={[fontSize]}
                  min={14}
                  max={28}
                  step={2}
                  onValueChange={([v]) => setFontSize(v)}
                  className="flex-1"
                />
                <button
                  onClick={() => setFontSize((s) => Math.min(28, s + 2))}
                  className={`p-1.5 rounded-lg border ${cardClass} ${secondaryTextClass}`}
                >
                  <Plus className="w-3 h-3" />
                </button>
                <span className={`text-xs w-8 text-center ${secondaryTextClass}`}>{fontSize}</span>
              </div>
            </div>

            {/* Theme */}
            <div className="space-y-2">
              <label className={`text-xs ${secondaryTextClass}`}>وضع القراءة</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setLightMode(false)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    !lightMode ? "bg-primary text-primary-foreground" : `border ${cardClass} ${secondaryTextClass}`
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" /> ليلي
                </button>
                <button
                  onClick={() => setLightMode(true)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    lightMode ? "bg-amber-600 text-white" : `border ${cardClass} ${secondaryTextClass}`
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" /> نهاري
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chapter Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowSidebar(false)}
            />
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              className={`fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] z-50 ${lightMode ? "bg-white" : "bg-card"} border-l border-border shadow-2xl`}
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className={`font-bold ${lightMode ? "text-stone-900" : "text-foreground"}`}>📖 الفهرس</h3>
                <button onClick={() => setShowSidebar(false)} className={`p-1 rounded ${secondaryTextClass}`}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Book cover mini */}
              <div className="p-4 border-b border-border/50">
                <div className="flex items-center gap-3">
                  {book.image && (
                    <img src={book.image} alt={book.name} className="w-12 h-16 rounded-lg object-cover" />
                  )}
                  <div>
                    <p className={`text-sm font-semibold ${lightMode ? "text-stone-900" : "text-foreground"}`}>{book.name}</p>
                    <p className={`text-xs ${secondaryTextClass}`}>{book.category}</p>
                    <p className={`text-[11px] text-primary mt-1`}>{readProgress}% مكتمل</p>
                  </div>
                </div>
              </div>

              <div className="p-2 overflow-y-auto max-h-[calc(100vh-180px)]">
                {chapters.map((ch, i) => (
                  <button
                    key={ch.id}
                    onClick={() => { setCurrentChapter(i); setShowSidebar(false); }}
                    className={`w-full text-right px-4 py-3 rounded-xl text-sm transition-all flex items-center gap-3 ${
                      i === currentChapter
                        ? "bg-primary/15 text-primary font-semibold"
                        : `${secondaryTextClass} hover:bg-secondary/30`
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                      i === currentChapter ? "bg-primary text-primary-foreground" : lightMode ? "bg-stone-100 text-stone-500" : "bg-secondary text-muted-foreground"
                    }`}>
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate">{ch.title}</span>
                    {bookmarked.includes(i) && <Bookmark className="w-3 h-3 text-primary fill-primary flex-shrink-0" />}
                    {i < currentChapter && <span className="text-[10px] text-primary">✓</span>}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Reading Area */}
      <main className="max-w-2xl mx-auto px-5 sm:px-8 py-8 sm:py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentChapter}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Chapter header */}
            <div className="mb-8 text-center">
              <span className={`text-xs font-medium ${secondaryTextClass}`}>
                الفصل {currentChapter + 1} من {chapters.length}
              </span>
              <h2 className={`text-2xl sm:text-3xl font-bold mt-2 ${lightMode ? "text-stone-900" : "text-foreground"}`}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {chapter.title}
              </h2>
              <div className={`w-16 h-0.5 bg-primary mx-auto mt-4 rounded-full`} />
            </div>

            {/* Chapter content */}
            <div
              className={`leading-[1.9] ${textClass} whitespace-pre-line`}
              style={{ fontSize: `${fontSize}px`, fontFamily: "'DM Sans', sans-serif" }}
            >
              {chapter.content}
            </div>

            {/* Chapter end decoration */}
            <div className="flex items-center justify-center gap-2 my-10">
              <div className={`w-8 h-px ${lightMode ? "bg-stone-300" : "bg-border"}`} />
              <span className={`text-xs ${secondaryTextClass}`}>❧</span>
              <div className={`w-8 h-px ${lightMode ? "bg-stone-300" : "bg-border"}`} />
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4 mt-6 pb-8">
          <button
            onClick={() => setCurrentChapter((c) => Math.max(0, c - 1))}
            disabled={currentChapter === 0}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all ${
              currentChapter === 0
                ? `${lightMode ? "bg-stone-100 text-stone-300" : "bg-secondary/30 text-muted-foreground/30"} cursor-not-allowed`
                : `${cardClass} border shadow-sm hover:shadow-md ${lightMode ? "text-stone-700" : "text-foreground"}`
            }`}
          >
            <ChevronRight className="w-4 h-4" />
            السابق
          </button>

          <span className={`text-xs ${secondaryTextClass}`}>
            {currentChapter + 1} / {chapters.length}
          </span>

          <button
            onClick={() => setCurrentChapter((c) => Math.min(chapters.length - 1, c + 1))}
            disabled={currentChapter === chapters.length - 1}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all ${
              currentChapter === chapters.length - 1
                ? `${lightMode ? "bg-stone-100 text-stone-300" : "bg-secondary/30 text-muted-foreground/30"} cursor-not-allowed`
                : "bg-primary text-primary-foreground shadow-sm hover:shadow-md"
            }`}
          >
            التالي
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  );
};

export default BookReader;
