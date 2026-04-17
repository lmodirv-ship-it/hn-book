import { useEffect, useState } from "react";
import { permissionsService, type AppRole, type UserWithRoles } from "@/services/permissionsService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";
import RequirePermission from "@/admin/components/RequirePermission";

const ALL_ROLES: AppRole[] = ["admin", "manager", "editor", "user"];

const UsersAdminInner = () => {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await permissionsService.listUsersWithRoles();
      setUsers(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (userId: string, role: AppRole, enabled: boolean) => {
    try {
      await permissionsService.setUserRole(userId, role, enabled);
      toast.success(enabled ? `تم منح دور ${role}` : `تم سحب دور ${role}`);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UsersIcon className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">إدارة المستخدمين والأدوار</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>المستخدمون ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>المعرّف</TableHead>
                    {ALL_ROLES.map((r) => (
                      <TableHead key={r} className="text-center capitalize">
                        {r}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.user_id}>
                      <TableCell className="font-medium">
                        {u.display_name || "—"}
                        {u.roles.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {u.roles.map((r) => (
                              <Badge key={r} variant="secondary" className="text-xs">
                                {r}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {u.user_id.slice(0, 8)}…
                      </TableCell>
                      {ALL_ROLES.map((r) => (
                        <TableCell key={r} className="text-center">
                          <Switch
                            checked={u.roles.includes(r)}
                            onCheckedChange={(v) => toggle(u.user_id, r, v)}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={ALL_ROLES.length + 2} className="text-center text-muted-foreground py-8">
                        لا يوجد مستخدمون.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const UsersAdmin = () => (
  <RequirePermission permission="manage_users">
    <UsersAdminInner />
  </RequirePermission>
);

export default UsersAdmin;
