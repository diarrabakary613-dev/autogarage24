import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OfferChain } from "@/components/services/offer-chain";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { professionalAction } from "@/lib/actions/valuation";
import { formatPrice } from "@/lib/format";
import { ACCIDENTS, CONDITIONS, INSPECTION_STATES, TARGET_STATUS } from "@/lib/valuation/labels";
import { nowMs } from "@/lib/bookings/time";
import { initialFormState, type FormState } from "@/lib/validation/form-state";

export const metadata: Metadata = { title: "Richiesta di valutazione", robots: { index: false } };

export default function ProRequestPage(props: PageProps<"/dashboard/valutazioni/professionista/[id]">) {
  return <Suspense fallback={<Skeleton className="h-96" />}><Detail params={props.params} /></Suspense>;
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/valutazioni/professionista/${id}`);
  const supabase = await createClient();
  const { data: profiles } = await supabase.from("professional_profiles").select("id").eq("user_id", user.id);
  const { data: t } = await supabase.from("valuation_request_targets").select("*").eq("request_id", id).in("profile_id", (profiles ?? []).map((p) => p.id)).maybeSingle();
  if (!t) notFound();
  const { data: r } = await supabase.from("valuation_requests").select("*, vehicle_valuations(*)").eq("id", id).maybeSingle();
  if (!r) return <Alert tone="info">Il cliente ha ritirato la richiesta: i dati non sono più disponibili.</Alert>;
  const v = r.vehicle_valuations as unknown as { make: string; model: string; version: string | null; year: number; mileage_km: number; fuel: string | null; transmission: string | null; power_kw: number | null; engine_cc: number | null;
    condition: string; owners_count: number | null; accidents: string; damage_notes: string | null; inspection_status: string; options: string[]; province: string; region: string; estimate_min_cents: number | null; estimate_max_cents: number | null } | null;
  if (!v) return <Alert tone="info">Dati dell&apos;auto non più disponibili.</Alert>;
  const { data: offers } = await supabase.from("valuation_offers").select("*").eq("request_id", id).eq("profile_id", t.profile_id).order("created_at");
  const { data: photos } = r.shared_photos.length ? await supabase.storage.from("valuation-photos").createSignedUrls(r.shared_photos, 600) : { data: [] };
  const today = new Date(nowMs()).toISOString().slice(0, 10);
  const open = r.status === "aperta" && !["rifiutata", "scartata", "accettata"].includes(t.status);
  return (
    <>
      <PageHeader title={`${v.make} ${v.model} ${v.year}`} description={`${v.version ?? ""} · ${v.mileage_km.toLocaleString("it-IT")} km · ${v.province}, ${v.region}`} actions={<Badge tone={TARGET_STATUS[t.status].tone}>{TARGET_STATUS[t.status].label}</Badge>} />
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-4">
          <Card className="grid gap-1 p-5 text-sm sm:grid-cols-2">
            <p><strong>Alimentazione:</strong> {v.fuel ?? "—"}</p><p><strong>Cambio:</strong> {v.transmission ?? "—"}</p>
            <p><strong>Potenza:</strong> {v.power_kw ? `${v.power_kw} kW` : "—"}</p><p><strong>Cilindrata:</strong> {v.engine_cc ? `${v.engine_cc} cc` : "—"}</p>
            <p><strong>Condizioni:</strong> {CONDITIONS[v.condition]}</p><p><strong>Proprietari:</strong> {v.owners_count ?? "—"}</p>
            <p><strong>Incidenti:</strong> {ACCIDENTS[v.accidents]}</p><p><strong>Revisione:</strong> {INSPECTION_STATES[v.inspection_status]}</p>
            {v.damage_notes && <p className="sm:col-span-2"><strong>Danni:</strong> {v.damage_notes}</p>}
            {v.options.length > 0 && <p className="sm:col-span-2"><strong>Optional:</strong> {v.options.join(", ")}</p>}
            {r.share_estimate && v.estimate_min_cents && <p className="sm:col-span-2"><strong>Stima preliminare condivisa:</strong> {formatPrice(v.estimate_min_cents)} – {formatPrice(v.estimate_max_cents!)}</p>}
            {r.message && <p className="sm:col-span-2"><strong>Messaggio:</strong> {r.message}</p>}
          </Card>
          {(photos?.length ?? 0) > 0 && <Card className="flex flex-wrap gap-2 p-4">{photos!.flatMap((p) => (p.signedUrl ? [{ k: p.path ?? p.signedUrl, u: p.signedUrl }] : [])).map((p) => <a key={p.k} href={p.u} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.u} alt="Foto condivisa dal cliente" className="size-28 rounded-lg object-cover" /></a>)}</Card>}
          <Card className="p-5"><h2 className="mb-2 font-bold">Proposte</h2><OfferChain offers={offers ?? []} side="professionista" back={`/dashboard/valutazioni/professionista/${id}`} today={today} /></Card>
          {open && (
            <Card className="flex flex-col gap-3 p-5">
              <h2 className="font-bold">Invia una proposta</h2>
              <ActionForm action={professionalAction} submitLabel="Invia proposta" hidden={{ id, action: "proposta" }}>
                {((s: FormState) => (<div className="grid gap-2 sm:grid-cols-2">
                  <Field id="k" label="Tipo"><Select id="k" name="kind" defaultValue={r.intent === "vendita" ? "offerta_acquisto" : "valutazione"}><option value="offerta_acquisto">Offerta di acquisto</option><option value="valutazione">Solo valutazione</option></Select></Field>
                  <Field id="a" label="Importo (€)" error={s.fieldErrors?.amount}><Input id="a" name="amount" type="number" min={100} step="100" required /></Field>
                  <Field id="c" label="Condizioni" optional className="sm:col-span-2"><Textarea id="c" name="conditions" rows={2} maxLength={1000} placeholder="Es. salvo verifica in sede, passaggio di proprietà a nostro carico" /></Field>
                  <Field id="vd" label="Validità (giorni)"><Input id="vd" name="valid_days" type="number" min={1} max={30} defaultValue={7} /></Field>
                  <div className="flex items-end pb-2"><Checkbox id="ri" name="requires_inspection" defaultChecked label="Soggetta a ispezione del veicolo" /></div>
                </div>))(initialFormState)}
              </ActionForm>
              <ActionForm action={professionalAction} submitLabel="Chiedi informazioni" size="sm" variant="outline" hidden={{ id, action: "info" }}>
                <Field id="ni" label="Cosa ti serve sapere"><Input id="ni" name="note" required maxLength={1000} /></Field>
              </ActionForm>
              <ActionForm action={professionalAction} submitLabel="Rifiuta la richiesta" size="sm" variant="ghost" hidden={{ id, action: "rifiuta" }}>
                <Field id="nr" label="Motivo (visibile al cliente)"><Input id="nr" name="note" required maxLength={500} /></Field>
              </ActionForm>
            </Card>
          )}
        </div>
        <aside>{t.conversation_id && <ButtonLink href={`/dashboard/messaggi/${t.conversation_id}`} variant="outline">Apri la conversazione</ButtonLink>}</aside>
      </div>
    </>
  );
}
