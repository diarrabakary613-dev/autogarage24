import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card, Skeleton } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { addLeadNote, saveTask } from "@/lib/actions/business";
import { getBusinessContext, LEAD_SOURCES, LEAD_STATUS } from "@/lib/business/context";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Contatto" };

const LINKS: Record<string, (id: string) => string> = {
  richiesta: (id) => `/dashboard/richieste/${id}`, prenotazione: (id) => `/dashboard/prenotazioni/${id}`, soccorso: (id) => `/dashboard/soccorso/${id}`,
  trasporto: (id) => `/dashboard/trasporti/${id}`, revisione: (id) => `/dashboard/revisioni/${id}`, valutazione: (id) => `/dashboard/valutazioni/professionista/${id}`,
  permuta: (id) => `/dashboard/permute/${id}`, offerta: () => "/dashboard/offerte?tab=richieste",
};

export default function LeadDetail(props: PageProps<"/business/lead/dettaglio">) {
  return <Suspense fallback={<Skeleton className="h-96" />}><Detail searchParams={props.searchParams} /></Suspense>;
}

async function Detail({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase, current, can, isOwner } = await getBusinessContext("/business/lead");
  if (!can("lead")) return <Alert tone="info">Il tuo ruolo non include i contatti.</Alert>;
  const sp = await searchParams;
  const src = typeof sp.fonte === "string" && sp.fonte in LEAD_SOURCES ? sp.fonte : null;
  const id = typeof sp.id === "string" && /^[0-9a-f-]{36}$/.test(sp.id) ? sp.id : null;
  if (!src || !id) notFound();
  const { data } = await supabase.rpc("business_leads", { profile_id: current.profile_id, p_from: new Date(0).toISOString() });
  const l = (data ?? []).find((x) => x.source === src && x.source_id === id);
  if (!l) notFound();
  const [{ data: notes }, { data: tasks }] = await Promise.all([
    supabase.from("business_lead_notes").select("*").eq("profile_id", current.profile_id).eq("source", src).eq("source_id", id).order("created_at"),
    supabase.from("business_tasks").select("id, title, status, due_at").eq("profile_id", current.profile_id).eq("lead_source", src).eq("lead_id", id).order("created_at"),
  ]);
  return (
    <>
      <PageHeader title={`${l.customer_name} · ${l.title}`} description={`${LEAD_SOURCES[l.source]} · ricevuto ${formatDateTime(l.received_at)}${l.customer_city ? ` · ${l.customer_city}` : ""}`} actions={<Badge tone={LEAD_STATUS[l.lead_status].tone}>{LEAD_STATUS[l.lead_status].label}</Badge>} />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <Card className="p-5 text-sm">
            <p><strong>Tipo:</strong> {l.kind?.replace(/_/g, " ")}{l.vehicle ? ` · ${l.vehicle}` : ""}</p>
            <p><strong>Stato della richiesta:</strong> {l.source_status.replace(/_/g, " ")}</p>
            {isOwner ? <Link className="mt-2 inline-block font-semibold text-orange-700 underline" href={LINKS[src](id)}>Apri la richiesta originale</Link>
              : <p className="mt-2 text-xs text-muted">Le conversazioni e i dati di contatto restano nell&apos;area del titolare.</p>}
          </Card>
          <Card className="flex flex-col gap-3 p-5">
            <h2 className="font-bold">Note interne</h2>
            <p className="text-xs text-muted">Visibili solo al team dell&apos;azienda, mai al cliente.</p>
            <ul className="flex flex-col gap-2">{(notes ?? []).map((n) => <li key={n.id} className="rounded-xl bg-mist p-3 text-sm"><p className="whitespace-pre-line">{n.body}</p><p className="text-xs text-muted">{formatDateTime(n.created_at)}</p></li>)}</ul>
            <ActionForm action={addLeadNote} submitLabel="Aggiungi nota" size="sm" hidden={{ profile_id: current.profile_id, source: src, source_id: id }} resetOnSuccess>
              <Field id="nb" label="Nota"><Textarea id="nb" name="body" rows={2} required maxLength={2000} /></Field>
            </ActionForm>
          </Card>
        </div>
        <aside className="flex flex-col gap-3">
          {can("attivita") && (
            <Card className="flex flex-col gap-2 p-4">
              <h2 className="font-bold">Promemoria</h2>
              <ul className="text-sm">{(tasks ?? []).map((t) => <li key={t.id}>{t.status === "completata" ? "✓ " : "○ "}{t.title}{t.due_at ? ` · ${formatDateTime(t.due_at)}` : ""}</li>)}</ul>
              <ActionForm action={saveTask} submitLabel="Crea promemoria" size="sm" variant="outline" hidden={{ profile_id: current.profile_id, lead_source: src, lead_id: id }} resetOnSuccess>
                <Field id="tt" label="Cosa fare"><Input id="tt" name="title" required defaultValue={`Ricontattare ${l.customer_name}`} /></Field>
                <Field id="tk" label="Tipo"><Select id="tk" name="kind" defaultValue="richiamare"><option value="rispondere">Rispondere</option><option value="richiamare">Richiamare</option><option value="preventivo">Inviare preventivo</option><option value="confermare_appuntamento">Confermare appuntamento</option></Select></Field>
                <Field id="td" label="Entro (ora di Milano)" optional><Input id="td" name="due_at" type="datetime-local" /></Field>
              </ActionForm>
            </Card>
          )}
          <Link className="text-sm underline" href="/business/lead">← Tutti i contatti</Link>
        </aside>
      </div>
    </>
  );
}
