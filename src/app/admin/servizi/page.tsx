import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card, EmptyState } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/form";
import { TabLinks } from "@/components/ui/misc";
import { AdminPage } from "@/components/admin/simple";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { adminCancelService, adminSetOperator } from "@/lib/actions/roadside";
import { OPERATOR_STATUS, ROADSIDE_SERVICES, ROADSIDE_STATUS, TRANSPORT_SERVICES, TRANSPORT_STATUS } from "@/lib/services/labels";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Soccorso, trasporti, revisioni", robots: { index: false } };

const TABS = ["operatori", "soccorso", "trasporti", "revisioni", "statistiche"] as const;

export default function AdminServicesPage(props: PageProps<"/admin/servizi">) {
  return <AdminPage title="Soccorso, trasporti e revisioni" description="Verifica degli operatori, monitoraggio delle richieste, contestazioni e annullamenti. Ogni decisione è registrata nel registro attività."><Content searchParams={props.searchParams} /></AdminPage>;
}

type SB = Awaited<ReturnType<typeof createClient>>;

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("services.manage", "/admin/servizi");
  const sp = await searchParams;
  const tab = (TABS as readonly string[]).includes(String(sp.tab)) ? String(sp.tab) : "operatori";
  const supabase = await createClient();
  return (
    <>
      <TabLinks current={tab} items={[{ key: "operatori", label: "Operatori da verificare", href: "/admin/servizi" }, { key: "soccorso", label: "Richieste di soccorso", href: "/admin/servizi?tab=soccorso" },
        { key: "trasporti", label: "Trasporti", href: "/admin/servizi?tab=trasporti" }, { key: "revisioni", label: "Centri revisione", href: "/admin/servizi?tab=revisioni" }, { key: "statistiche", label: "Statistiche", href: "/admin/servizi?tab=statistiche" }]} />
      {tab === "operatori" && <Operators supabase={supabase} />}
      {tab === "soccorso" && <Roadside supabase={supabase} />}
      {tab === "trasporti" && <Transport supabase={supabase} />}
      {tab === "revisioni" && <Inspection supabase={supabase} />}
      {tab === "statistiche" && <Stats supabase={supabase} />}
    </>
  );
}

function OperatorForm({ kind, profileId, status }: { kind: string; profileId: string; status: string }) {
  return (
    <ActionForm action={adminSetOperator} submitLabel="Applica" size="sm" hidden={{ kind, profile_id: profileId }} className="mt-2">
      <div className="grid gap-2 sm:grid-cols-[200px_1fr]">
        <Field id={`s-${kind}-${profileId}`} label="Decisione"><Select id={`s-${kind}-${profileId}`} name="status" defaultValue={status === "attivo" ? "sospeso" : "attivo"}><option value="attivo">Verificato: attiva</option><option value="sospeso">Sospendi</option><option value="rifiutato">Rifiuta</option><option value="in_revisione">Rimetti in verifica</option></Select></Field>
        <Field id={`n-${kind}-${profileId}`} label="Motivazione / documenti controllati"><Input id={`n-${kind}-${profileId}`} name="note" maxLength={500} placeholder="Es. visura camerale e iscrizione verificate il…" /></Field>
      </div>
    </ActionForm>
  );
}

async function Operators({ supabase }: { supabase: SB }) {
  const [{ data: rs }, { data: tr }] = await Promise.all([
    supabase.from("roadside_operators").select("*, professional_profiles(display_name, slug, city, professional_type, review_status)").order("created_at", { ascending: false }).limit(100),
    supabase.from("transport_operators").select("*, professional_profiles(display_name, slug, city, professional_type, review_status)").order("created_at", { ascending: false }).limit(100),
  ]);
  const rows = [...(rs ?? []).map((o) => ({ kind: "soccorso", o, detail: o.services.map((s) => ROADSIDE_SERVICES[s]).join(", ") + (o.h24 ? " · H24 dichiarato" : "") + (o.price_notes ? ` · tariffe: ${o.price_notes}` : "") })),
    ...(tr ?? []).map((o) => ({ kind: "trasporto", o, detail: o.services.map((s) => TRANSPORT_SERVICES[s]).join(", ") + ` · ${o.regions.join(", ")}` + (o.insurance_declared ? ` · copertura dichiarata: ${o.insurance_notes}` : " · nessuna copertura dichiarata") }))]
    .sort((a, b) => (a.o.status === "in_revisione" ? -1 : 1) - (b.o.status === "in_revisione" ? -1 : 1));
  if (!rows.length) return <EmptyState title="Nessun operatore registrato" />;
  return (
    <div className="flex flex-col gap-3">{rows.map(({ kind, o, detail }) => {
      const p = o.professional_profiles as unknown as { display_name: string; slug: string; city: string | null; professional_type: string; review_status: string };
      return (
        <Card key={`${kind}-${o.profile_id}`} className="p-4">
          <p className="font-bold">{p.display_name} <Badge tone="neutral">{kind}</Badge> <Badge tone={OPERATOR_STATUS[o.status].tone}>{OPERATOR_STATUS[o.status].label}</Badge></p>
          <p className="text-sm text-muted">{p.professional_type} · {p.city ?? "città non indicata"} · profilo {p.review_status} · <Link className="underline" href={`/admin/professionisti?q=${encodeURIComponent(p.display_name)}`}>scheda e documenti</Link></p>
          <p className="text-sm">{detail}</p>
          {o.verified_at && <p className="text-xs text-muted">Verificato il {formatDateTime(o.verified_at)}</p>}
          <OperatorForm kind={kind} profileId={o.profile_id} status={o.status} />
        </Card>
      );
    })}</div>
  );
}

