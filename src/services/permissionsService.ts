/**
 * Permissions & Roles Service
 * Centralizes role assignment and permission checks.
 */
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "manager" | "editor" | "user";

export interface Permission {
  id: string;
  key: string;
  label: string;
  description: string;
  category: string;
}

export interface RolePermission {
  id: string;
  role: AppRole;
  permission_key: string;
}

export interface UserWithRoles {
  user_id: string;
  display_name: string | null;
  email: string | null;
  roles: AppRole[];
}

export type PermissionEffect = "grant" | "deny";

export interface UserPermissionOverride {
  id: string;
  user_id: string;
  permission_key: string;
  effect: PermissionEffect;
  note: string;
  created_at: string;
}

export const permissionsService = {
  async listPermissions(): Promise<Permission[]> {
    const { data, error } = await supabase
      .from("permissions")
      .select("*")
      .order("category", { ascending: true })
      .order("label", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Permission[];
  },

  async listRolePermissions(): Promise<RolePermission[]> {
    const { data, error } = await supabase.from("role_permissions").select("*");
    if (error) throw error;
    return (data ?? []) as RolePermission[];
  },

  async toggleRolePermission(role: AppRole, permissionKey: string, enabled: boolean) {
    if (enabled) {
      const { error } = await supabase
        .from("role_permissions")
        .insert({ role: role as any, permission_key: permissionKey });
      if (error && !error.message.includes("duplicate")) throw error;
    } else {
      const { error } = await supabase
        .from("role_permissions")
        .delete()
        .eq("role", role as any)
        .eq("permission_key", permissionKey);
      if (error) throw error;
    }
  },

  async listUsersWithRoles(): Promise<UserWithRoles[]> {
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("user_id, display_name");
    if (pErr) throw pErr;

    const { data: roles, error: rErr } = await supabase
      .from("user_roles")
      .select("user_id, role");
    if (rErr) throw rErr;

    const rolesByUser = new Map<string, AppRole[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    });

    return (profiles ?? []).map((p: any) => ({
      user_id: p.user_id,
      display_name: p.display_name,
      email: null,
      roles: rolesByUser.get(p.user_id) ?? [],
    }));
  },

  async setUserRole(userId: string, role: AppRole, enabled: boolean) {
    if (enabled) {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: role as any });
      if (error && !error.message.includes("duplicate")) throw error;
    } else {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role as any);
      if (error) throw error;
    }
  },

  async getMyPermissions(userId: string): Promise<Set<string>> {
    const { data: myRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = (myRoles ?? []).map((r: any) => r.role as AppRole);

    // Per-user overrides
    const { data: overrides } = await supabase
      .from("user_permissions" as any)
      .select("permission_key, effect")
      .eq("user_id", userId);
    const grants = new Set<string>();
    const denies = new Set<string>();
    (overrides ?? []).forEach((o: any) => {
      if (o.effect === "deny") denies.add(o.permission_key);
      else grants.add(o.permission_key);
    });

    // Admins get everything (minus nothing — admin bypass)
    if (roles.includes("admin")) {
      const all = await this.listPermissions();
      return new Set(all.map((p) => p.key));
    }

    // Role-based base set
    let base = new Set<string>();
    if (roles.length > 0) {
      const { data: rp } = await supabase
        .from("role_permissions")
        .select("permission_key")
        .in("role", roles as any);
      base = new Set((rp ?? []).map((r: any) => r.permission_key));
    }

    // Apply overrides
    grants.forEach((g) => base.add(g));
    denies.forEach((d) => base.delete(d));
    return base;
  },

  async listUserPermissions(userId: string): Promise<UserPermissionOverride[]> {
    const { data, error } = await supabase
      .from("user_permissions" as any)
      .select("*")
      .eq("user_id", userId)
      .order("permission_key");
    if (error) throw error;
    return (data ?? []) as unknown as UserPermissionOverride[];
  },

  async setUserPermission(userId: string, permissionKey: string, effect: PermissionEffect | null, note = "") {
    if (effect === null) {
      const { error } = await supabase
        .from("user_permissions" as any)
        .delete()
        .eq("user_id", userId)
        .eq("permission_key", permissionKey);
      if (error) throw error;
      return;
    }
    const { error } = await supabase
      .from("user_permissions" as any)
      .upsert(
        { user_id: userId, permission_key: permissionKey, effect, note },
        { onConflict: "user_id,permission_key" },
      );
    if (error) throw error;
  },
};
