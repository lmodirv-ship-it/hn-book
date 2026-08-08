import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useHnIdentity } from "@/hooks/useHnIdentity";
import HnStatsBar from "@/components/HnStatsBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Crown, Users, Layers, ShieldCheck, ExternalLink } from "lucide-react";

interface HnUserRow {
  user_id: string;
  email: string;
  display_name: string | null;
  origin_app: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

interface HnAppRow {
  code: string;
  name: string;
  url: string | null;
  description: string | null;
  is_active: boolean;
}

const OwnerDashboard = () => {
  const { loading: idLoading, isOwner, email } = useHnIdentity();
  const [users, setUsers] = useState<HnUserRow[]>([]);
  const [apps, setApps] = useState<HnAppRow[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (idLoading || !isOwner) return;
    (async () => {
      const [u, a, r, ura] = await Promise.all([
        supabase.from("hn_users" as any).select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("hn_apps" as any).select("*").order("name"),
        supabase.from("hn_roles" as any).select("*").order("level", { ascending: false }),
        supabase.from("hn_user_roles_apps" as any).select("*"),
      ]);
      setUsers((u.data ?? []) as any);
      setApps((a.data ?? []) as any);
      setRoles((r.data ?? []) as any);
      setAssignments((ura.data ?? []) as any);
      setLoading(false);
    })();
  }, [idLoading, isOwner]);

  if (idLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background" dir="rtl">
        <ShieldCheck className="w-10 h-10 text-destructive" />
        <p className="text-foreground font-bold">هذه الصفحة مخصّصة للمالك فقط.</p>
        <Button asChild variant="outline"><Link to="/">العودة للرئيسية</Link></Button>
      </div>
    );
  }

  const roleOf = (userId: string) =>
    assignments.find((x) => x.user_id === userId)?.role_code ?? "subscriber";

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6" dir="rtl">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="icon-chip-gold"><Crown className="w-5 h-5" /></div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">غرفة العمليات المركزية</h1>
            <p className="text-xs text-muted-foreground">{email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm"><Link to="/admin">لوحة الإدارة</Link></Button>
          <Button asChild size="sm"><Link to="/">الموقع</Link></Button>
        </div>
      </header>

      <HnStatsBar />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Users className="w-4 h-4" /> المستخدمون ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>البريد</TableHead>
                      <TableHead>الاسم</TableHead>
                      <TableHead>الدور</TableHead>
                      <TableHead>المصدر</TableHead>
                      <TableHead>آخر دخول</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.user_id}>
                        <TableCell className="font-mono text-xs">{u.email}</TableCell>
                        <TableCell>{u.display_name || "—"}</TableCell>
                        <TableCell><Badge variant="secondary">{roleOf(u.user_id)}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{u.origin_app || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {u.last_login_at ? new Date(u.last_login_at).toLocaleString("ar-MA") : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {users.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا يوجد مستخدمون بعد.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Layers className="w-4 h-4" /> تطبيقات المنظومة</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {apps.map((a) => (
                <a
                  key={a.code}
                  href={a.url ?? "#"}
                  target={a.url?.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="flex items-center justify-between glass-future rounded-lg p-3 hover:opacity-90"
                >
                  <div>
                    <div className="text-sm font-semibold text-foreground">{a.name}</div>
                    <div className="text-[11px] text-muted-foreground">{a.description}</div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                </a>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> الأدوار</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {roles.map((r) => (
                <Badge key={r.code} variant="outline" className="gap-1">
                  {r.label} <span className="opacity-60">({r.level})</span>
                </Badge>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
