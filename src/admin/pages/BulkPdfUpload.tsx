import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, Check, X, Loader2, AlertCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  buildBookPdfStoragePath,
  ensureProductReferenceCode,
  getBookFilePublicUrl,
} from "@/lib/reference-code";

interface PendingFile {
  file: File;
  refCode: string;
  matchedProductId: string | null;
  matchedProductName: string | null;
  status: "pending" | "uploading" | "done" | "error" | "manual";
  error?: string;
}

interface Product {
  id: string;
  name: string;
  badge: string | null;
  reference_code: string | null;
  pdf_url: string | null;
}

const BulkPdfUpload = () => {
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [manualPickIndex, setManualPickIndex] = useState<number | null>(null);
  const [manualSearch, setManualSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch ALL products (paginated to bypass 1000 row limit)
  const loadProducts = useCallback(async () => {
    if (loaded) return products;
    const allProducts: Product[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data } = await supabase
        .from("products")
        .select("id, name, badge, reference_code, pdf_url")
        .range(from, from + pageSize - 1)
        .order("name");
      const batch = (data || []) as Product[];
      allProducts.push(...batch);
      hasMore = batch.length === pageSize;
      from += pageSize;
    }

    setProducts(allProducts);
    setLoaded(true);
    return allProducts;
  }, [loaded, products]);

  const matchFiles = async (selectedFiles: File[]) => {
    const prods = await loadProducts();
    const pending: PendingFile[] = selectedFiles
      .filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"))
      .map((file) => {
        const baseName = file.name.replace(/\.pdf$/i, "").trim();
        const normalizedRef = baseName.toUpperCase();
        // Try matching by badge (e.g. HNB-0081)
        const badgeMatch = prods.find(
          (p) => p.badge && p.badge.toLowerCase() === baseName.toLowerCase()
        );
        // Try matching by reference_code
        const refMatch = !badgeMatch
          ? prods.find((p) => p.reference_code && p.reference_code.toLowerCase() === baseName.toLowerCase())
          : null;
        // Try matching by product name
        const nameMatch = !badgeMatch && !refMatch
          ? prods.find((p) => p.name.toLowerCase() === baseName.toLowerCase())
          : null;
        const matched = badgeMatch || refMatch || nameMatch;
        return {
          file,
          refCode: normalizedRef,
          matchedProductId: matched?.id || null,
          matchedProductName: matched?.name || null,
          status: matched ? ("pending" as const) : ("manual" as const),
        };
      });
    setFiles((prev) => [...prev, ...pending]);
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length) matchFiles(selected);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length) matchFiles(dropped);
  };

  const assignProduct = (index: number, product: Product) => {
    setFiles((prev) =>
      prev.map((f, i) =>
        i === index
          ? { ...f, matchedProductId: product.id, matchedProductName: product.name, status: "pending" }
          : f
      )
    );
    setManualPickIndex(null);
    setManualSearch("");
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearDone = () => {
    setFiles((prev) => prev.filter((f) => f.status !== "done"));
  };

  const uploadAll = async () => {
    const toUpload = files.filter((f) => f.status === "pending" && f.matchedProductId);
    if (!toUpload.length) {
      toast.error("لا توجد ملفات جاهزة للرفع");
      return;
    }
    setUploading(true);
    let success = 0;
    let failed = 0;

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.status !== "pending" || !f.matchedProductId) continue;

      setFiles((prev) => prev.map((ff, idx) => (idx === i ? { ...ff, status: "uploading" } : ff)));

      try {
        const matchedProduct = products.find((product) => product.id === f.matchedProductId);
        const resolvedReferenceCode = await ensureProductReferenceCode(
          f.matchedProductId,
          matchedProduct?.reference_code,
          f.refCode
        );
        const storagePath = buildBookPdfStoragePath(resolvedReferenceCode);

        const { error: uploadError } = await supabase.storage
          .from("book-files")
          .upload(storagePath, f.file, { upsert: true });
        if (uploadError) throw uploadError;

        const publicUrl = getBookFilePublicUrl(storagePath);

        await supabase
          .from("products")
          .update({ pdf_url: publicUrl, reference_code: resolvedReferenceCode } as never)
          .eq("id", f.matchedProductId);

        await supabase
          .from("product_files")
          .delete()
          .eq("product_id", f.matchedProductId)
          .eq("file_type", "pdf");

        await supabase.from("product_files").insert({
          product_id: f.matchedProductId,
          file_type: "pdf" as any,
          file_name: `${resolvedReferenceCode}.pdf`,
          file_size: f.file.size,
          storage_path: `book-files/${storagePath}`,
          public_url: publicUrl,
          is_primary: true,
        });

        setProducts((prev) =>
          prev.map((product) =>
            product.id === f.matchedProductId
              ? { ...product, pdf_url: publicUrl, reference_code: resolvedReferenceCode }
              : product
          )
        );
        setFiles((prev) =>
          prev.map((ff, idx) =>
            idx === i ? { ...ff, refCode: resolvedReferenceCode, status: "done" } : ff
          )
        );
        success++;
      } catch (err: any) {
        setFiles((prev) =>
          prev.map((ff, idx) =>
            idx === i ? { ...ff, status: "error", error: err.message || "فشل الرفع" } : ff
          )
        );
        failed++;
      }
    }

    setUploading(false);
    toast.success(`تم رفع ${success} ملف بنجاح${failed ? ` · فشل ${failed}` : ""}`);
  };

  const stats = {
    total: files.length,
    matched: files.filter((f) => f.status === "pending").length,
    manual: files.filter((f) => f.status === "manual").length,
    done: files.filter((f) => f.status === "done").length,
    errors: files.filter((f) => f.status === "error").length,
  };

  const filteredProducts = manualSearch
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(manualSearch.toLowerCase()) ||
          (p.badge && p.badge.toLowerCase().includes(manualSearch.toLowerCase())) ||
          (p.reference_code && p.reference_code.toLowerCase().includes(manualSearch.toLowerCase()))
      )
    : products;

  return (
    <div className="space-y-6" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-extrabold text-foreground">📤 رفع PDF بالجملة</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          سمّ الملفات بالمرجع (مثل B123456.pdf) للربط التلقائي، أو اختر المنتج يدوياً
        </p>
        {loaded && (
          <p className="text-xs text-muted-foreground mt-1">
            تم تحميل {products.length} منتج من قاعدة البيانات
          </p>
        )}
      </motion.div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="cursor-pointer rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-card/50 p-10 flex flex-col items-center justify-center gap-3 transition-colors"
      >
        <Upload className="w-10 h-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">اسحب ملفات PDF هنا أو اضغط لاختيارها</p>
        <p className="text-xs text-muted-foreground/60">يمكنك اختيار عدة ملفات دفعة واحدة</p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        onChange={handleFilesSelected}
        className="hidden"
      />

      {/* Stats bar */}
      {files.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs px-3 py-1.5 rounded-full bg-secondary text-muted-foreground">
            الكل: {stats.total}
          </span>
          <span className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary">
            مطابق: {stats.matched}
          </span>
          {stats.manual > 0 && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400">
              يحتاج ربط: {stats.manual}
            </span>
          )}
          {stats.done > 0 && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-green-500/10 text-green-400">
              تم: {stats.done}
            </span>
          )}
          {stats.errors > 0 && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-destructive/10 text-destructive">
              خطأ: {stats.errors}
            </span>
          )}
          {stats.done > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={clearDone}>
              إزالة المكتملة
            </Button>
          )}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="divide-y divide-border/50">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {f.status === "uploading" ? (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  ) : f.status === "done" ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : f.status === "error" ? (
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  ) : (
                    <FileText className="w-4 h-4 text-primary" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{f.file.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {f.status === "manual" && (
                      <span className="text-amber-400">لم يتم العثور على منتج مطابق</span>
                    )}
                    {f.status === "error" && (
                      <span className="text-destructive">{f.error}</span>
                    )}
                    {f.status === "done" && (
                      <span className="text-green-400">✓ تم الرفع بنجاح</span>
                    )}
                    {f.matchedProductName && (
                      <span className="text-primary"> ← {f.matchedProductName}</span>
                    )}
                  </p>
                </div>

                {f.status === "manual" && (
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setManualPickIndex(i)}>
                    اختر منتج
                  </Button>
                )}

                {(f.status === "pending" || f.status === "manual" || f.status === "error") && (
                  <button
                    onClick={() => removeFile(i)}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        {stats.matched > 0 && (
          <Button onClick={uploadAll} disabled={uploading} className="gap-2">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            رفع {stats.matched} ملف مطابق
          </Button>
        )}
        {files.length > 0 && !uploading && (
          <Button variant="outline" onClick={() => setFiles([])}>
            مسح الكل
          </Button>
        )}
      </div>

      {/* Manual product picker dialog */}
      <Dialog open={manualPickIndex !== null} onOpenChange={(open) => { if (!open) { setManualPickIndex(null); setManualSearch(""); } }}>
        <DialogContent className="max-w-md max-h-[80vh]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm">
              اختر المنتج لملف: {manualPickIndex !== null && files[manualPickIndex]?.file.name}
            </DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={manualSearch}
              onChange={(e) => setManualSearch(e.target.value)}
              placeholder="بحث بالاسم أو الكود..."
              className="pr-9"
            />
          </div>
          <ScrollArea className="h-[350px]">
            <div className="space-y-1">
              {filteredProducts.slice(0, 100).map((p) => (
                <button
                  key={p.id}
                  onClick={() => manualPickIndex !== null && assignProduct(manualPickIndex, p)}
                  className="w-full text-right px-3 py-2 rounded-lg hover:bg-secondary/50 transition-colors flex items-center gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {p.badge || p.reference_code || "—"} {p.pdf_url ? "· 📄 PDF موجود" : ""}
                    </p>
                  </div>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">لا توجد نتائج</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BulkPdfUpload;
