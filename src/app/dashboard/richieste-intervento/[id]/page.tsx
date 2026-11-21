import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BadgeCheck, MapPin, Star } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card, Skeleton } from "@/components/ui/feedback";
import { Input } from "@/components/ui/form";
import { PageHeader, Spec } from "@/components/ui/misc";
import { GroupAttachments } from "@/components/repair/group-attachments";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { cancelRepairRequest, dispatchRepairRequest } from "@/lib/actions/repair";
import { respondQuote } from "@/lib/actions/requests";
import { isUuid } from "@/lib/actions/helpers";
import { FUEL_LABELS, PROBLEM_LABELS, QUOTE_STATUS_LABELS, REQUEST_STATUS_LABELS, SLOT_LABELS } from "@/lib/labels";
import { formatKm, formatPrice } from "@/lib/format";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Richiesta di intervento", robots: { index: false } };

export default function RepairDetailPage(props: PageProps<"/dashboard/richieste-intervento/[id]">) {
  return <Suspense fallback={<Skeleton className="h-[600px]" />}><Detail params={props.params} searchParams={props.searchParams} /></Suspense>;
}

type Sent = { id: string; status: string; conversation_id: string | null; professional_profile_id: string | null; pro: { display_name: string; slug: string; professional_type: string } | null;
  quotes: { id: string; status: string; amount_cents: number; labor_cents: number | null; parts_cents: number | null; extra_costs_cents: number | null; duration_text: string | null; valid_until: string | null; requires_inspection: boolean; description: string }[] };

