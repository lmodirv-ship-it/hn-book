/**
 * /admin/subscriptions — Manage plans, prices, credit grants, and view export usage.
 */
import { useEffect, useState } from "react";
import { Loader2, Sparkles, Coins, Activity, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { subscriptionService, type SubscriptionPlan, type ExportLog } from "@/services/subscriptionService";

const SubscriptionsAdmin = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [logs, setLogs] = useState<ExportLog[]>([]);
  const [credits, setCredits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [grantUserId, setGrantUserId] = useState("");
  const [grantAmount, setGrantAmount] = useState(10);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [p, l, c] = await Promise.all([
        subscriptionService.listAllPlans(),
        subscriptionService.listExportLogs(100),
        subscriptionService.listAllCredits(),
      ]);
      setPlans(p);
      setLogs(l);
      setCredits(c);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updatePlanField = (id: string, patch: Partial<SubscriptionPlan>) => {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const savePlan = async (p: SubscriptionPlan) => {
    setSaving(p.id);
    try {
      await subscriptionService.updatePlan(p.id, {
        name: p.name,
        price_monthly: Number(p.price_monthly),
        monthly_credits: Number(p.monthly_credits),
        is_unlimited: p.is_unlimited,
        is_active: p.is_active,
      });
      toast.success(`✅ ${p.name} محفوظ`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(null);
    }
  };

  const grant = async (sign: 1 | -1) => {
    if (!grantUserId.trim()) return toast.error("أدخل user_id");
    try {
      const newBal = await subscriptionService.grantCredits(
        grantUserId.trim(),
        grantAmount * sign,
        sign === 1 ? "admin_grant" : "admin_deduct",
      );
      toast.success(`الرصيد الجديد: ${newBal}`);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <Sparkles className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">الاشتراكات والنقاط</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="plans">
          <TabsList>
            <TabsTrigger value="plans">الخطط</TabsTrigger>
            <TabsTrigger value="grant">منح نقاط</TabsTrigger>
            <TabsTrigger value="balances">الأرصدة</TabsTrigger>
            <TabsTrigger value="usage">الاستخدام</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-3">
            {plans.map((p) => (
              <Card key={p.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {p.name}
                    <Badge variant="outline" className="font-mono text-[10px]">{p.code}</Badge>
                    {p.is_unlimited && <Badge>Unlimited</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                  <div>
                    <label className="text-xs text-muted-foreground">الاسم</label>
                    <Input value={p.name} onChange={(e) => updatePlanField(p.id, { name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">السعر/شهر ($)</label>
                    <Input type="number" min={0} value={p.price_monthly} onChange={(e) => updatePlanField(p.id, { price_monthly: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">نقاط/شهر</label>
                    <Input type="number" min={0} value={p.monthly_credits} onChange={(e) => updatePlanField(p.id, { monthly_credits: Number(e.target.value) })} />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch checked={p.is_unlimited} onCheckedChange={(v) => updatePlanField(p.id, { is_unlimited: v })} />
                      <span className="text-xs">Unlimited</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={p.is_active} onCheckedChange={(v) => updatePlanField(p.id, { is_active: v })} />
                      <span className="text-xs">مفعل</span>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => savePlan(p)} disabled={saving === p.id} className="gap-1.5">
                    {saving === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="grant">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Coins className="w-4 h-4" /> منح / خصم نقاط</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-xs text-muted-foreground">User ID (UUID)</label>
                    <Input value={grantUserId} onChange={(e) => setGrantUserId(e.target.value)} placeholder="00000000-0000-0000-0000-000000000000" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">عدد النقاط</label>
                    <Input type="number" min={1} value={grantAmount} onChange={(e) => setGrantAmount(Number(e.target.value))} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => grant(1)} className="gap-1.5"><Coins className="w-4 h-4" /> منح</Button>
                  <Button variant="destructive" onClick={() => grant(-1)} className="gap-1.5">خصم</Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  تجد User ID من صفحة المستخدمين في لوحة الأدمن.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="balances">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead className="text-center">الرصيد</TableHead>
                      <TableHead className="text-center">مكتسب</TableHead>
                      <TableHead className="text-center">مستهلك</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {credits.map((c) => (
                      <TableRow key={c.user_id}>
                        <TableCell className="font-mono text-xs">{c.user_id}</TableCell>
                        <TableCell className="text-center font-bold">{c.balance}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{c.total_earned}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{c.total_spent}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Activity className="w-4 h-4" /> سجل التصدير (آخر 100)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center">التكلفة</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>السبب</TableHead>
                      <TableHead>التاريخ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-mono text-[11px]">{l.user_id?.slice(0, 8) ?? "—"}</TableCell>
                        <TableCell><Badge variant="outline" className="uppercase">{l.export_type}</Badge></TableCell>
                        <TableCell className="text-center">{l.cost}</TableCell>
                        <TableCell>
                          <Badge variant={l.allowed ? "default" : "destructive"}>{l.allowed ? "مسموح" : "محظور"}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{l.reason}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("ar")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default SubscriptionsAdmin;
