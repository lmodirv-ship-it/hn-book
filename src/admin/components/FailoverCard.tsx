import { useEffect, useState } from "react";
import { Server, Loader2, ArrowLeftRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { clearBackendCache, type ActiveBackend } from "@/lib/backend-routing";

/**
 * Admin-only failover switch between Lovable Cloud (primary) and the
 * external backup server. Persists to `system_config.active_backend`
 * and logs every switch into `integration_logs`.
 */
export function FailoverCard() {
  const [backend, setBackend] = useState<ActiveBackend>("lovable");
  const [externalUrl, setExternalUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("system_config")
      .select("key,value")
      .in("key", ["active_backend", "external_api_base_url"]);
    if (!error) {
      const map = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
      setBackend(map.active_backend === "external" ? "external" : "lovable");
      setExternalUrl(typeof map.external_api_base_url === "string" ? map.external_api_base_url : "");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const performSwitch = async () => {
    setBusy(true);
    const next: ActiveBackend = backend === "lovable" ? "external" : "lovable";
    try {
      // Verify admin role server-side before mutating
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) throw new Error("غير مسجل دخول");

      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userRes.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleRow) throw new Error("غير مصرّح: تحتاج صلاحية admin");

      const { error: upErr } = await supabase
        .from("system_config")
        .update({ value: JSON.stringify(next) as any })
        .eq("key", "active_backend");
      if (upErr) throw upErr;

      // Log switch into integration_logs
      await supabase.from("integration_logs").insert({
        provider: "failover",
        action: "switch_backend",
        success: true,
        message: `Backend switched: ${backend} → ${next}`,
        metadata: { from: backend, to: next, external_url: externalUrl },
        triggered_by: userRes.user.id,
      });

      clearBackendCache();
      setBackend(next);
      toast.success(`✓ تم التحويل إلى ${next === "lovable" ? "Lovable Cloud" : "السيرفر الخارجي"}`);
    } catch (err: any) {
      toast.error(`فشل التحويل: ${err.message}`);
      // Best-effort failure log
      const { data: u } = await supabase.auth.getUser();
      await supabase.from("integration_logs").insert({
        provider: "failover",
        action: "switch_backend",
        success: false,
        message: `Failed: ${String(err.message).slice(0, 200)}`,
        metadata: { from: backend, attempted: backend === "lovable" ? "external" : "lovable" },
        triggered_by: u?.user?.id ?? null,
      });
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  };

  const isExternal = backend === "external";
  const targetLabel = isExternal ? "Lovable Cloud (الأساسي)" : "السيرفر الاحتياطي";

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-primary" /> نظام التحويل الاحتياطي (Failover)
        </h3>
        <Badge variant={isExternal ? "destructive" : "outline"} className="text-xs">
          {isExternal ? "وضع الطوارئ نشط" : "الوضع الطبيعي"}
        </Badge>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div className={`rounded-lg border p-3 ${!isExternal ? "border-green-500/40 bg-green-500/5" : "border-border bg-muted/20 opacity-60"}`}>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                <span className="text-xs font-bold">Lovable Cloud</span>
                {!isExternal && <Badge variant="outline" className="text-[10px] mr-auto">نشط</Badge>}
              </div>
              <p className="text-[11px] text-muted-foreground">السيرفر الأساسي — Supabase + Storage + Functions</p>
            </div>
            <div className={`rounded-lg border p-3 ${isExternal ? "border-orange-500/40 bg-orange-500/5" : "border-border bg-muted/20 opacity-60"}`}>
              <div className="flex items-center gap-2 mb-1">
                <Server className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-bold">External Server</span>
                {isExternal && <Badge variant="outline" className="text-[10px] mr-auto">نشط</Badge>}
              </div>
              <p className="text-[11px] text-muted-foreground truncate" title={externalUrl}>
                {externalUrl || "غير مهيّأ"}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-muted-foreground">
              السيرفر الحالي: <span className="font-bold text-foreground">
                {isExternal ? "External Server" : "Lovable Cloud"}
              </span>
            </p>
            <Button
              size="sm"
              variant={isExternal ? "default" : "destructive"}
              disabled={busy || !externalUrl}
              onClick={() => setConfirmOpen(true)}
            >
              {busy ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <ArrowLeftRight className="w-4 h-4 ml-1" />}
              {isExternal ? "🔁 الرجوع إلى السيرفر الأساسي" : "🔁 التحويل إلى السيرفر الاحتياطي"}
            </Button>
          </div>

          {!externalUrl && (
            <p className="text-[11px] text-orange-600 mt-2">
              ⚠ لم يتم ضبط `external_api_base_url` في `system_config`.
            </p>
          )}
        </>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من تحويل النظام؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم تحويل الطلبات من <b>{isExternal ? "External Server" : "Lovable Cloud"}</b> إلى{" "}
              <b>{targetLabel}</b>. كل الطلبات الجديدة ستذهب للسيرفر الجديد فوراً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={performSwitch} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : null}
              تأكيد التحويل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
