import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Copy, Upload, Loader2, CheckCircle2, MessageCircle, Banknote, Wallet } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { paymentService } from "@/services/paymentService";

// Configure these from CMS or env later
const BANK_NAME = "Attijariwafa Bank";
const BANK_RIB = "007 780 0001234567890123 45";
const BANK_HOLDER = "HN STUDIO";
const WHATSAPP_NUMBER = "+212600000000";

const CREDIT_PACKS = [
  { credits: 50, price: 30 },
  { credits: 120, price: 60 },
  { credits: 300, price: 120 },
  { credits: 700, price: 250 },
];

const ManualPayment = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const orderId = params.get("order_id");
  const orderAmount = Number(params.get("amount") ?? 0);

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [packIdx, setPackIdx] = useState(1);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  const purpose: "credits" | "print_order" = orderId ? "print_order" : "credits";
  const pack = CREDIT_PACKS[packIdx];
  const amount = orderId ? orderAmount : pack.price;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
  }, []);

  const waMessage = useMemo(() => {
    const lines = [
      "السلام عليكم،",
      "أكدت تحويلاً للدفع عبر HN Studio.",
      paymentId ? `رقم العملية: ${paymentId}` : "",
      `المبلغ: ${amount} MAD`,
      orderId ? `طلب طباعة: ${orderId}` : `حزمة رصيد: ${pack.credits} نقطة`,
    ].filter(Boolean);
    return encodeURIComponent(lines.join("\n"));
  }, [amount, orderId, pack, paymentId]);

  const waUrl = `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, "")}?text=${waMessage}`;

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم النسخ");
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const p = await paymentService.createManualPayment({
        amount,
        purpose,
        credits_to_add: purpose === "credits" ? pack.credits : 0,
        print_order_id: orderId ?? undefined,
      });
      setPaymentId(p.id);
      toast.success("تم إنشاء طلب الدفع. الرجاء التحويل ورفع الإثبات.");
    } catch (e) {
      toast.error((e as Error).message || "فشل إنشاء الدفع");
    } finally {
      setCreating(false);
    }
  };

  const handleUpload = async () => {
    if (!paymentId || !file) return;
    setUploading(true);
    try {
      await paymentService.uploadProof(paymentId, file);
      setDone(true);
      toast.success("تم رفع الإثبات. سنراجعه قريباً.");
    } catch (e) {
      toast.error((e as Error).message || "فشل الرفع");
    } finally {
      setUploading(false);
    }
  };

  if (authed === false) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <Navbar />
        <main className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">سجّل الدخول للمتابعة</h1>
          <Button onClick={() => navigate(`/auth?next=/pay/manual${orderId ? `?order_id=${orderId}&amount=${orderAmount}` : ""}`)}>
            تسجيل الدخول
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold mb-2">
          الدفع اليدوي 🇲🇦
        </motion.h1>
        <p className="text-muted-foreground mb-8">تحويل بنكي أو واتساب — الموافقة من الإدارة خلال 24 ساعة.</p>

        {/* Step 1: Choose */}
        {!paymentId && (
          <Card className="p-6 mb-6 border-glow">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" /> ما الذي تدفع مقابله؟
            </h2>
            {orderId ? (
              <div className="bg-secondary/50 rounded-lg p-4 mb-4">
                <p className="text-sm text-muted-foreground">طلب طباعة</p>
                <p className="font-mono text-xs">{orderId}</p>
                <p className="text-2xl font-bold text-primary mt-2">{amount} MAD</p>
              </div>
            ) : (
              <RadioGroup value={String(packIdx)} onValueChange={(v) => setPackIdx(Number(v))} className="grid grid-cols-2 gap-3 mb-4">
                {CREDIT_PACKS.map((p, i) => (
                  <Label
                    key={i}
                    htmlFor={`pack-${i}`}
                    className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                      packIdx === i ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value={String(i)} id={`pack-${i}`} />
                    <div>
                      <p className="font-bold">{p.credits} نقطة</p>
                      <p className="text-sm text-muted-foreground">{p.price} MAD</p>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            )}
            <Button onClick={handleCreate} disabled={creating} className="w-full" size="lg">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "متابعة"}
            </Button>
          </Card>
        )}

        {/* Step 2: Pay */}
        {paymentId && !done && (
          <>
            <Card className="p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-primary" /> 1. حوّل المبلغ
              </h2>
              <div className="space-y-3 text-sm">
                <Row label="المبلغ" value={`${amount} MAD`} onCopy={() => copy(String(amount))} highlight />
                <Row label="البنك" value={BANK_NAME} />
                <Row label="صاحب الحساب" value={BANK_HOLDER} />
                <Row label="RIB" value={BANK_RIB} onCopy={() => copy(BANK_RIB.replace(/\s/g, ""))} mono />
                <Row label="مرجع العملية" value={paymentId.slice(0, 8).toUpperCase()} onCopy={() => copy(paymentId)} mono />
              </div>
              <a href={waUrl} target="_blank" rel="noopener noreferrer" className="block mt-4">
                <Button variant="outline" className="w-full gap-2">
                  <MessageCircle className="w-4 h-4" /> تأكيد عبر واتساب: {WHATSAPP_NUMBER}
                </Button>
              </a>
            </Card>

            <Card className="p-6 border-primary/30">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" /> 2. ارفع إثبات التحويل
              </h2>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mb-4"
              />
              {file && <p className="text-xs text-muted-foreground mb-3">📎 {file.name}</p>}
              <Button onClick={handleUpload} disabled={!file || uploading} className="w-full" size="lg">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "رفع الإثبات"}
              </Button>
            </Card>
          </>
        )}

        {/* Done */}
        {done && (
          <Card className="p-8 text-center border-primary">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold mb-2">تم الاستلام ✅</h2>
            <p className="text-muted-foreground mb-6">سيراجع فريقنا الإثبات خلال 24 ساعة.</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate("/billing")}>تتبع الدفعات</Button>
              <Button variant="outline" onClick={() => navigate("/")}>الصفحة الرئيسية</Button>
            </div>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
};

const Row = ({
  label,
  value,
  onCopy,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  mono?: boolean;
  highlight?: boolean;
}) => (
  <div className={`flex items-center justify-between gap-3 p-3 rounded-lg ${highlight ? "bg-primary/10" : "bg-secondary/40"}`}>
    <span className="text-muted-foreground text-xs">{label}</span>
    <div className="flex items-center gap-2">
      <span className={`${mono ? "font-mono text-xs" : "font-semibold"} ${highlight ? "text-primary text-base" : ""}`}>
        {value}
      </span>
      {onCopy && (
        <button onClick={onCopy} className="p-1 hover:bg-background rounded">
          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}
    </div>
  </div>
);

export default ManualPayment;
