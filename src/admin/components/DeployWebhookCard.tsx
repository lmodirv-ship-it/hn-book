import { useEffect, useState } from "react";
import { Rocket, Save, Loader2, CheckCircle2, XCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CfgRow { key: string; value: unknown }

export const DeployWebhookCard = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [url, setUrl] = useState("");
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [payload, setPayload] = useState("");
  const [lastStatus, setLastStatus] = useState("");
  const [payloadError, setPayloadError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("system_config")
      .select("key,value")
      .in("key", ["deploy_url", "deploy_auto_enabled", "deploy_payload_template", "deploy_last_status"]);
    const cfg = Object.fromEntries((data ?? []).map((r: CfgRow) => [r.key, r.value]));
    setUrl(typeof cfg.deploy_url === "string" ? cfg.deploy_url : "");
    setAutoEnabled(cfg.deploy_auto_enabled === true);
    setPayload(JSON.stringify(cfg.deploy_payload_template ?? {}, null, 2));
    setLastStatus(typeof cfg.deploy_last_status === "string" ? cfg.deploy_last_status : "");
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const validatePayload = (raw: string) => {
    try { JSON.parse(raw); setPayloadError(null); return true; }
    catch (e) { setPayloadError(String(e)); return false; }
  };

  const save = async () => {
    if (!validatePayload(payload)) { toast.error("JSON غير صالح"); return; }
    setSaving(true);
    const updates = [
      { key: "deploy_url", value: JSON.stringify(url) },
      { key: "deploy_auto_enabled", value: JSON.stringify(autoEnabled) },
      { key: "deploy_payload_template", value: payload },
    ];
    for (const u of updates) {
      // value column is jsonb — pass raw JSON string via update
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.from("system_config").update({ value: JSON.parse(u.value) as any }).eq("key", u.key);
    }
    setSaving(false);
    toast.success("تم الحفظ ✓");
  };

  const testNow = async () => {
    if (!url) { toast.error("أدخل URL أولاً"); return; }
    setTesting(true);
    const { data, error } = await supabase.functions.invoke("trigger-deploy", {
      body: { trigger: "manual", build_hash: "test", notes: "manual test" },
    });
    setTesting(false);
    if (error) { toast.error(error.message); return; }
    const r = data as { success: boolean; status: number; snippet: string };
    if (r.success) toast.success(`نجح: ${r.status}`);
    else toast.error(`فشل: ${r.status} — ${r.snippet?.slice(0, 80)}`);
    load();
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> تحميل...
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4" dir="rtl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Rocket className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-bold text-foreground">نشر خارجي (Deploy Webhook)</h3>
            <p className="text-xs text-muted-foreground">إرسال إشعار للسيرفر الخارجي عند النشر</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Deploy URL</label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-server.com/api/deploy"
            className="bg-secondary/30 border-border ltr text-left"
            dir="ltr"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 p-3">
          <div>
            <p className="text-sm font-medium">تشغيل تلقائي عند كل نشر</p>
            <p className="text-xs text-muted-foreground">يكتشف build جديد ويرسل مرة واحدة</p>
          </div>
          <Switch checked={autoEnabled} onCheckedChange={setAutoEnabled} />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">JSON Payload Template</label>
          <Textarea
            value={payload}
            onChange={(e) => { setPayload(e.target.value); validatePayload(e.target.value); }}
            rows={12}
            className="bg-secondary/30 border-border font-mono text-xs ltr text-left"
            dir="ltr"
          />
          {payloadError && <p className="text-xs text-destructive mt-1">{payloadError}</p>}
          <p className="text-xs text-muted-foreground mt-1">
            يضاف <code>timestamp</code> + <code>build.hash</code> تلقائياً عند الإرسال.
          </p>
        </div>

        {lastStatus && (
          <div className="rounded-lg border border-border bg-secondary/20 p-3 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              {lastStatus.startsWith("✓")
                ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                : <XCircle className="w-3.5 h-3.5 text-red-500" />}
              آخر نتيجة:
            </div>
            <p className="font-mono break-all">{lastStatus}</p>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={save} disabled={saving} className="flex-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Save className="w-4 h-4 ml-1" />}
            حفظ
          </Button>
          <Button onClick={testNow} disabled={testing} variant="outline" className="flex-1">
            {testing ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Send className="w-4 h-4 ml-1" />}
            اختبار الآن
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground">
          المفتاح <code>DEPLOY_API_KEY</code> مخزن بأمان ويُرسل في الهيدر <code>x-api-key</code>.
        </p>
      </div>
    </div>
  );
};
