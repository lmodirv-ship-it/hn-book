import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CreditCard, MessageCircle, BarChart3, ShieldCheck, AlertTriangle } from "lucide-react";
import {
  integrationsService,
  type ApiIntegration,
  type IntegrationStatus,
  maskKey,
} from "@/services/integrationsService";
import IntegrationLogsPanel from "@/admin/components/IntegrationLogsPanel";

type Provider = "stripe" | "whatsapp" | "analytics";

const PROVIDERS: Array<{
  key: Provider;
  name: string;
  title: string;
  description: string;
  icon: React.ElementType;
  defaultBaseUrl: string;
  secretLabel: string;
  defaultSecretRef: string;
  testCta: string;
}> = [
  {
    key: "stripe",
    name: "stripe",
    title: "Stripe",
    description: "قبول الدفعات عبر بطاقات الائتمان",
    icon: CreditCard,
    defaultBaseUrl: "https://api.stripe.com/v1",
    secretLabel: "Secret Key (sk_…)",
    defaultSecretRef: "STRIPE_SECRET_KEY",
    testCta: "اختبار الاتصال",
  },
  {
    key: "whatsapp",
    name: "whatsapp",
    title: "WhatsApp Business",
    description: "إرسال الرسائل عبر WhatsApp Cloud API",
    icon: MessageCircle,
    defaultBaseUrl: "https://graph.facebook.com/v20.0",
    secretLabel: "Access Token",
    defaultSecretRef: "WHATSAPP_ACCESS_TOKEN",
    testCta: "إرسال رسالة اختبار",
  },
  {
    key: "analytics",
    name: "analytics",
    title: "Analytics",
    description: "Google Analytics / GTM tracking ID",
    icon: BarChart3,
    defaultBaseUrl: "https://www.google-analytics.com",
    secretLabel: "—",
    defaultSecretRef: "",
    testCta: "التحقق من الصيغة",
  },
];

function StatusBadge({ status }: { status?: IntegrationStatus }) {
  if (status === "connected") {
    return <Badge className="bg-green-600 hover:bg-green-700">متصل</Badge>;
  }
  if (status === "error") {
    return <Badge variant="destructive">خطأ</Badge>;
  }
  return <Badge variant="secondary">غير مهيّأ</Badge>;
}

type FormState = {
  publishable_key: string; // stripe
  secret_key: string;      // stripe
  phone_number: string;    // whatsapp
  phone_number_id: string; // whatsapp
  access_token: string;    // whatsapp
  test_to: string;         // whatsapp test
  tracking_id: string;     // analytics
};

const emptyForm: FormState = {
  publishable_key: "",
  secret_key: "",
  phone_number: "",
  phone_number_id: "",
  access_token: "",
  test_to: "",
  tracking_id: "",
};