function CancelForm({ kind, id }: { kind: string; id: string }) {
  return (
    <ActionForm action={adminCancelService} submitLabel="Annulla (staff)" size="sm" variant="danger" hidden={{ kind, id }} confirm="Annullare e avvisare le parti?" className="mt-2">
      <Field id={`c-${id}`} label="Motivo (visibile al cliente)"><Input id={`c-${id}`} name="reason" required maxLength={500} /></Field>
    </ActionForm>
  );
}

async function Roadside({ supabase }: { supabase: SB }) {
  const { data } = await supabase.from("roadside_requests").select("id, service, status, area_text, vehicle_desc, created_at, cancel_reason, professional_profiles(display_name)").order("created_at", { ascending: false }).limit(100);
  if (!data?.length) return <EmptyState title="Nessuna richiesta di soccorso" />;
  return (
    <div className="flex flex-col gap-2">{data.map((r) => (
      <Card key={r.id} className="p-4">
        <div className="flex flex-wrap justify-between gap-2"><p className="font-bold">{ROADSIDE_SERVICES[r.service]} · {r.vehicle_desc}</p><Badge tone={ROADSIDE_STATUS[r.status].tone}>{ROADSIDE_STATUS[r.status].label}</Badge></div>
        <p className="text-sm text-muted">{r.area_text} · {formatDateTime(r.created_at)}{r.professional_profiles ? ` · operatore ${(r.professional_profiles as unknown as { display_name: string }).display_name}` : ""}{r.cancel_reason ? ` · motivo: ${r.cancel_reason}` : ""}</p>
        <Link className="text-sm underline" href={`/dashboard/soccorso/${r.id}`}>Dettaglio e cronologia</Link>
        {!["completata", "annullata"].includes(r.status) && <CancelForm kind="soccorso" id={r.id} />}
      </Card>))}</div>
  );
}

async function Transport({ supabase }: { supabase: SB }) {
  const { data } = await supabase.from("transport_requests").select("id, status, pickup_city, delivery_city, vehicle_desc, created_at, professional_profiles(display_name)").order("status").order("created_at", { ascending: false }).limit(100);
  if (!data?.length) return <EmptyState title="Nessuna richiesta di trasporto" />;
  const sorted = [...data].sort((a, b) => Number(b.status === "contestata") - Number(a.status === "contestata"));
  return (
    <div className="flex flex-col gap-2">{sorted.map((r) => (
      <Card key={r.id} className={`p-4 ${r.status === "contestata" ? "border-danger" : ""}`}>
        <div className="flex flex-wrap justify-between gap-2"><p className="font-bold">{r.pickup_city} → {r.delivery_city} · {r.vehicle_desc}</p><Badge tone={TRANSPORT_STATUS[r.status].tone}>{TRANSPORT_STATUS[r.status].label}</Badge></div>
        <p className="text-sm text-muted">{formatDateTime(r.created_at)}{r.professional_profiles ? ` · ${(r.professional_profiles as unknown as { display_name: string }).display_name}` : ""}</p>
        <Link className="text-sm underline" href={`/dashboard/trasporti/${r.id}`}>Pratica, preventivi e verbali</Link>
        {!["completata", "annullata"].includes(r.status) && <CancelForm kind="trasporto" id={r.id} />}
      </Card>))}</div>
  );
}

async function Inspection({ supabase }: { supabase: SB }) {
  const { InspectionAdmin } = await import("@/components/services/inspection-admin");
  return <InspectionAdmin supabase={supabase} />;
}

async function Stats({ supabase }: { supabase: SB }) {
  const [{ data: rs }, { data: tr }, { count: ops }] = await Promise.all([
    supabase.from("roadside_requests").select("status"), supabase.from("transport_requests").select("status"),
    supabase.from("roadside_operators").select("profile_id", { count: "exact", head: true }).eq("status", "attivo"),
  ]);
  const c = (rows: { status: string }[] | null, s: string[]) => (rows ?? []).filter((r) => s.includes(r.status)).length;
  const items: [string, number][] = [["Soccorso: richieste", rs?.length ?? 0], ["Soccorso: completate", c(rs, ["completata"])], ["Soccorso: senza operatore", c(rs, ["nessun_operatore"])], ["Operatori di soccorso attivi", ops ?? 0],
    ["Trasporti: richieste", tr?.length ?? 0], ["Trasporti: completati", c(tr, ["completata"])], ["Trasporti: contestati", c(tr, ["contestata"])], ["Trasporti: annullati", c(tr, ["annullata"])]];
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{items.map(([l, v]) => <Card key={l} className="p-4"><p className="text-sm text-muted">{l}</p><p className="text-2xl font-extrabold tabular-nums">{v}</p></Card>)}</div>;
}
