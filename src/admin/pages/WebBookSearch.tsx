import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Loader2, CheckCircle2, XCircle, BookOpen,
  Globe, Download, ExternalLink, ShieldCheck, AlertTriangle,
  Library, Sparkles, Import, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WebBook {
  title: string;
  author: string;
  description: string;
  category?: string;
  language?: string;
  year?: number;
  pages?: number;
  source: string;
  source_url: string;
  download_url: string;
  cover_url?: string;
  isbn?: string;
  _verified?: boolean;
  _content_type?: string;
  _file_size?: number;
  _imported?: boolean;
  _product_id?: string;
  _code?: string;
  _reason?: string;
}

const SOURCE_COLORS: Record<string, string> = {
  "Archive.org": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "Internet Archive": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "Project Gutenberg": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "OpenLibrary": "bg-green-500/10 text-green-400 border-green-500/20",
  "Open Library": "bg-green-500/10 text-green-400 border-green-500/20",
  "Standard Ebooks": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Google Books": "bg-red-500/10 text-red-400 border-red-500/20",
  "ManyBooks": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

const WebBookSearch = () => {
  const [query, setQuery] = useState("");
  const [count, setCount] = useState(5);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [books, setBooks] = useState<WebBook[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [stats, setStats] = useState<{ total: number; verified: number; imported: number } | null>(null);
  const [importProgress, setImportProgress] = useState(0);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("أدخل كلمة البحث");
      return;
    }

    setSearching(true);
    setBooks([]);
    setSelected(new Set());
    setStats(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/search-books-web`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: query.trim(), count, autoImport: false }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `خطأ: ${response.status}`);
      }

      const data = await response.json();
      setBooks(data.books || []);
      setStats({ total: data.total, verified: data.verified, imported: 0 });

      // Auto-select verified books
      const verifiedIdxs = new Set<number>();
      (data.books || []).forEach((b: WebBook, i: number) => {
        if (b._verified) verifiedIdxs.add(i);
      });
      setSelected(verifiedIdxs);

      toast.success(`تم العثور على ${data.total} كتاب — ${data.verified} متاح للتحميل`);
    } catch (err: any) {
      toast.error(err.message || "فشل البحث");
    } finally {
      setSearching(false);
    }
  };

  const handleImport = async () => {
    if (selected.size === 0) {
      toast.error("اختر كتاباً واحداً على الأقل");
      return;
    }

    setImporting(true);
    setImportProgress(0);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

      // Send the actual selected books for import
      const selectedBooks = Array.from(selected).map(i => books[i]).filter(b => b && b._verified);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 3, 90));
      }, 800);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/search-books-web`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: query.trim(), count: selectedBooks.length, autoImport: true, books: selectedBooks }),
        }
      );

      clearInterval(progressInterval);
      setImportProgress(100);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "فشل الاستيراد");
      }

      const data = await response.json();
      
      // Merge imported results back into the full books list
      const importedMap = new Map<string, WebBook>();
      (data.books || []).forEach((b: WebBook) => importedMap.set(b.title, b));
      
      const updatedBooks = books.map(b => {
        const imported = importedMap.get(b.title);
        return imported || b;
      });
      
      setBooks(updatedBooks);
      setStats(prev => prev ? { ...prev, imported: data.imported } : null);

      toast.success(`✅ تم استيراد ${data.imported} كتاب وتخزين ملفاتهم محلياً`);
    } catch (err: any) {
      toast.error(err.message || "فشل الاستيراد");
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };

  const toggleSelect = (idx: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(books.map((_, i) => i).filter(i => books[i]._verified)));
  };

  const selectNone = () => setSelected(new Set());

  const formatSize = (bytes: number) => {
    if (!bytes) return "";
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    return `${Math.round(bytes / 1024)}KB`;
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Globe className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
              🌍 بحث المصادر المفتوحة
              <Sparkles className="w-5 h-5 text-primary" />
            </h1>
            <p className="text-sm text-muted-foreground">
              ابحث واستورد كتب، قوالب، تصاميم، شعارات، لوحات ومجلات من مصادر مفتوحة
            </p>
          </div>
        </div>
      </motion.div>

      {/* Sources */}
      <div className="flex flex-wrap gap-2">
        {[
          { name: "Archive.org", icon: Library },
          { name: "Project Gutenberg", icon: BookOpen },
          { name: "Open Library", icon: Search },
          { name: "Standard Ebooks", icon: ShieldCheck },
          { name: "ManyBooks", icon: Globe },
        ].map(({ name, icon: Icon }) => (
          <div key={name} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs ${SOURCE_COLORS[name] || "bg-secondary/30 text-muted-foreground border-border"}`}>
            <Icon className="w-3.5 h-3.5" />
            <span>{name}</span>
          </div>
        ))}
      </div>

      {/* Search Form */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl"
      >
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                🔍 ابحث عن أي محتوى (كتب، قوالب، شعارات، لوحات، مجلات...)
              </label>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="مثال: carte visite, logo design, Python programming, لوحات فنية..."
                className="text-base"
                onKeyDown={(e) => e.key === "Enter" && !searching && handleSearch()}
                disabled={searching || importing}
              />
            </div>
            <div className="w-24">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">العدد</label>
              <Input
                type="number"
                min={1}
                max={1000}
                value={count}
                onChange={(e) => setCount(Math.min(1000, Math.max(1, parseInt(e.target.value) || 5)))}
                disabled={searching || importing}
              />
            </div>
          </div>

          <Button
            onClick={handleSearch}
            disabled={searching || importing || !query.trim()}
            className="w-full gap-2"
            size="lg"
          >
            {searching ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                جاري البحث بالذكاء الاصطناعي...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                بحث في المصادر المفتوحة
              </>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Results */}
      <AnimatePresence>
        {books.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-w-3xl space-y-4"
          >
            {/* Stats */}
            {stats && (
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  {stats.total} نتيجة
                </Badge>
                <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20">
                  <ShieldCheck className="w-3 h-3 ml-1" />
                  {stats.verified} متاح
                </Badge>
                {stats.imported > 0 && (
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                    <Import className="w-3 h-3 ml-1" />
                    {stats.imported} مستورد
                  </Badge>
                )}
                <div className="mr-auto flex items-center gap-2">
                  <button onClick={selectAll} className="text-xs text-primary hover:underline">تحديد الكل</button>
                  <span className="text-muted-foreground">·</span>
                  <button onClick={selectNone} className="text-xs text-muted-foreground hover:underline">إلغاء الكل</button>
                </div>
              </div>
            )}

            {/* Book Cards */}
            <div className="space-y-3">
              {books.map((book, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`rounded-2xl border bg-card overflow-hidden transition-all ${
                    book._imported
                      ? "border-green-500/30 bg-green-500/5"
                      : selected.has(idx)
                      ? "border-primary/40 bg-primary/5"
                      : "border-border hover:border-border/80"
                  }`}
                >
                  <div className="flex gap-4 p-4">
                    {/* Cover */}
                    <div
                      className="w-20 h-28 rounded-xl bg-secondary/30 overflow-hidden shrink-0 cursor-pointer"
                      onClick={() => !book._imported && toggleSelect(idx)}
                    >
                      {book.cover_url ? (
                        <img
                          src={book.cover_url}
                          alt={book.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-8 h-8 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-start gap-2">
                        {!book._imported && (
                          <input
                            type="checkbox"
                            checked={selected.has(idx)}
                            onChange={() => toggleSelect(idx)}
                            className="mt-1 shrink-0 accent-primary"
                            disabled={!book._verified}
                          />
                        )}
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-foreground truncate">{book.title}</h3>
                          <p className="text-xs text-muted-foreground">{book.author}</p>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground/80 line-clamp-2">{book.description}</p>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] ${SOURCE_COLORS[book.source] || ""}`}>
                          {book.source}
                        </Badge>
                        {book._verified ? (
                          <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-400 border-green-500/20">
                            <CheckCircle2 className="w-2.5 h-2.5 ml-0.5" /> متاح
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] bg-red-500/10 text-red-400 border-red-500/20">
                            <XCircle className="w-2.5 h-2.5 ml-0.5" /> غير متاح
                          </Badge>
                        )}
                        {book._imported && (
                          <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20">
                            <CheckCircle2 className="w-2.5 h-2.5 ml-0.5" /> مستورد — {book._code}
                          </Badge>
                        )}
                        {book.language && (
                          <span className="text-[10px] text-muted-foreground">{book.language}</span>
                        )}
                        {book.pages && (
                          <span className="text-[10px] text-muted-foreground">{book.pages} صفحة</span>
                        )}
                        {book._file_size ? (
                          <span className="text-[10px] text-muted-foreground">{formatSize(book._file_size)}</span>
                        ) : null}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {book.source_url && (
                        <a
                          href={book.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
                          title="عرض في المصدر"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                      )}
                      {book._imported && book._product_id && (
                        <a
                          href={`/product/${book._product_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg hover:bg-secondary/50 text-primary hover:text-primary/80 transition-colors"
                          title="عرض المنتج"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Import error */}
                  {book._reason && !book._imported && (
                    <div className="px-4 py-2 bg-red-500/5 border-t border-red-500/10 flex items-center gap-2 text-xs text-red-400">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {book._reason}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Import Button */}
            {!books.some(b => b._imported) && (
              <div className="space-y-3">
                {importing && (
                  <div className="space-y-2">
                    <Progress value={importProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center">
                      جاري تحميل واستيراد الكتب... {importProgress}%
                    </p>
                  </div>
                )}
                <Button
                  onClick={handleImport}
                  disabled={importing || selected.size === 0}
                  className="w-full gap-2"
                  size="lg"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جاري الاستيراد...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      استيراد {selected.size} كتاب إلى المتجر
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Success banner */}
            {stats && stats.imported > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20"
              >
                <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-400">
                    ✅ تم استيراد {stats.imported} كتاب — مع PDF والغلاف والمعلومات
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-green-500/30 text-green-400 hover:bg-green-500/10"
                  onClick={() => window.location.href = "/admin/products"}
                >
                  عرض المنتجات
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WebBookSearch;
