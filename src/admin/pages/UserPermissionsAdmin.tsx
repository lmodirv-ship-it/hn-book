import { useEffect, useMemo, useState } from "react";
import {
  permissionsService,
  type Permission,
  type PermissionEffect,
  type UserPermissionOverride,
  type UserWithRoles,
} from "@/services/permissionsService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, KeyRound, Search, Check, X, Minus } from "lucide-react";
import { toast } from "sonner";
import RequirePermission from "@/admin/components/RequirePermission";
import { cn } from "@/lib/utils";

type EffectChoice = PermissionEffect | "inherit";

const EffectButton = ({
  active,
  variant,
  onClick,
  children,
}: {
  active: boolean;
  variant: "grant" | "deny" | "inherit";
  onClick: () => void;
  children: React.ReactNode;
}) => {
  const styles = {
    grant: active ? "bg-emerald-600 text-white border-emerald-600" : "border-border hover:bg-emerald-500/10",
    deny: active ? "bg-destructive text-destructive-foreground border-destructive" : "border-border hover:bg-destructive/10",
    inherit: active ? "bg-secondary text-secondary-foreground" : "border-border hover:bg-muted",
  }[variant];
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-7 px-2 text-xs rounded border inline-flex items-center gap-1 transition-colors",
        styles,
      )}
    >
      {children}
    </button>
  );
};

const UserPermissionsAdminInner = () => {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [perms, setPerms] = useState<Permission[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<UserPermissionOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOverrides, setLoadingOverrides] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [u, p] = await Promise.all([
          permissionsService.listUsersWithRoles(),
          permissionsService.listPermissions(),
        ]);
        setUsers(u);
        setPerms(p);
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedUserId) return;
    setLoadingOverrides(true);
    permissionsService
      .listUserPermissions(selectedUserId)
      .then(setOverrides)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoadingOverrides(false));
  }, [selectedUserId]);

  const overrideMap = useMemo(() => {
    const m = new Map<string, PermissionEffect>();
    overrides.forEach((o) => m.set(o.permission_key, o.effect));
    return m;
  }, [overrides]);

  const groupedPerms = useMemo(() => {
    const m = new Map<string, Permission[]>();
    perms.forEach((p) => {
      const arr = m.get(p.category) ?? [];
      arr.push(p);
      m.set(p.category, arr);
    });
    return Array.from(m.entries());
  }, [perms]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.display_name ?? "").toLowerCase().includes(q) ||
        u.user_id.toLowerCase().includes(q),
    );
  }, [users, search]);

  const setEffect = async (permissionKey: string, choice: EffectChoice) => {
    if (!selectedUserId) return;
    try {
      await permissionsService.setUserPermission(
        selectedUserId,
        permissionKey,
        choice === "inherit" ? null : choice,
      );
      const fresh = await permissionsService.listUserPermissions(selectedUserId);
      setOverrides(fresh);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const selectedUser = users.find((u) => u.user_id === selectedUserId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <KeyRound className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">صلاحيات المستخدمين (تخصيص فردي)</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Users list */}
          <Card className="h-fit lg:sticky lg:top-4">
            <CardHeader>
              <CardTitle className="text-base">المستخدمون ({filteredUsers.length})</CardTitle>
              <div className="relative">
                <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث..."
                  className="pr-8 h-9"
                />
              </div>
            </CardHeader>
            <CardContent className="p-2 max-h-[60vh] overflow-y-auto">
              {filteredUsers.map((u) => (
                <button
                  key={u.user_id}
                  onClick={() => setSelectedUserId(u.user_id)}
                  className={cn(
                    "w-full text-right px-3 py-2 rounded-md transition-colors",
                    selectedUserId === u.user_id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted",
                  )}
                >
                  <div className="text-sm font-medium truncate">
                    {u.display_name || "—"}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono truncate">
                    {u.user_id.slice(0, 12)}…
                  </div>
                  {u.roles.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {u.roles.map((r) => (
                        <Badge key={r} variant="secondary" className="text-[10px] h-4 px-1">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  )}
                </button>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-6">لا نتائج</p>
              )}
            </CardContent>
          </Card>

          {/* Permissions editor */}
          <div className="space-y-4">
            {!selectedUser ? (
              <Card>
                <CardContent className="py-16 text-center text-muted-foreground">
                  اختر مستخدماً من القائمة لتعديل صلاحياته الفردية.
                </CardContent>
              </Card>
            ) : loadingOverrides ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{selectedUser.display_name || "—"}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {selectedUser.user_id.slice(0, 8)}…
                      </span>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      <strong>تخصيص</strong> الصلاحيات يتجاوز ما تمنحه الأدوار.{" "}
                      <span className="text-emerald-600">منح</span> يفعّل الصلاحية،{" "}
                      <span className="text-destructive">منع</span> يحجبها حتى لو منحها الدور،{" "}
                      <span>وراثة</span> يستخدم إعدادات الدور.
                    </p>
                  </CardHeader>
                </Card>

                {groupedPerms.map(([cat, list]) => (
                  <Card key={cat}>
                    <CardHeader className="pb-2">
                      <CardTitle className="capitalize text-sm flex items-center gap-2">
                        {cat}
                        <Badge variant="secondary" className="text-[10px]">{list.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                      {list.map((p) => {
                        const current = overrideMap.get(p.key) ?? "inherit";
                        return (
                          <div
                            key={p.key}
                            className="flex items-center justify-between gap-3 py-1.5 border-b border-border last:border-0"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate">{p.label}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">{p.key}</div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <EffectButton
                                active={current === "grant"}
                                variant="grant"
                                onClick={() => setEffect(p.key, "grant")}
                              >
                                <Check className="h-3 w-3" /> منح
                              </EffectButton>
                              <EffectButton
                                active={current === "deny"}
                                variant="deny"
                                onClick={() => setEffect(p.key, "deny")}
                              >
                                <X className="h-3 w-3" /> منع
                              </EffectButton>
                              <EffectButton
                                active={current === "inherit"}
                                variant="inherit"
                                onClick={() => setEffect(p.key, "inherit")}
                              >
                                <Minus className="h-3 w-3" /> وراثة
                              </EffectButton>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const UserPermissionsAdmin = () => (
  <RequirePermission permission="manage_permissions">
    <UserPermissionsAdminInner />
  </RequirePermission>
);

export default UserPermissionsAdmin;
