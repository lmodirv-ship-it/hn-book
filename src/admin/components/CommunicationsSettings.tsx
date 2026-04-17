import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, MessageCircle, Mail } from "lucide-react";
import {
  communicationsService,
  type WhatsAppConfig,
  type EmailConfig,
} from "@/services/communicationsService";

const PLACEHOLDER_HINT = "المتغيرات المتاحة: {orderNumber} • {totalAmount} • {pdfUrl}";

export default function CommunicationsSettings() {
  const [loading, setLoading] = useState(true);
  const [savingWa, setSavingWa] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [wa, setWa] = useState<WhatsAppConfig>({
    enabled: false,
    phone_number: "",
    default_message: "",
  });
  const [em, setEm] = useState<EmailConfig>({
    enabled: false,
    email_address: "",
    subject_template: "",
    body_template: "",
  });

  useEffect(() => {
    Promise.all([communicationsService.getWhatsApp(), communicationsService.getEmail()])
      .then(([w, e]) => {
        setWa(w);
        setEm(e);
      })
      .catch(() => toast.error("تعذر تحميل الإعدادات"))
      .finally(() => setLoading(false));
  }, []);

  const saveWa = async () => {
    setSavingWa(true);
    try {
      const cleaned = { ...wa, phone_number: wa.phone_number.replace(/[^\d]/g, "") };
      await communicationsService.saveWhatsApp(cleaned);
      setWa(cleaned);
      toast.success("تم حفظ إعدادات واتساب");
    } catch (e: any) {
      toast.error(e.message || "فشل الحفظ");
    } finally {
      setSavingWa(false);
    }
  };

  const saveEm = async () => {
    setSavingEmail(true);
    try {
      await communicationsService.saveEmail(em);
      toast.success("تم حفظ إعدادات البريد");
    } catch (e: any) {
      toast.error(e.message || "فشل الحفظ");
    } finally {
      setSavingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-600" /> WhatsApp المطبعة
          </CardTitle>
          <CardDescription>الرقم الذي ستُرسل إليه طلبات الطباعة عبر واتساب</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>مُفعّل</Label>
            <Switch checked={wa.enabled} onCheckedChange={(v) => setWa({ ...wa, enabled: v })} />
          </div>
          <div>
            <Label>رقم الهاتف (مع رمز الدولة، بدون +)</Label>
            <Input
              dir="ltr"
              value={wa.phone_number}
              onChange={(e) => setWa({ ...wa, phone_number: e.target.value })}
              placeholder="212668546358"
              maxLength={20}
            />
          </div>
          <div>
            <Label>قالب الرسالة الافتراضي</Label>
            <Textarea
              rows={5}
              value={wa.default_message}
              onChange={(e) => setWa({ ...wa, default_message: e.target.value })}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground mt-1">{PLACEHOLDER_HINT}</p>
          </div>
          <Button onClick={saveWa} disabled={savingWa} className="w-full">
            {savingWa && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            حفظ إعدادات واتساب
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" /> البريد الإلكتروني للمطبعة
          </CardTitle>
          <CardDescription>عنوان البريد المُستخدم لإرسال طلبات الطباعة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>مُفعّل</Label>
            <Switch checked={em.enabled} onCheckedChange={(v) => setEm({ ...em, enabled: v })} />
          </div>
          <div>
            <Label>البريد الإلكتروني</Label>
            <Input
              dir="ltr"
              type="email"
              value={em.email_address}
              onChange={(e) => setEm({ ...em, email_address: e.target.value })}
              placeholder="print@example.com"
              maxLength={255}
            />
          </div>
          <div>
            <Label>قالب الموضوع</Label>
            <Input
              value={em.subject_template}
              onChange={(e) => setEm({ ...em, subject_template: e.target.value })}
              maxLength={200}
            />
          </div>
          <div>
            <Label>قالب نص الرسالة</Label>
            <Textarea
              rows={5}
              value={em.body_template}
              onChange={(e) => setEm({ ...em, body_template: e.target.value })}
              maxLength={5000}
            />
            <p className="text-xs text-muted-foreground mt-1">{PLACEHOLDER_HINT}</p>
          </div>
          <Button onClick={saveEm} disabled={savingEmail} className="w-full">
            {savingEmail && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            حفظ إعدادات البريد
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
