import { useEffect, useMemo, useState } from "react";
import { permissionsService, type AppRole, type Permission, type RolePermission } from "@/services/permissionsService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import RequirePermission from "@/admin/components/RequirePermission";

const ROLES: AppRole[] = ["admin", "manager", "editor", "user"];

const PermissionsAdminInner = () => {
  const [perms, setPerms] = useState<Permission[]>([]);
  const [rps, setRps] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [p, r] = await Promise.all([
        permissionsService.listPermissions(),
        permissionsService.listRolePermissions(),
      ]);
      setPerms(p);
      setRps(r);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const lookup = useMemo(() => {
    const set = new Set<string>();
    rps.forEach((r) => set.add(`${r.role}:${r.permission_key}`));
    return set;
  }, [rps]);

  const toggle = async (role: AppRole, key: string, enabled: boolean) => {
    if (role === "admin") {
      toast.info("Admin يحصل على جميع الصلاحيات تلقائياً.");
      return;
    }
    try {
      await permissionsService.toggleRolePermission(role, key, enabled);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const grouped = useMemo(() => {
    const m = new Map<string, Permission[]>();
    perms.forEach((p) => {
      const arr = m.get(p.category) ?? [];
      arr.push(p);
      m.set(p.category, arr);
    });
    return Array.from(m.entries());
  }, [perms]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">إدارة الصلاحيات</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        grouped.map(([cat, list]) => (
          <Card key={cat}>
            <CardHeader>
              <CardTitle className="capitalize flex items-center gap-2">
                {cat}
                <Badge variant="secondary">{list.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الإذن</TableHead>
                      {ROLES.map((r) => (
                        <TableHead key={r} className="text-center capitalize">{r}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((p) => (
                      <TableRow key={p.key}>
                        <TableCell>
                          <div className="font-medium">{p.label}</div>
                          <div className="text-xs text-muted-foreground">{p.key}</div>
                          {p.description && (
                            <div className="text-xs text-muted-foreground mt-1">{p.description}</div>
                          )}
                        </TableCell>
                        {ROLES.map((r) => (
                          <TableCell key={r} className="text-center">
                            <Switch
                              checked={r === "admin" ? true : lookup.has(`${r}:${p.key}`)}
                              disabled={r === "admin"}
                              onCheckedChange={(v) => toggle(r, p.key, v)}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

const PermissionsAdmin = () => (
  <RequirePermission permission="manage_permissions">
    <PermissionsAdminInner />
  </RequirePermission>
);

export default PermissionsAdmin;
