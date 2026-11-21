import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card, Skeleton } from "@/components/ui/feedback";
import { Checkbox } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { withdrawInsuranceRequest } from "@/lib/actions/insurance";
import { COVERAGES, RP_STATUS } from "@/lib/insurance/labels";
import { formatPrice } from "@/lib/format";
import { formatDate, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Richiesta assicurativa", robots: { index: false } };

export default function InsuranceDetail(props: PageProps<"/dashboard/assicurazioni/[id]">) {
  return <Suspense fallback={<Skeleton className="h-96" />}><Detail params={props.params} searchParams={props.searchParams} /></Suspense>;
}

async function Detail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/dashboard/assicurazioni/${id}`);
  const supabase = await createClient();
  const { data: r } = await supabase.from("insurance_quote_requests").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!r) notFound();
  const [{ data: parts }, { data: events }] = await Promise.all([
    supabase.from("insurance_request_partners").select("*, insurance_partners(name, website_url, contact_email, contact_phone)").eq("request_id", id),
    supabase.from("insurance_request_events").select("*").eq("request_id", id).order("created_at"),
  ]);
  const { data: qs } = (parts?.length ?? 0) ? await supabase.from("insurance_quotes").select("*, insurance_partners(name)").in("request_partner_id", parts!.map((p) => p.id)).order("annual_premium_cents") : { data: [] };
  return (
    <>
      <PageHeader title={`${r.vehicle_make} ${r.vehicle_model}`} description={`${r.coverages.map((c) => COVERAGES[c]?.label).join(", ")} · provincia ${r.province}`} actions={<Badge tone={r.status === "ritirata" ? "neutral" : "warning"}>{r.status}</Badge>} />
      {sp.creata && <Alert tone="success" className="mb-4">Richiesta inviata ai partner scelti. Ti avvisiamo quando arriva un preventivo.</Alert>}
      <div className="flex flex-col gap-4">
        <Card className="p-5">
          <h2 className="mb-2 font-bold">Partner</h2>
          <ul className="flex flex-col gap-2">{(parts ?? []).map((p) => {
            const ip = p.insurance_partners as unknown as { name: string; website_url: string | null; contact_email: string | null; contact_phone: string | null };
            return (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-mist p-3 text-sm">
                <span><strong>{ip.name}</strong>{p.partner_note ? ` — ${p.partner_note}` : ""}<br /><span className="text-xs text-muted">Consenso dato il {formatDateTime(p.consent_at)}</span></span>
                <span className="flex flex-wrap items-center gap-2"><Badge tone={RP_STATUS[p.status].tone}>{RP_STATUS[p.status].label}</Badge>
                  {ip.website_url && <a className="underline" href={ip.website_url} target="_blank" rel="noreferrer noopener">Sito</a>}
                  {ip.contact_email && <a className="underline" href={`mailto:${ip.contact_email}`}>Email</a>}
                  {ip.contact_phone && <a className="underline" href={`tel:${ip.contact_phone.replace(/[^0-9+]/g, "")}`}>Telefono</a>}</span>
              </li>
            );
          })}</ul>
        </Card>
        <Card className="p-5">
          <h2 className="mb-2 font-bold">Preventivi ricevuti</h2>
          {!qs?.length ? <p className="text-sm text-muted">Nessun preventivo ancora. AutoGarage24 non calcola né stima i premi: compariranno qui solo i preventivi inviati dai partner.</p> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-muted"><tr><th className="py-2">Fornitore e prodotto</th><th>Premio annuo</th><th>Coperture</th><th>Franchigie</th><th>Massimali</th><th>Esclusioni</th><th>Durata</th><th>Validità</th><th /></tr></thead>
              <tbody className="divide-y divide-line">{qs.map((q) => (
                <tr key={q.id} className="align-top">
                  <td className="py-2 font-semibold">{(q.insurance_partners as unknown as { name: string }).name}<br /><span className="font-normal">{q.product_name}</span></td>
                  <td className="font-bold tabular-nums">{formatPrice(q.annual_premium_cents)}</td><td>{q.coverages}</td><td>{q.deductibles ?? "—"}</td><td>{q.limits ?? "—"}</td><td>{q.exclusions ?? "—"}</td>
                  <td>{q.duration_months} mesi</td><td>{formatDate(q.valid_until)}</td>
                  <td className="flex flex-col gap-1"><a className="underline" href={q.documents_url} target="_blank" rel="noreferrer noopener">Set informativo</a>{q.purchase_url && <a className="font-semibold text-orange-700 underline" href={q.purchase_url} target="_blank" rel="noreferrer noopener">Vai al partner</a>}</td>
                </tr>))}</tbody>
            </table></div>
          )}
          <p className="mt-2 text-xs text-muted">Prima di sottoscrivere leggi il DIP e le condizioni di assicurazione: le fornisce il partner, che è l&apos;unico responsabile della proposta.</p>
        </Card>
        <Card className="flex flex-col gap-3 p-5">
          <h2 className="font-bold">Cronologia</h2>
          <ol className="text-sm">{(events ?? []).map((e) => <li key={e.id}><span className="text-muted">{formatDateTime(e.created_at)}</span> · {e.event.replace(/_/g, " ")}{e.note ? ` — ${e.note}` : ""}</li>)}</ol>
          <ActionForm action={withdrawInsuranceRequest} submitLabel={r.status === "ritirata" ? "Elimina i dati della richiesta" : "Ritira la richiesta"} variant="danger" size="sm" hidden={{ id }} confirm="Confermi? I partner saranno avvisati.">
            {r.status !== "ritirata" ? <Checkbox id="dd" name="delete_data" label="Elimina anche i dati dalla piattaforma" /> : <input type="hidden" name="delete_data" value="on" />}
            <p className="text-xs text-muted">I partner che hanno già ricevuto i dati ne sono titolari autonomi: per la cancellazione presso di loro usa i contatti indicati nelle loro informative.</p>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
