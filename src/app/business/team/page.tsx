import type { Metadata } from "next";
import { Suspense } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card, Skeleton } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { inviteMember, updateMember } from "@/lib/actions/business";
import { getBusinessContext, MEMBER_ROLES, PERMISSIONS } from "@/lib/business/context";
import { formatDateTime } from "@/lib/utils";
import { initialFormState, type FormState } from "@/lib/validation/form-state";

export const metadata: Metadata = { title: "Team" };

export default function TeamPage() {
  return (
    <>
      <PageHeader title="Team e collaboratori" description="Invita collaboratori con ruoli e permessi specifici. Ogni collaboratore vede solo i dati di questa azienda; inviti, modifiche e revoche sono registrati." />
      <Suspense fallback={<Skeleton className="h-96" />}><Content /></Suspense>
    </>
  );
}

async function Content() {
  const { supabase, current, can, isOwner } = await getBusinessContext("/business/team");
  if (!can("team")) return <Alert tone="info">Il tuo ruolo non include la gestione del team.</Alert>;
  const [{ data: members }, { data: audit }, { data: plan }] = await Promise.all([
    supabase.from("business_members").select("*").eq("profile_id", current.profile_id).order("created_at"),
    supabase.from("business_audit").select("*").eq("profile_id", current.profile_id).order("created_at", { ascending: false }).limit(30),
    supabase.rpc("business_plan", { profile_id: current.profile_id }),
  ]);
  const p = plan as { max_members: number; members_used: number } | null;
  return (
    <div className="flex flex-col gap-4">
      {p && <p className="text-sm text-muted">Collaboratori: {p.members_used} di {p.max_members} consentiti dal piano.</p>}
      <Card className="p-5">
        <h2 className="mb-3 font-bold">Invita un collaboratore</h2>
        <ActionForm action={inviteMember} submitLabel="Invia invito" hidden={{ profile_id: current.profile_id }} resetOnSuccess>
          {((s: FormState) => (<>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field id="e" label="Email" error={s.fieldErrors?.email}><Input id="e" name="email" type="email" required /></Field>
              <Field id="r" label="Ruolo"><Select id="r" name="role" defaultValue="dipendente">{Object.entries(MEMBER_ROLES).filter(([k]) => isOwner || k !== "amministratore").map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
            </div>
            <fieldset><legend className="mb-1 text-sm font-semibold">Permessi (vuoto = predefiniti del ruolo)</legend>
              <div className="grid gap-2 sm:grid-cols-3">{Object.entries(PERMISSIONS).map(([k, l]) => <Checkbox key={k} id={`np-${k}`} name="permissions" value={k} label={l} />)}</div></fieldset>
          </>))(initialFormState)}
        </ActionForm>
      </Card>
      {(members ?? []).map((m) => (
        <Card key={m.id} className="flex flex-col gap-2 p-5">
          <div className="flex flex-wrap items-center gap-2"><p className="font-bold">{m.invite_email}</p><Badge tone={m.status === "attivo" ? "success" : m.status === "invitato" ? "warning" : "neutral"}>{m.status}</Badge><span className="text-sm text-muted">{MEMBER_ROLES[m.role]}</span></div>
          {m.status !== "revocato" && (
            <>
              <ActionForm action={updateMember} submitLabel="Salva permessi" size="sm" variant="outline" hidden={{ id: m.id }}>
                <div className="grid gap-2 sm:grid-cols-[220px_1fr]">
                  <Field id={`r-${m.id}`} label="Ruolo"><Select id={`r-${m.id}`} name="role" defaultValue={m.role}>{Object.entries(MEMBER_ROLES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
                  <div className="grid gap-2 sm:grid-cols-3">{Object.entries(PERMISSIONS).map(([k, l]) => <Checkbox key={k} id={`p-${m.id}-${k}`} name="permissions" value={k} label={l} defaultChecked={m.permissions.includes(k)} />)}</div>
                </div>
              </ActionForm>
              <ActionForm action={updateMember} submitLabel="Revoca l'accesso" size="sm" variant="danger" hidden={{ id: m.id, revoke: "on" }} confirm="Revocare l'accesso al Business Center?" />
            </>
          )}
        </Card>
      ))}
      <Card className="p-5">
        <h2 className="mb-2 font-bold">Registro del team</h2>
        <ol className="flex flex-col gap-1 text-sm">{(audit ?? []).map((a) => <li key={a.id}><span className="text-muted">{formatDateTime(a.created_at)}</span> · {a.action.replace(".", ": ")}{(a.details as { email?: string })?.email ? ` · ${(a.details as { email: string }).email}` : ""}</li>)}</ol>
      </Card>
    </div>
  );
}
