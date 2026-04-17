import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Loader2, Download, MessageCircle, Printer, FileText, Eye, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { buildPrintReadyPdf, type PageSize, type BuildPrintPdfResult } from "@/lib/print-pdf";
import { printService, DELIVERY_OPTIONS, getShippingFee, calculatePrice } from "@/services/printService";
import { printPricingService } from "@/services/printPricingService";

interface PrintReadyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frontNode: HTMLElement | null;
  backNode: HTMLElement | null;
  cardName: string;
  /** ID of the card_templates row this design is based on. Required to create an order. */
  templateId?: string;
  /** Snapshot of editor values + styles to persist with the order. */
  designData?: Record<string, any>;
  /** Pre-filled phone (international format, no +) for print shop. */
  defaultPhone?: string;
}

const PrintReadyDialog = ({ open, onOpenChange, frontNode, backNode, cardName, templateId, designData, defaultPhone }: PrintReadyDialogProps) => {
  const [pageSize, setPageSize] = useState<PageSize>("A4");
  const [cutMarks, setCutMarks] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<BuildPrintPdfResult | null>(null);
  const [phone, setPhone] = useState(defaultPhone ?? "212600000000");
  const [note, setNote] = useState("");

  // Order details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [quantity, setQuantity] = useState(100);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [deliveryOption, setDeliveryOption] = useState<"standard" | "express">("standard");
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [orderPdfUrl, setOrderPdfUrl] = useState<string | null>(null);

  const printType = backNode ? "double_side" : "one_side";

  // Dynamic pricing — try DB rules first, fall back to hardcoded calculatePrice
  const [dynamicPrice, setDynamicPrice] = useState<{
    base: number; original: number; discount: number; ship: number;
    promo: string | null; featured: boolean;
  } | null>(null);
  useEffect(() => {
    let cancelled = false;
    printPricingService
      .resolvePrice("CRD", quantity, pageSize)
      .then((r) => {
        if (cancelled) return;
        setDynamicPrice(r ? {
          base: r.base_price,
          original: r.original_price,
          discount: r.discount_percent,
          ship: r.shipping_price,
          promo: r.promo_label,
          featured: r.is_featured,
        } : null);
      })
      .catch(() => { if (!cancelled) setDynamicPrice(null); });
    return () => { cancelled = true; };
  }, [quantity, pageSize]);

  const printSubtotal = dynamicPrice
    ? Math.round(dynamicPrice.base)
    : calculatePrice(quantity, "standard", printType, pageSize);
  const shippingFee = dynamicPrice && dynamicPrice.ship > 0
    ? Math.round(dynamicPrice.ship)
    : getShippingFee(deliveryOption);
  const grandTotal = printSubtotal + shippingFee;

  const generate = async () => {
    if (!frontNode) {
      toast({ title: "لا يمكن العثور على الوجه الأمامي", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const r = await buildPrintReadyPdf({
        frontNode,
        backNode: backNode || null,
        pageSize,
        cutMarks,
        fileName: `${cardName || "carte"}-${pageSize}.pdf`,
      });
      setResult(r);
      toast({ title: "تم توليد ملف الطباعة ✅", description: `${r.totalCards} بطاقة في الصفحة • ${pageSize}` });
    } catch (e: any) {
      toast({ title: "فشل توليد PDF", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result.url;
    a.download = result.fileName;
    a.click();
  };

  /** Create the print order in the database (uploads the PDF to public storage). */
  const submitOrder = async () => {
    if (!result) return;
    if (!templateId) {
      toast({ title: "Template ID مفقود", description: "لا يمكن حفظ الطلب بدون قالب.", variant: "destructive" });
      return;
    }
    const name = customerName.trim();
    const cleanPhone = customerPhone.replace(/\D/g, "");
    if (name.length < 2) {
      toast({ title: "أدخل اسم العميل", variant: "destructive" });
      return;
    }
    if (cleanPhone.length < 8) {
      toast({ title: "رقم هاتف غير صالح", variant: "destructive" });
      return;
    }
    if (address.trim().length < 5) {
      toast({ title: "أدخل العنوان الكامل", variant: "destructive" });
      return;
    }
    if (city.trim().length < 2) {
      toast({ title: "أدخل المدينة", variant: "destructive" });
      return;
    }
    setSubmittingOrder(true);
    try {
      const pdfUrl = await printService.uploadPrintPdf(result.blob, result.fileName);
      const created = await printService.createOrder({
        template_id: templateId,
        customer_name: name,
        phone: cleanPhone,
        quantity,
        paper_size: pageSize,
        paper_type: "standard",
        print_type: backNode ? "double_side" : "one_side",
        address: address.trim(),
        city: city.trim(),
        delivery_option: deliveryOption,
        shipping_fee: shippingFee,
        total_price: grandTotal,
        pdf_url: pdfUrl,
        template_design: designData ?? {},
        notes: note,
        status: "pending",
      });
      if (!created) throw new Error("No data returned");
      setOrderCode(created.order_code);
      setOrderPdfUrl(pdfUrl);
      toast({ title: "تم إنشاء الطلب ✅", description: `رقم الطلب: ${created.order_code}` });
    } catch (e: any) {
      toast({ title: "فشل إنشاء الطلب", description: e.message, variant: "destructive" });
    } finally {
      setSubmittingOrder(false);
    }
  };

  const sendToWhatsApp = () => {
    if (!result) return;
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 8) {
      toast({ title: "رقم هاتف غير صالح", variant: "destructive" });
      return;
    }
    const lines = [
      `🖨️ *طلب طباعة بطاقات* - ${cardName}`,
      orderCode ? `🆔 رقم الطلب: *${orderCode}*` : null,
      ``,
      `📐 المقاس: ${pageSize}`,
      `🔢 الكمية: ${quantity} بطاقة`,
      `🧮 العدد في الصفحة: ${result.totalCards} بطاقة`,
      `📏 مقاس البطاقة: ${result.layout.cardWidth}×${result.layout.cardHeight}mm`,
      `✂️ علامات القص: ${cutMarks ? "نعم" : "لا"}`,
      `📄 الوجهين: ${backNode ? "نعم (Front + Back)" : "وجه واحد"}`,
      orderPdfUrl ? `📎 ملف PDF: ${orderPdfUrl}` : null,
      ``,
      note ? `📝 ملاحظات: ${note}` : null,
    ].filter(Boolean).join("\n");
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(lines)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    if (!orderPdfUrl) download();
  };

  const copyCode = () => {
    if (!orderCode) return;
    navigator.clipboard.writeText(orderCode);
    toast({ title: "تم نسخ رقم الطلب" });
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      if (result) URL.revokeObjectURL(result.url);
      setResult(null);
      setOrderCode(null);
      setOrderPdfUrl(null);
      setCustomerName("");
      setCustomerPhone("");
      setAddress("");
      setCity("");
      setDeliveryOption("standard");
      setNote("");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-primary" />
            توليد PDF و طلب طباعة
          </DialogTitle>
          <DialogDescription>
            احصل على ملف PDF عالي الدقة وأنشئ طلب طباعة لتتبعه لاحقاً.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-5">
            <div>
              <Label className="mb-2 block">حجم الورق</Label>
              <RadioGroup value={pageSize} onValueChange={(v) => setPageSize(v as PageSize)} className="grid grid-cols-2 gap-3">
                <label
                  htmlFor="ps-a4"
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition ${pageSize === "A4" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}
                >
                  <RadioGroupItem id="ps-a4" value="A4" />
                  <div>
                    <div className="font-semibold text-sm">A4</div>
                    <div className="text-xs text-muted-foreground">210×297mm — ~10 بطاقات</div>
                  </div>
                </label>
                <label
                  htmlFor="ps-a3"
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition ${pageSize === "A3" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}
                >
                  <RadioGroupItem id="ps-a3" value="A3" />
                  <div>
                    <div className="font-semibold text-sm">A3</div>
                    <div className="text-xs text-muted-foreground">297×420mm — ~21 بطاقة</div>
                  </div>
                </label>
              </RadioGroup>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label className="text-sm">علامات القص (Cut marks)</Label>
                <p className="text-xs text-muted-foreground">يضيف علامات صغيرة عند زوايا كل بطاقة لتسهيل القص.</p>
              </div>
              <Switch checked={cutMarks} onCheckedChange={setCutMarks} />
            </div>

            <div className="rounded-lg bg-muted/30 border border-border p-3 text-xs text-muted-foreground space-y-1">
              <p className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> صفحة 1: الوجه الأمامي مكرر في شبكة</p>
              {backNode && <p className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> صفحة 2: الوجه الخلفي بنفس الترتيب (مرآة) — مناسب للطباعة على الوجهين</p>}
              <p className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> دقة ~300 DPI • مقاس البطاقة 85×55mm</p>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => handleClose(false)} disabled={generating}>إلغاء</Button>
              <Button onClick={generate} disabled={generating} className="gap-1.5">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                توليد PDF للطباعة
              </Button>
            </DialogFooter>
          </div>
        ) : orderCode ? (
          // Order confirmation view
          <div className="space-y-4">
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">تم إنشاء طلبك بنجاح</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <p className="text-2xl font-bold text-foreground tracking-wider">{orderCode}</p>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={copyCode}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">احتفظ برقم الطلب لتتبع حالة الطباعة</p>
                <p className="text-base font-bold text-primary mt-3">المبلغ الإجمالي: {grandTotal} د.م</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button onClick={download} variant="outline" className="gap-1.5">
                <Download className="w-4 h-4" /> تحميل PDF
              </Button>
              <Button onClick={sendToWhatsApp} className="gap-1.5 bg-[#25D366] hover:bg-[#1DA851] text-white">
                <MessageCircle className="w-4 h-4" /> إرسال للمطبعة (واتساب)
              </Button>
            </div>

            <div className="space-y-2 rounded-lg border border-border p-3">
              <Label className="text-sm">رقم المطبعة (واتساب)</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="212600000000" />
              <p className="text-[10px] text-muted-foreground">صيغة دولية بدون +</p>
            </div>

            <DialogFooter>
              <Button variant="secondary" onClick={() => handleClose(false)}>إغلاق</Button>
              <Button variant="ghost" asChild>
                <a href={`/track-order?code=${encodeURIComponent(orderCode)}`}>تتبع الطلب</a>
              </Button>
            </DialogFooter>
          </div>
        ) : (
          // PDF generated, awaiting order details
          <div className="space-y-4">
            <div className="rounded-lg border border-border overflow-hidden bg-muted/20">
              <iframe src={result.url} title="PDF preview" className="w-full h-[260px] bg-white" />
            </div>
            <div className="text-xs text-muted-foreground text-center">
              {result.totalCards} بطاقة في الصفحة • {result.layout.cols}×{result.layout.rows} • {result.layout.pageSize}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-border p-3">
              <div>
                <Label className="text-sm">اسم العميل *</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="محمد أمين" maxLength={100} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">الهاتف *</Label>
                <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="0612345678" maxLength={20} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">الكمية</Label>
                <Input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 100))} min={1} max={10000} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">حجم الورق</Label>
                <Input value={pageSize} disabled className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-sm">العنوان الكامل *</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="الشارع، الحي، الرقم..." maxLength={200} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">المدينة *</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="الدار البيضاء" maxLength={80} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">طريقة التوصيل</Label>
                <RadioGroup
                  value={deliveryOption}
                  onValueChange={(v) => setDeliveryOption(v as "standard" | "express")}
                  className="mt-1 grid grid-cols-1 gap-1.5"
                >
                  {DELIVERY_OPTIONS.map((o) => (
                    <label
                      key={o.value}
                      htmlFor={`do-${o.value}`}
                      className={`flex items-center gap-2 rounded-md border p-2 cursor-pointer text-xs transition ${deliveryOption === o.value ? "border-primary bg-primary/5" : "border-border"}`}
                    >
                      <RadioGroupItem id={`do-${o.value}`} value={o.value} />
                      <span className="flex-1">{o.label}</span>
                      <span className="font-bold text-primary">+{o.fee} د.م</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-sm">ملاحظات (اختياري)</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="نوع الورق، تاريخ التسليم..." rows={2} maxLength={500} className="mt-1" />
              </div>
            </div>

            {/* Price summary */}
            <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-3 space-y-1.5 text-sm">
              {dynamicPrice?.promo && (
                <div className="flex items-center justify-between -mt-1 mb-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-medium">
                    ✨ {dynamicPrice.promo}
                  </span>
                  {dynamicPrice.discount > 0 && (
                    <span className="text-xs font-semibold text-destructive">−{dynamicPrice.discount}%</span>
                  )}
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>الطباعة ({quantity} × {pageSize} · {printType === "double_side" ? "وجهين" : "وجه واحد"})</span>
                <span className="font-medium text-foreground inline-flex items-baseline gap-1.5">
                  {dynamicPrice && dynamicPrice.discount > 0 && (
                    <span className="text-xs text-muted-foreground line-through">{Math.round(dynamicPrice.original)} د.م</span>
                  )}
                  {printSubtotal} د.م
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>الشحن ({deliveryOption === "express" ? "سريع" : "عادي"})</span>
                <span className="font-medium text-foreground">{shippingFee} د.م</span>
              </div>
              <div className="h-px bg-border my-1" />
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-foreground">المجموع الكلي</span>
                <span className="text-xl font-bold text-primary">{grandTotal} <span className="text-xs">د.م</span></span>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={download}>
                تحميل PDF فقط
              </Button>
              <Button onClick={submitOrder} disabled={submittingOrder} className="gap-1.5">
                {submittingOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                إنشاء طلب طباعة
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PrintReadyDialog;
