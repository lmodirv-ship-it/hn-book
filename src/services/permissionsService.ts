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
    if (roles.length === 0) return new Set();
    if (roles.includes("admin")) {
      const all = await this.listPermissions();
      return new Set(all.map((p) => p.key));
    }
    const { data: rp } = await supabase
      .from("role_permissions")
      .select("permission_key")
      .in("role", roles as any);
    return new Set((rp ?? []).map((r: any) => r.permission_key));
  },
};