async function Detail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/dashboard/richieste-intervento/${id}`);
  if (!isUuid(id)) notFound();
  const supabase = await createClient();
  const { data: rr } = await supabase.from("repair_requests").select("*").eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (!rr) notFound();
  const radius = [5, 10, 25, 50].includes(Number(sp.raggio)) ? Number(sp.raggio) : 25;
  const [{ data: sentRaw }, matches] = await Promise.all([
    supabase.from("requests").select("id, status, conversation_id, professional_profile_id, pro:professional_profiles(display_name, slug, professional_type), quotes(id, status, amount_cents, labor_cents, parts_cents, extra_costs_cents, duration_text, valid_until, requires_inspection, description)").eq("repair_request_id", id).order("created_at"),
    rr.status === "aperta" ? supabase.rpc("match_workshops", { repair_id: id, radius_km: radius, max_rows: 20 }) : Promise.resolve({ data: [] }),
  ]);
  const sent = (sentRaw ?? []) as unknown as Sent[];
  const quotes = sent.flatMap((s) => s.quotes.filter((q) => q.status !== "sostituito").map((q) => ({ ...q, request: s }))).sort((a, b) => a.amount_cents - b.amount_cents);
  const available = (matches.data ?? []).filter((m) => !m.already_sent);
  const base = (m: string) => (m === "meccanico" ? "/meccanici" : "/garages");
  return (
    <>
      <PageHeader eyebrow="Richiesta di intervento" title={`${PROBLEM_LABELS[rr.category]} · ${rr.vehicle_make} ${rr.vehicle_model}`} description={<><Link className="underline" href="/dashboard/richieste-intervento">Tutte le richieste</Link> · creata il {formatDate(rr.created_at)}</>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          {quotes.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-1 font-bold">Confronta i preventivi ({quotes.length})</h2>
              <p className="mb-3 text-sm text-muted">Ordinati dal più economico. I preventivi sono indicativi; accettarne uno chiude automaticamente le richieste alle altre officine.</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="text-left text-muted"><tr><th className="py-2 pr-3">Officina</th><th className="py-2 pr-3 text-right">Manodopera</th><th className="py-2 pr-3 text-right">Ricambi</th><th className="py-2 pr-3 text-right">Extra</th><th className="py-2 pr-3 text-right">Totale</th><th className="py-2 pr-3">Tempi</th><th className="py-2 pr-3">Validità</th><th className="py-2" /></tr></thead>
                  <tbody className="divide-y divide-line">{quotes.map((q) => (
                    <tr key={q.id} className="align-top">
                      <td className="py-3 pr-3"><Link className="font-semibold underline" href={`/dashboard/richieste/${q.request.id}`}>{q.request.pro?.display_name ?? "Officina"}</Link>{q.requires_inspection && <span className="mt-1 block text-xs text-warning">Serve un controllo prima del prezzo definitivo</span>}<span className="mt-1 block text-xs text-muted line-clamp-2">{q.description}</span></td>
                      <td className="py-3 pr-3 text-right tabular-nums">{q.labor_cents !== null ? formatPrice(q.labor_cents, true) : "—"}</td>
                      <td className="py-3 pr-3 text-right tabular-nums">{q.parts_cents !== null ? formatPrice(q.parts_cents, true) : "—"}</td>
                      <td className="py-3 pr-3 text-right tabular-nums">{q.extra_costs_cents !== null ? formatPrice(q.extra_costs_cents, true) : "—"}</td>
                      <td className="py-3 pr-3 text-right font-bold tabular-nums">{formatPrice(q.amount_cents, true)}</td>
                      <td className="py-3 pr-3">{q.duration_text ?? "—"}</td>
                      <td className="py-3 pr-3">{q.valid_until ? formatDate(q.valid_until) : "—"}</td>
                      <td className="py-3">
                        {q.status === "inviato" && rr.status === "aperta" ? (
                          <div className="flex flex-col gap-1">
                            <ActionForm action={respondQuote} submitLabel="Accetta" size="sm" hidden={{ quote_id: q.id, request_id: q.request.id, accept: "1" }} confirm="Accetti questo preventivo? Le altre officine verranno avvisate." />
                            <ActionForm action={respondQuote} submitLabel="Rifiuta" size="sm" variant="ghost" hidden={{ quote_id: q.id, request_id: q.request.id, accept: "0" }} />
                          </div>
                        ) : <Badge tone={q.status === "accettato" ? "success" : "neutral"}>{QUOTE_STATUS_LABELS[q.status as keyof typeof QUOTE_STATUS_LABELS] ?? q.status}</Badge>}
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-muted">Nessun pagamento avviene su AutoGarage24. Dopo l&apos;accettazione concorda l&apos;appuntamento dalla pagina della richiesta.</p>
            </Card>
          )}

          {rr.status === "aperta" && (
            <Card className="p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-bold">Officine compatibili</h2>
                <nav className="flex gap-1 text-sm" aria-label="Raggio">{[5, 10, 25, 50].map((r) => <Link key={r} href={`?raggio=${r}`} className={`rounded-full border px-2.5 py-0.5 ${r === radius ? "border-ink bg-ink text-white" : "border-line"}`}>{r} km</Link>)}</nav>
              </div>
              {rr.latitude === null && <p className="mb-3 text-sm text-muted">Senza la tua posizione mostriamo le officine di {rr.city}{rr.postal_code ? ` / ${rr.postal_code}` : ""} e non calcoliamo distanze.</p>}
              {!available.length ? (
                <Alert tone="info">Nessuna altra officina compatibile e disponibile {rr.latitude !== null ? `entro ${radius} km` : `a ${rr.city}`}. Prova un raggio più ampio o torna più tardi: la piattaforma è in fase di lancio e i partner stanno aumentando.</Alert>
              ) : (
                <ActionForm action={dispatchRepairRequest} submitLabel="Invia la richiesta alle officine selezionate" hidden={{ repair_id: id }}>
                  <ul className="flex flex-col gap-2">
                    {available.map((m) => (
                      <li key={m.profile_id}>
                        <label className="flex cursor-pointer gap-3 rounded-xl border border-line p-3 has-[:checked]:border-ink has-[:checked]:bg-mist">
                          <input type="checkbox" name="profile_ids" value={m.profile_id} className="mt-1 accent-orange" />
                          <span className="flex-1">
                            <span className="flex flex-wrap items-center gap-2 font-semibold">{m.display_name}{m.verified && <BadgeCheck className="size-4 text-success" aria-label="Verificato" />}</span>
                            <span className="flex flex-wrap gap-x-3 text-sm text-muted">
                              <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{m.city}{m.distance_km !== null ? ` · ${String(m.distance_km).replace(".", ",")} km` : ""}</span>
                              {m.review_count > 0 && <span className="inline-flex items-center gap-1"><Star className="size-3.5 fill-orange text-orange" aria-hidden />{String(m.rating_avg).replace(".", ",")} ({m.review_count})</span>}
                              <span>{m.professional_type === "meccanico" ? "Meccanico" : "Officina"}</span>
                            </span>
                            {m.matched_services.length > 0 && <span className="text-xs">Servizi: {m.matched_services.join(", ")}</span>}
                          </span>
                          <Link href={`${base(m.professional_type)}/${m.slug}`} className="self-start text-sm underline" target="_blank">Profilo</Link>
                        </label>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-muted">Puoi scegliere fino a 5 officine alla volta (10 in totale). Distanze calcolate solo se conosciamo entrambe le posizioni.</p>
                </ActionForm>
              )}
            </Card>
          )}

          {sent.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-3 font-bold">Inviata a</h2>
              <ul className="divide-y divide-line text-sm">{sent.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <Link className="font-semibold underline" href={`/dashboard/richieste/${s.id}`}>{s.pro?.display_name ?? "Officina"}</Link>
                  <span className="flex items-center gap-2"><Badge tone="neutral">{REQUEST_STATUS_LABELS[s.status as keyof typeof REQUEST_STATUS_LABELS] ?? s.status}</Badge>{s.conversation_id && <Link className="underline" href={`/dashboard/messaggi/${s.conversation_id}`}>Messaggi</Link>}</span>
                </li>
              ))}</ul>
              <div className="mt-4"><GroupAttachments conversationIds={sent.filter((s) => s.conversation_id && !["annullata", "rifiutata"].includes(s.status)).map((s) => s.conversation_id!)} /></div>
            </Card>
          )}
        </div>
        <aside className="flex flex-col gap-4">
          <Card className="p-4">
            <h2 className="mb-2 font-bold">Riepilogo</h2>
            <dl className="text-sm">
              <Spec label="Stato" value={rr.status === "aperta" ? "Aperta" : rr.status === "assegnata" ? "Preventivo scelto" : rr.status === "annullata" ? "Annullata" : "Chiusa"} />
              <Spec label="Auto" value={[rr.vehicle_make, rr.vehicle_model, rr.vehicle_year].filter(Boolean).join(" ")} />
              {rr.fuel && <Spec label="Alimentazione" value={FUEL_LABELS[rr.fuel]} />}
              {rr.mileage_km !== null && <Spec label="Km" value={formatKm(rr.mileage_km)} />}
              <Spec label="Luogo" value={`${rr.city}${rr.postal_code ? ` ${rr.postal_code}` : ""}`} />
              {rr.preferred_date && <Spec label="Data preferita" value={`${formatDate(rr.preferred_date)} · ${SLOT_LABELS[rr.preferred_slot]}`} />}
              {rr.availability_text && <Spec label="Disponibilità" value={rr.availability_text} />}
            </dl>
            <p className="mt-3 whitespace-pre-line text-sm text-graphite">{rr.description}</p>
          </Card>
          {["aperta", "assegnata"].includes(rr.status) && (
            <Card className="p-4">
              <ActionForm action={cancelRepairRequest} submitLabel="Annulla la richiesta" variant="danger" size="sm" hidden={{ repair_id: id }} confirm="Annullare la richiesta? Le officine verranno avvisate.">
                <label className="text-sm" htmlFor="cr-r">Motivo (facoltativo)</label><Input id="cr-r" name="reason" />
              </ActionForm>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
