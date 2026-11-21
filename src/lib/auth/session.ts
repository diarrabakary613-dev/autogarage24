import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { AccountStatusEnum } from "@/lib/supabase/database.types";
import { isAppRole, isProfessionalRole, isStaffRole, primaryRole, type AppRole } from "./roles";
import type { Permission } from "./permissions";

/**
 * Data Access Layer dell'autenticazione.
 * Tutte le pagine e le azioni protette passano da qui: i permessi sono
 * verificati sul server leggendo il database, mai fidandosi del browser.
 */

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string | null;
  roles: AppRole[];
  primaryRole: AppRole;
  accountStatus: AccountStatusEnum;
  isAdmin: boolean;
  isStaff: boolean;
  isProfessional: boolean;
  permissions: Permission[];
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return null;

  const [profileResult, rolesResult, permsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, account_status, deleted_at")
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("role_permissions").select("role, permission"),
  ]);

  const profile = profileResult.data;
  if (!profile || profile.deleted_at) return null;

  const roles = (rolesResult.data ?? []).map((r) => r.role).filter(isAppRole);
  const main = primaryRole(roles);
  const permissions = (permsResult.data ?? [])
    .filter((p) => roles.includes(p.role as AppRole))
    .map((p) => p.permission as Permission);
  const active = profile.account_status === "attivo";

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    roles,
    primaryRole: main,
    accountStatus: profile.account_status,
    isAdmin: roles.includes("admin") || roles.includes("super_admin"),
    isStaff: active && roles.some(isStaffRole),
    isProfessional: roles.some(isProfessionalRole),
    permissions: active ? [...new Set(permissions)] : [],
  };
});

function loginUrl(nextPath: string) {
  return `/accedi?next=${encodeURIComponent(nextPath)}`;
}

/** Richiede un utente collegato e con account attivo. */
export async function requireUser(nextPath = "/dashboard"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(loginUrl(nextPath));
  if (user.accountStatus !== "attivo") redirect("/account-sospeso");
  return user;
}

/** Richiede uno dei ruoli indicati; altrimenti risponde 404. */
export async function requireRole(roles: readonly AppRole[], nextPath = "/dashboard") {
  const user = await requireUser(nextPath);
  if (!user.roles.some((r) => roles.includes(r))) notFound(); // 404: non riveliamo l'esistenza delle aree riservate
  return user;
}

/** Richiede un ruolo di staff; altrimenti risponde 404. */
export async function requireAdmin(nextPath = "/admin") {
  const user = await requireUser(nextPath);
  if (!user.isStaff) notFound();
  return user;
}

/** Richiede uno specifico permesso amministrativo; altrimenti risponde 404. */
export async function requirePermission(permission: Permission, nextPath = "/admin") {
  const user = await requireAdmin(nextPath);
  if (!user.permissions.includes(permission)) notFound();
  return user;
}
