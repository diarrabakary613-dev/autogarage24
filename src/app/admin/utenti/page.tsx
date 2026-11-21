import type { Metadata } from "next";
import { Suspense } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/form";
import { PageHeader, Pagination } from "@/components/ui/misc";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { adminAccountStatus, adminRole } from "@/lib/actions/admin";
import { APP_ROLES, ROLE_LABELS } from "@/lib/auth/roles";
import { formatDate } from "@/lib/utils";
import type { Enums } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Utenti e ruoli", robots: { index: false } };
const PAGE = 25;
const STATUS: Record<string, string> = { attivo: "Attivo", sospeso: "Sospeso", disattivato: "Disattivato" };

export default function UsersPage(props: PageProps<"/admin/utenti">) {
  return (
    <>
      <PageHeader title="Utenti e ruoli" description="Ricerca, stato degli account e ruoli. Ogni modifica è registrata; nessuno può modificare i propri privilegi." />
      <Suspense fallback={<Skeleton className="h-96" />}><Users searchParams={props.searchParams} /></Suspense>
    </>
  );
}

async function Users({ searchParams }: { searchParams: PageProps<"/admin/utenti">["searchParams"] }) {
  const me = await requirePermission("users.view", "/admin/utenti");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.replace(/[%,()]/g, " ").trim().slice(0, 80) : "";
  const role = typeof sp.ruolo === "string" && (APP_ROLES as readonly string[]).includes(sp.ruolo) ? (sp.ruolo as Enums<"app_role">) : null;
  const status = typeof sp.stato === "string" && sp.stato in STATUS ? sp.stato : null;
  const page = Math.max(1, Number(sp.pagina) || 1);
  const supabase = await createClient();
  let query = supabase.from("profiles").select(`id, email, full_name, city, account_status, status_reason, created_at, user_roles!user_roles_user_id_fkey${role ? "!inner" : ""}(role)`, { count: "exact" })
    .is("deleted_at", null).order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  if (q) query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);
  if (role) query = query.eq("user_roles.role", role);
  if (status) query = query.eq("account_status", status as Enums<"account_status">);
  const { data, count } = await query;
  const canManage = me.permissions.includes("users.manage");
  const canRoles = me.permissions.includes("roles.manage");
  const href = (o: Record<string, string>) => `/admin/utenti?${new URLSearchParams({ ...(q ? { q } : {}), ...(role ? { ruolo: role } : {}), ...(status ? { stato: status } : {}), ...o })}`;
  return (
    <>
      <form method="get" className="mb-4 flex flex-wrap gap-2" role="search">
        <Input name="q" defaultValue={q} placeholder="Email o nome" aria-label="Cerca utenti" className="w-64" />
        <Select name="ruolo" defaultValue={role ?? ""} aria-label="Ruolo" className="w-auto"><option value="">Tutti i ruoli</option>{APP_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</Select>
        <Select name="stato" defaultValue={status ?? ""} aria-label="Stato" className="w-auto"><option value="">Tutti gli stati</option>{Object.entries(STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
        <button className="rounded-md bg-ink px-4 text-sm font-semibold text-white">Cerca</button>
      </form>
      <p className="mb-3 text-sm text-muted">{count ?? 0} utenti</p>
      {!data?.length ? <EmptyState title="Nessun utente trovato" /> : (
        <ul className="flex flex-col gap-3">
          {data.map((u) => {
            const roles = ((u.user_roles ?? []) as { role: Enums<"app_role"> }[]).map((r) => r.role);
            const self = u.id === me.id;
            return (
              <li key={u.id}>
                <Card className="p-4">
                  <details>
                    <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                      <span><span className="font-semibold">{u.full_name ?? "Senza nome"}</span> <span className="text-sm text-muted">{u.email}</span></span>
                      <span className="flex flex-wrap gap-1">{roles.map((r) => <Badge key={r} tone={["admin", "super_admin"].includes(r) ? "dark" : "neutral"}>{ROLE_LABELS[r]}</Badge>)}<Badge tone={u.account_status === "attivo" ? "success" : "danger"}>{STATUS[u.account_status]}</Badge></span>
                    </summary>
                    <div className="mt-4 grid gap-4 border-t border-line pt-4 md:grid-cols-2">
                      <div className="text-sm">
                        <p>Registrato il {formatDate(u.created_at)}{u.city ? ` · ${u.city}` : ""}</p>
                        {u.status_reason && <p className="text-muted">Motivo stato: {u.status_reason}</p>}
                        {self && <p className="mt-2 text-warning">Non puoi modificare il tuo account o i tuoi ruoli.</p>}
                      </div>
                      {!self && (
                        <div className="flex flex-col gap-3">
                          {canManage && (
                            <ActionForm action={adminAccountStatus} submitLabel="Aggiorna stato" size="sm" hidden={{ user_id: u.id }} confirm="Confermi la modifica dello stato?">
                              <div className="grid grid-cols-2 gap-2">
                                <Field id={`st-${u.id}`} label="Nuovo stato"><Select id={`st-${u.id}`} name="status" defaultValue={u.account_status}>{Object.entries(STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
                                <Field id={`rs-${u.id}`} label="Motivazione"><Input id={`rs-${u.id}`} name="reason" maxLength={500} /></Field>
                              </div>
                            </ActionForm>
                          )}
                          {canRoles && (
                            <ActionForm action={adminRole} submitLabel="Applica" size="sm" variant="outline" hidden={{ user_id: u.id }}>
                              <div className="grid grid-cols-2 gap-2">
                                <Field id={`op-${u.id}`} label="Operazione"><Select id={`op-${u.id}`} name="op" defaultValue="assegna"><option value="assegna">Assegna ruolo</option><option value="revoca">Revoca ruolo</option></Select></Field>
                                <Field id={`ro-${u.id}`} label="Ruolo"><Select id={`ro-${u.id}`} name="role">{APP_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</Select></Field>
                              </div>
                            </ActionForm>
                          )}
                        </div>
                      )}
                    </div>
                  </details>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination page={page} pageSize={PAGE} total={count ?? 0} hrefFor={(p) => href({ pagina: String(p) })} />
    </>
  );
}
