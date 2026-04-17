import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Loader2, Download, MessageCircle, Printer, FileText, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { buildPrintReadyPdf, type PageSize, type BuildPrintPdfResult } from "@/lib/print-pdf";

interface PrintReadyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frontNode: HTMLElement | null;
  backNode: HTMLElement | null;
  cardName: string;
  /** Pre-filled phone (international format, no +) for print shop. */
  defaultPhone?: string;
}

const PrintReadyDialog = ({ open, onOpenChange, frontNode, backNode, cardName, defaultPhone }: PrintReadyDialogProps) => {
  const [pageSize, setPageSize] = useState<PageSize>("A4");
  const [cutMarks, setCutMarks] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<BuildPrintPdfResult | null>(null);
  const [phone, setPhone] = useState(defaultPhone ?? "212600000000");
  const [note, setNote] = useState("");

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

  const sendToWhatsApp = () => {
    if (!result) return;
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 8) {
      toast({ title: "رقم هاتف غير صالح", variant: "destructive" });
      return;
    }
    const lines = [
      `🖨️ *طلب طباعة بطاقات* - ${cardName}`,
      ``,
      `📐 المقاس: ${pageSize}`,
      `🔢 العدد في الصفحة: ${result.totalCards} بطاقة`,
      `📏 مقاس البطاقة: ${result.layout.cardWidth}×${result.layout.cardHeight}mm`,
      `✂️ علامات القص: ${cutMarks ? "نعم" : "لا"}`,
      `📄 الوجهين: ${backNode ? "نعم (Front + Back)" : "وجه واحد"}`,
      ``,
      note ? `📝 ملاحظات: ${note}` : null,
      ``,
      `⚠️ سأرفق ملف PDF الجاهز للطباعة في الرسالة التالية.`,
    ].filter(Boolean).join("\n");
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(lines)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    // also auto-download so they can attach it
    download();
  };

  const handleClose = (next: boolean) => {
    if (!next && result) {
      URL.revokeObjectURL(result.url);
      setResult(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-primary" />
            توليد PDF جاهز للطباعة
          </DialogTitle>
          <DialogDescription>
            احصل على ملف PDF عالي الدقة بصفحة كاملة من البطاقات، جاهز لمطبعتك.
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
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-border overflow-hidden bg-muted/20">
              <iframe src={result.url} title="PDF preview" className="w-full h-[420px] bg-white" />
            </div>
            <div className="text-xs text-muted-foreground text-center">
              {result.totalCards} بطاقة في الصفحة • {result.layout.cols}×{result.layout.rows} • {result.layout.pageSize}
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
              <div>
                <Label className="text-sm">رقم المطبعة (واتساب)</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="212600000000" className="mt-1" />
                <p className="text-[10px] text-muted-foreground mt-1">صيغة دولية بدون +</p>
              </div>
              <div>
                <Label className="text-sm">ملاحظات إضافية للمطبعة</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="نوع الورق، الكمية، تاريخ التسليم..." rows={2} className="mt-1" />
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => { URL.revokeObjectURL(result.url); setResult(null); }}>
                توليد جديد
              </Button>
              <Button variant="secondary" onClick={() => handleClose(false)}>إغلاق</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PrintReadyDialog;