export default function ApiSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Provider | null>(null);
  const [testing, setTesting] = useState<Provider | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<Record<Provider, boolean>>({
    stripe: false,
    whatsapp: false,
    analytics: false,
  });
  const [integrations, setIntegrations] = useState<Record<Provider, ApiIntegration | null>>({
    stripe: null,
    whatsapp: null,
    analytics: null,
  });
  const [forms, setForms] = useState<Record<Provider, FormState>>({
    stripe: { ...emptyForm },
    whatsapp: { ...emptyForm },
    analytics: { ...emptyForm },
  });

  const load = async () => {
    setLoading(true);
    try {
      const all = await integrationsService.list();
      const map: Record<Provider, ApiIntegration | null> = {
        stripe: null, whatsapp: null, analytics: null,
      };
      for (const p of PROVIDERS) {
        map[p.key] = all.find((i) => i.name.toLowerCase() === p.name) ?? null;
      }
      setIntegrations(map);
      setForms({
        stripe: {
          ...emptyForm,
          publishable_key: String(map.stripe?.config?.publishable_key ?? ""),
          secret_key: "", // never load secret to client
        },
        whatsapp: {
          ...emptyForm,
          phone_number: String(map.whatsapp?.config?.phone_number ?? ""),
          phone_number_id: String(map.whatsapp?.config?.phone_number_id ?? ""),
          access_token: "",
        },
        analytics: {
          ...emptyForm,
          tracking_id: String(map.analytics?.config?.tracking_id ?? ""),
        },
      });
    } catch (e) {
      toast.error(`تعذّر تحميل التكاملات: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateForm = (p: Provider, patch: Partial<FormState>) =>
    setForms((f) => ({ ...f, [p]: { ...f[p], ...patch } }));

  const handleToggle = async (p: Provider, isActive: boolean) => {
    const integ = integrations[p];
    if (!integ) {
      toast.error("احفظ الإعدادات أولاً قبل التفعيل");
      return;
    }
    try {
      await integrationsService.toggle(integ.id, isActive);
      setIntegrations((m) => ({ ...m, [p]: { ...integ, is_active: isActive } }));
      toast.success(isActive ? "تم التفعيل" : "تم الإيقاف");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleSave = async (p: Provider) => {
    setSaving(p);
    try {
      const provider = PROVIDERS.find((x) => x.key === p)!;
      const f = forms[p];
      const config: Record<string, unknown> = {};
      let key_hint: string | null = null;
      let secret_ref: string | null = provider.defaultSecretRef || null;

      if (p === "stripe") {
        if (!f.publishable_key.startsWith("pk_")) {
          throw new Error("Publishable key must start with pk_");
        }
        config.publishable_key = f.publishable_key.trim();
        if (f.secret_key) {
          if (!f.secret_key.startsWith("sk_")) throw new Error("Secret key must start with sk_");
          key_hint = f.secret_key.slice(-4);
        }
      } else if (p === "whatsapp") {
        if (!f.phone_number_id.trim()) throw new Error("phone_number_id مطلوب");
        config.phone_number = f.phone_number.trim();
        config.phone_number_id = f.phone_number_id.trim();
        if (f.access_token) key_hint = f.access_token.slice(-4);
      } else {
        if (!/^(G-[A-Z0-9]{6,}|UA-\d{4,}-\d+|GTM-[A-Z0-9]{5,})$/i.test(f.tracking_id.trim())) {
          throw new Error("Tracking ID format غير صالح (G-…, UA-…, GTM-…)");
        }
        config.tracking_id = f.tracking_id.trim();
        secret_ref = null;
      }

      await integrationsService.upsertByName(provider.name, {
        base_url: provider.defaultBaseUrl,
        category: "payments_messaging_analytics",
        config,
        secret_ref,
        api_key_name: secret_ref ? "Authorization" : null,
        key_hint: key_hint ?? integrations[p]?.key_hint ?? null,
      });
      toast.success("تم الحفظ");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(null);
    }
  };

  const handleTest = async (p: Provider) => {
    setTesting(p);
    try {
      const integ = integrations[p];
      const provider = PROVIDERS.find((x) => x.key === p)!;
      const f = forms[p];

      const config: Record<string, unknown> = {};
      if (p === "analytics") config.tracking_id = f.tracking_id.trim();
      if (p === "whatsapp") config.phone_number_id = f.phone_number_id.trim();

      const result = await integrationsService.testProvider({
        provider: p,
        integration_id: integ?.id,
        secret_ref: integ?.secret_ref ?? provider.defaultSecretRef ?? undefined,
        config,
        test_to: p === "whatsapp" ? f.test_to.trim() || undefined : undefined,
      });

      if (result.ok) toast.success(`✅ ${provider.title}: نجح الاختبار`);
      else toast.error(`❌ ${provider.title}: ${result.snippet || "فشل"}`);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setTesting(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">إعدادات التكاملات</h1>
        <p className="text-muted-foreground">
          أدر بيانات Stripe و WhatsApp و Analytics من مكان واحد. المفاتيح السرية تُخزّن في Lovable Cloud Secrets ولا تُعرض للمتصفح.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {PROVIDERS.map((p) => {
          const integ = integrations[p.key];
          const Icon = p.icon;
          const f = forms[p.key];
          const isActive = !!integ?.is_active;

          return (
            <Card key={p.key} className="flex flex-col">
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>{p.title}</CardTitle>
                      <CardDescription>{p.description}</CardDescription>
                    </div>
                  </div>
                  <StatusBadge status={integ?.status} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-2">
                  <div className="text-sm">
                    {isActive ? "مفعّل ويُستخدم في النظام" : "معطّل"}
                  </div>
                  <Switch
                    checked={isActive}
                    onCheckedChange={(v) => handleToggle(p.key, v)}
                    disabled={!integ}
                  />
                </div>
              </CardHeader>

              <CardContent className="space-y-4 flex-1 flex flex-col">
                {p.key === "stripe" && (
                  <>
                    <div className="space-y-2">
                      <Label>Publishable Key</Label>
                      <Input
                        placeholder="pk_test_..."
                        value={f.publishable_key}
                        onChange={(e) => updateForm("stripe", { publishable_key: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{p.secretLabel}</Label>
                      <Input
                        type={revealedSecret.stripe ? "text" : "password"}
                        placeholder={integ?.key_hint ? `محفوظ ${maskKey(integ.key_hint)}` : "sk_test_..."}
                        value={f.secret_key}
                        onChange={(e) => updateForm("stripe", { secret_key: e.target.value })}
                      />
                      <button
                        type="button"
                        className="text-xs text-muted-foreground underline"
                        onClick={() => setRevealedSecret((r) => ({ ...r, stripe: !r.stripe }))}
                      >
                        {revealedSecret.stripe ? "إخفاء" : "إظهار"}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-start gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      المفتاح السري يجب إضافته إلى Lovable Cloud Secrets باسم <code className="px-1 bg-muted rounded">STRIPE_SECRET_KEY</code>.
                    </p>
                  </>
                )}

                {p.key === "whatsapp" && (
                  <>
                    <div className="space-y-2">
                      <Label>رقم الهاتف</Label>
                      <Input
                        placeholder="+212..."
                        value={f.phone_number}
                        onChange={(e) => updateForm("whatsapp", { phone_number: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number ID</Label>
                      <Input
                        placeholder="123456789012345"
                        value={f.phone_number_id}
                        onChange={(e) => updateForm("whatsapp", { phone_number_id: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{p.secretLabel}</Label>
                      <Input
                        type={revealedSecret.whatsapp ? "text" : "password"}
                        placeholder={integ?.key_hint ? `محفوظ ${maskKey(integ.key_hint)}` : "EAA..."}
                        value={f.access_token}
                        onChange={(e) => updateForm("whatsapp", { access_token: e.target.value })}
                      />
                      <button
                        type="button"
                        className="text-xs text-muted-foreground underline"
                        onClick={() => setRevealedSecret((r) => ({ ...r, whatsapp: !r.whatsapp }))}
                      >
                        {revealedSecret.whatsapp ? "إخفاء" : "إظهار"}
                      </button>
                    </div>
                    <div className="space-y-2">
                      <Label>إرسال رسالة اختبار إلى</Label>
                      <Input
                        placeholder="+212600000000 (اختياري)"
                        value={f.test_to}
                        onChange={(e) => updateForm("whatsapp", { test_to: e.target.value })}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground flex items-start gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      Access Token يُخزّن في Secrets باسم <code className="px-1 bg-muted rounded">WHATSAPP_ACCESS_TOKEN</code>.
                    </p>
                  </>
                )}

                {p.key === "analytics" && (
                  <>
                    <div className="space-y-2">
                      <Label>Tracking ID</Label>
                      <Input
                        placeholder="G-XXXXXXX, UA-XXXXXX-Y or GTM-XXXXXX"
                        value={f.tracking_id}
                        onChange={(e) => updateForm("analytics", { tracking_id: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        يدعم GA4 (G-…), Universal Analytics (UA-…), و GTM-….
                      </p>
                    </div>
                  </>
                )}

                {integ?.last_test_message && (
                  <div className="rounded-md border p-2 bg-muted/40 text-xs">
                    <div className="flex items-center gap-1 mb-1 text-muted-foreground">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      آخر اختبار {integ.last_tested_at ? `(${new Date(integ.last_tested_at).toLocaleString()})` : ""}
                    </div>
                    <pre className="whitespace-pre-wrap break-all max-h-24 overflow-auto">{integ.last_test_message}</pre>
                  </div>
                )}

                <div className="flex gap-2 mt-auto pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleTest(p.key)}
                    disabled={testing === p.key}
                  >
                    {testing === p.key && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                    {p.testCta}
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => handleSave(p.key)}
                    disabled={saving === p.key}
                  >
                    {saving === p.key && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                    حفظ
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <IntegrationLogsPanel />
    </div>
  );
}
