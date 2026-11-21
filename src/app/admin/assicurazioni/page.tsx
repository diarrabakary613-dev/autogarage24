import type { Metadata } from "next";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { AdminPage } from "@/components/admin/simple";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { adminAddPartnerUser, adminPartnerStatus, adminSaveIntegration, adminSavePartner } from "@/lib/actions/insurance";
import { COVERAGES, PARTNER_TYPES } from "@/lib/insurance/labels";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Partner assicurativi", robots: { index: false } };

export default function AdminInsurancePage() {
  return <AdminPage title="Partner assicurativi" description="Registra solo soggetti autorizzati: verifica l'iscrizione sul RUI (intermediari) o sull'Albo imprese IVASS (compagnie) e annota fonte e data. Nessun preventivo viene generato dalla piattaforma."><Content /></AdminPage>;
}

type P = { id?: string; name?: string; partner_type?: string; legal_name?: string; vat_number?: string | null; rui_section?: string | null; rui_number?: string | null; ivass_company_code?: string | null;
  registry_checked_at?: string | null; registry_evidence?: string | null; description?: string | null; coverages?: string[]; website_url?: string | null; privacy_url?: string | null; contact_email?: string | null; contact_phone?: string | null };

function PartnerForm({ p }: { p: P }) {
  const k = p.id ?? "new";
  return (
    <ActionForm action={adminSavePartner} submitLabel={p.id ? "Salva" : "Crea partner (in bozza)"} size="sm" hidden={p.id ? { id: p.id } : undefined}>
      <div className="grid gap-2 sm:grid-cols-3">
        <Field id={`n-${k}`} label="Nome commerciale"><Input id={`n-${k}`} name="name" required defaultValue={p.name} /></Field>
        <Field id={`l-${k}`} label="Ragione sociale"><Input id={`l-${k}`} name="legal_name" required defaultValue={p.legal_name} /></Field>
        <Field id={`t-${k}`} label="Tipo"><Select id={`t-${k}`} name="partner_type" defaultValue={p.partner_type ?? "broker"}>{Object.entries(PARTNER_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
        <Field id={`v-${k}`} label="Partita IVA" optional><Input id={`v-${k}`} name="vat_number" maxLength={11} defaultValue={p.vat_number ?? ""} /></Field>
        <Field id={`rs-${k}`} label="Sezione RUI" optional><Select id={`rs-${k}`} name="rui_section" defaultValue={p.rui_section ?? ""}><option value="">—</option>{["A", "B", "C", "D", "E", "F"].map((x) => <option key={x}>{x}</option>)}</Select></Field>
        <Field id={`rn-${k}`} label="Numero RUI" optional><Input id={`rn-${k}`} name="rui_number" defaultValue={p.rui_number ?? ""} /></Field>
        <Field id={`ic-${k}`} label="Codice impresa IVASS" optional><Input id={`ic-${k}`} name="ivass_company_code" defaultValue={p.ivass_company_code ?? ""} /></Field>
        <Field id={`rc-${k}`} label="Registro consultato il" optional><Input id={`rc-${k}`} name="registry_checked_at" type="date" defaultValue={p.registry_checked_at ?? ""} /></Field>
        <Field id={`re-${k}`} label="Esito della consultazione" optional><Input id={`re-${k}`} name="registry_evidence" defaultValue={p.registry_evidence ?? ""} placeholder="Es. iscrizione attiva, sez. B" /></Field>
        <Field id={`w-${k}`} label="Sito (https)" optional><Input id={`w-${k}`} name="website_url" defaultValue={p.website_url ?? ""} /></Field>
        <Field id={`pv-${k}`} label="Informativa privacy (https)" optional><Input id={`pv-${k}`} name="privacy_url" defaultValue={p.privacy_url ?? ""} /></Field>
        <Field id={`e-${k}`} label="Email" optional><Input id={`e-${k}`} name="contact_email" type="email" defaultValue={p.contact_email ?? ""} /></Field>
        <Field id={`ph-${k}`} label="Telefono" optional><Input id={`ph-${k}`} name="contact_phone" defaultValue={p.contact_phone ?? ""} /></Field>
        <Field id={`d-${k}`} label="Descrizione" optional className="sm:col-span-2"><Textarea id={`d-${k}`} name="description" rows={2} defaultValue={p.description ?? ""} /></Field>
      </div>
      <div className="flex flex-wrap gap-3">{Object.entries(COVERAGES).map(([v, c]) => <Checkbox key={v} id={`c-${k}-${v}`} name="coverages" value={v} label={c.label} defaultChecked={p.coverages?.includes(v)} />)}</div>
    </ActionForm>
  );
}

async function Content() {
  await requirePermission("insurance.manage", "/admin/assicurazioni");
  const supabase = await createClient();
  const [{ data: partners }, { data: integrations }, { data: users }, { data: reqs }] = await Promise.all([
    supabase.from("insurance_partners").select("*").order("created_at", { ascending: false }),
    supabase.from("insurance_integrations").select("*").order("created_at", { ascending: false }),
    supabase.from("insurance_partner_users").select("partner_id, user_id"),
    supabase.from("insurance_request_partners").select("status"),
  ]);
  const c = (s: string) => (reqs ?? []).filter((r) => r.status === s).length;
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{([["Inoltri totali", reqs?.length ?? 0], ["Preventivi disponibili", c("preventivo_disponibile")], ["In lavorazione", c("in_lavorazione")], ["Ritirate", c("ritirata")]] as [string, number][]).map(([l, v]) => <Card key={l} className="p-4"><p className="text-sm text-muted">{l}</p><p className="text-2xl font-extrabold">{v}</p></Card>)}</div>
      <Card className="p-5"><h2 className="mb-3 font-bold">Nuovo partner</h2><PartnerForm p={{}} /></Card>
      {(partners ?? []).map((p) => (
        <Card key={p.id} className="flex flex-col gap-3 p-5">
          <div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{p.name}</h2><Badge tone={p.status === "verificato" ? "success" : p.status === "sospeso" ? "danger" : "warning"}>{p.status}</Badge>
            {p.verified_at && <span className="text-xs text-muted">verificato il {formatDate(p.verified_at)}</span>}</div>
          <details><summary className="cursor-pointer text-sm font-semibold">Dati e verifica</summary><div className="mt-2"><PartnerForm p={p} /></div></details>
          <ActionForm action={adminPartnerStatus} submitLabel="Cambia stato" size="sm" variant="outline" hidden={{ id: p.id }}>
            <div className="grid gap-2 sm:grid-cols-[200px_1fr]">
              <Field id={`st-${p.id}`} label="Stato"><Select id={`st-${p.id}`} name="status" defaultValue={p.status === "verificato" ? "sospeso" : "verificato"}><option value="in_verifica">In verifica</option><option value="verificato">Verificato</option><option value="sospeso">Sospeso</option><option value="bozza">Bozza</option></Select></Field>
              <Field id={`sn-${p.id}`} label="Motivazione" optional><Input id={`sn-${p.id}`} name="note" /></Field>
            </div>
          </ActionForm>
          <p className="text-sm">Referenti abilitati: {(users ?? []).filter((u) => u.partner_id === p.id).length}</p>
          <ActionForm action={adminAddPartnerUser} submitLabel="Abilita referente" size="sm" variant="outline" hidden={{ id: p.id }}>
            <Field id={`ue-${p.id}`} label="Email dell'account del referente"><Input id={`ue-${p.id}`} name="email" type="email" required /></Field>
          </ActionForm>
          <div className="rounded-xl bg-mist p-3 text-sm">
            <p className="font-semibold">Integrazioni</p>
            {(integrations ?? []).filter((i) => i.partner_id === p.id).map((i) => <p key={i.id}>{i.kind} · <strong>{i.status}</strong>{i.secret_env_name ? ` · credenziale in ${i.secret_env_name}` : ""}{i.contract_ref ? ` · contratto ${i.contract_ref}` : ""}</p>)}
            <ActionForm action={adminSaveIntegration} submitLabel="Registra integrazione" size="sm" variant="ghost" hidden={{ partner_id: p.id }} className="mt-2">
              <div className="grid gap-2 sm:grid-cols-3">
                <Field id={`ik-${p.id}`} label="Tipo"><Select id={`ik-${p.id}`} name="kind"><option value="api">API ufficiale</option><option value="webhook">Webhook</option><option value="link_esterno">Collegamento esterno</option><option value="email">Email</option></Select></Field>
                <Field id={`is-${p.id}`} label="Stato"><Select id={`is-${p.id}`} name="status"><option value="non_configurato">Non configurato</option><option value="in_test">In test</option><option value="attivo">Attivo</option></Select></Field>
                <Field id={`ie-${p.id}`} label="Nome variabile con la chiave" optional><Input id={`ie-${p.id}`} name="secret_env_name" placeholder="PARTNER_X_API_KEY" /></Field>
                <Field id={`iu-${p.id}`} label="Endpoint (https)" optional><Input id={`iu-${p.id}`} name="endpoint_url" /></Field>
                <Field id={`ic2-${p.id}`} label="Riferimento contratto" optional><Input id={`ic2-${p.id}`} name="contract_ref" /></Field>
              </div>
              <p className="text-xs text-muted">Non inserire mai chiavi o password: vanno configurate come variabili d&apos;ambiente sul server.</p>
            </ActionForm>
          </div>
        </Card>
      ))}
    </div>
  );
}
