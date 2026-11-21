import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PeriodFilter } from "@/components/business/period-filter";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Select } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { setLeadStatus } from "@/lib/actions/business";
import { getBusinessContext, LEAD_SOURCES, LEAD_STATUS, readPeriod } from "@/lib/business/context";
import { nowMs } from "@/lib/bookings/time";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Contatti e clienti" };

export default function LeadsPage(props: PageProps<"/business/lead">) {
  return (
    <>
      <PageHeader title="Contatti e clienti" description="Tutte le richieste ricevute dalla piattaforma in un unico CRM. Stati e note sono interni: il cliente non li vede." />
      <Suspense fallback={<Skeleton className="h-96" />}><List searchParams={props.searchParams} /></Suspense>
    </>
  );
}

async function List({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase, current, can, isOwner } = await getBusinessContext("/business/lead");
  if (!can("lead")) return <Alert tone="info">Il tuo ruolo non include i contatti.</Alert>;
  const sp = await searchParams;
  const per = readPeriod({ periodo: "90", ...sp }, nowMs());
  const fonte = typeof sp.fonte === "string" && sp.fonte in LEAD_SOURCES ? sp.fonte : "";
  const stato = typeof sp.stato === "string" && sp.stato in LEAD_STATUS ? sp.stato : "";
  const [{ data }, { data: members }] = await Promise.all([
    supabase.rpc("business_leads", { profile_id: current.profile_id, p_from: per.from.toISOString(), p_to: per.to.toISOString() }),
    supabase.from("business_members").select("user_id, invite_email").eq("profile_id", current.profile_id).eq("status", "attivo"),
  ]);
  const { data: plan } = await supabase.rpc("business_plan", { profile_id: current.profile_id });
  const rows = (data ?? []).filter((l) => (!fonte || l.source === fonte) && (!stato || l.lead_status === stato));
  const q = (o: Record<string, string>) => `/business/lead?${new URLSearchParams({ ...(per.key === "personalizzato" ? { da: per.da, a: per.a } : { periodo: per.key }), fonte, stato, ...o })}`;
  return (
    <>
      <PeriodFilter base="/business/lead" current={per.key} da={per.da} a={per.a} maxDays={(plan as { analytics_days: number } | null)?.analytics_days ?? 90} />
      <div className="mb-3 flex flex-wrap gap-1.5 text-sm">
        <Link href={q({ fonte: "" })} className={`rounded-full border px-3 py-1 ${!fonte ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>Tutti i canali</Link>
        {Object.entries(LEAD_SOURCES).map(([k, l]) => <Link key={k} href={q({ fonte: k })} className={`rounded-full border px-3 py-1 ${fonte === k ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>{l}</Link>)}
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5 text-sm">
        <Link href={q({ stato: "" })} className={`rounded-full border px-3 py-1 ${!stato ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>Tutti gli stati</Link>
        {Object.entries(LEAD_STATUS).map(([k, v]) => <Link key={k} href={q({ stato: k })} className={`rounded-full border px-3 py-1 ${stato === k ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>{v.label} ({(data ?? []).filter((l) => l.lead_status === k).length})</Link>)}
      </div>
      {!rows.length ? <EmptyState title="Nessun contatto" description="Le richieste dei clienti compariranno qui appena arrivano." /> : (
        <ul className="flex flex-col gap-2">{rows.map((l) => (
          <li key={`${l.source}-${l.source_id}`}><Card className="flex flex-col gap-2 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold"><Link className="hover:underline" href={`/business/lead/dettaglio?fonte=${l.source}&id=${l.source_id}`}>{l.customer_name} · {l.title}</Link></p>
                <p className="text-sm text-muted">{LEAD_SOURCES[l.source]}{l.vehicle ? ` · ${l.vehicle}` : ""} · ricevuto {formatDateTime(l.received_at)} · stato richiesta: {l.source_status.replace(/_/g, " ")}{l.notes_count ? ` · ${l.notes_count} note` : ""}</p>
              </div>
              <Badge tone={LEAD_STATUS[l.lead_status].tone}>{LEAD_STATUS[l.lead_status].label}</Badge>
            </div>
            <ActionForm action={setLeadStatus} submitLabel="Aggiorna" size="sm" variant="outline" hidden={{ profile_id: current.profile_id, source: l.source, source_id: l.source_id }} className="flex-row flex-wrap items-end">
              <div className="flex flex-wrap gap-2">
                <Select name="status" aria-label="Stato del contatto" defaultValue={l.lead_status} className="w-auto">{Object.entries(LEAD_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select>
                {(members?.length ?? 0) > 0 && <Select name="assigned_to" aria-label="Assegna a" defaultValue={l.assigned_to ?? ""} className="w-auto"><option value="">Non assegnato</option>{members!.map((m) => <option key={m.user_id!} value={m.user_id!}>{m.invite_email}</option>)}</Select>}
              </div>
            </ActionForm>
            {isOwner && l.conversation_id && <Link className="text-sm font-semibold text-orange-700 underline" href={`/dashboard/messaggi/${l.conversation_id}`}>Apri la conversazione</Link>}
          </Card></li>))}</ul>
      )}
    </>
  );
}
