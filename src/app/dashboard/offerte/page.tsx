import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { ButtonLink } from "@/components/ui/button";
import { FileUploader } from "@/components/ui/file-uploader";
import { PageHeader, TabLinks } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { deleteOffer, saveCoupon, saveOffer, setOfferStatus, toggleCoupon, updateClaim } from "@/lib/actions/offers";
import { CLAIM_STATUS, NEO_TOPICS, OFFER_CATEGORIES, OFFER_STATUS } from "@/lib/offers/labels";
import { formatPrice } from "@/lib/format";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { Tables } from "@/lib/supabase/database.types";
import { initialFormState, type FormState } from "@/lib/validation/form-state";

export const metadata: Metadata = { title: "Le mie offerte (partner)", robots: { index: false } };
type SP = Record<string, string | string[] | undefined>;

export default function PartnerOffersPage(props: PageProps<"/dashboard/offerte">) {
  return (
    <>
      <PageHeader eyebrow="Partner" title="Offerte e coupon" description="Crea promozioni, gestisci coupon e richieste. Le offerte sono pubblicate dopo l'approvazione dello staff; i prezzi devono essere reali." />
      <Suspense fallback={<Skeleton className="h-96" />}><Content searchParams={props.searchParams} /></Suspense>
    </>
  );
}

async function Content({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser("/dashboard/offerte");
  const sp = await searchParams;
  const tab = ["offerte", "nuova", "coupon", "richieste"].includes(String(sp.tab)) ? String(sp.tab) : "offerte";
  const supabase = await createClient();
  const { data: profiles } = await supabase.from("professional_profiles").select("id, display_name, review_status").eq("user_id", user.id).is("deleted_at", null);
  if (!profiles?.length) return <EmptyState title="Serve un profilo professionale" description="Le offerte possono essere pubblicate da officine, meccanici e altri partner registrati." action={<ButtonLink href="/diventa-partner">Diventa partner</ButtonLink>} />;
  const profile = profiles[0];
  const editId = typeof sp.id === "string" && /^[0-9a-f-]{36}$/.test(sp.id) ? sp.id : null;
  const [{ data: offers }, { data: stats }] = await Promise.all([
    supabase.from("promotional_offers").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }),
    supabase.rpc("offer_stats", { profile_id: profile.id }),
  ]);
  const st = new Map((stats ?? []).map((s) => [s.offer_id, s]));
  const editing = editId ? (offers ?? []).find((o) => o.id === editId) : undefined;
  return (
    <>
      <TabLinks current={editing ? "nuova" : tab} items={[
        { key: "offerte", label: "Offerte e statistiche", href: "/dashboard/offerte" }, { key: "nuova", label: editing ? "Modifica offerta" : "Nuova offerta", href: "/dashboard/offerte?tab=nuova" },
        { key: "coupon", label: "Coupon", href: "/dashboard/offerte?tab=coupon" }, { key: "richieste", label: "Richieste ricevute", href: "/dashboard/offerte?tab=richieste" },
      ]} />
      {profile.review_status !== "approvato" && <Alert tone="warning" className="mb-4">Il tuo profilo non è ancora approvato: puoi preparare le offerte, ma saranno pubblicate solo con il profilo pubblico.</Alert>}
      {sp.salvata && <Alert tone="success" className="mb-4">Offerta salvata.</Alert>}
      {(tab === "nuova" || editing) && <Card className="p-5"><OfferForm profileId={profile.id} o={editing} userId={user.id} /></Card>}
      {tab === "offerte" && !editing && (
        !offers?.length ? <EmptyState title="Nessuna offerta" description="Crea la prima offerta: titolo, prezzi reali, condizioni e validità." action={<ButtonLink href="/dashboard/offerte?tab=nuova">Nuova offerta</ButtonLink>} /> : (
          <ul className="flex flex-col gap-3">{offers.map((o) => {
            const s = st.get(o.id);
            const conv = s && s.views > 0 ? `${((Number(s.claims) / s.views) * 100).toFixed(1)}%` : null;
            return (
              <li key={o.id}><Card className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div><p className="font-bold">{o.title} <Badge tone={o.status === "pubblicata" ? "success" : o.status === "rifiutata" || o.status === "sospesa" ? "danger" : "neutral"}>{OFFER_STATUS[o.status as keyof typeof OFFER_STATUS]}</Badge></p>
                    <p className="text-sm text-muted">{formatPrice(o.promo_price_cents)} invece di {formatPrice(o.original_price_cents)} (−{o.discount_pct}%) · {formatDate(o.starts_on)} → {formatDate(o.ends_on)}{o.quantity_total ? ` · ${o.quantity_claimed}/${o.quantity_total} richieste` : ""}</p>
                    {o.status_note && <p className="text-sm text-danger">Nota dello staff: {o.status_note}</p>}</div>
                  <div className="flex flex-wrap gap-2">
                    <ButtonLink href={`/dashboard/offerte?id=${o.id}`} size="sm" variant="outline">Modifica</ButtonLink>
                    {o.status === "bozza" && <ActionForm action={setOfferStatus} submitLabel="Invia in revisione" size="sm" hidden={{ id: o.id, status: "in_revisione" }} />}
                    {o.status === "pubblicata" && <ActionForm action={setOfferStatus} submitLabel="Sospendi" size="sm" variant="ghost" hidden={{ id: o.id, status: "sospesa" }} />}
                    {o.status === "sospesa" && <ActionForm action={setOfferStatus} submitLabel="Riattiva (revisione)" size="sm" variant="ghost" hidden={{ id: o.id, status: "in_revisione" }} />}
                    {["bozza", "rifiutata"].includes(o.status) && <ActionForm action={deleteOffer} submitLabel="Elimina" size="sm" variant="ghost" hidden={{ id: o.id }} confirm="Eliminare l'offerta?" />}
                    {o.status === "pubblicata" && <ButtonLink href={`/offerte/${o.slug}`} size="sm" variant="ghost">Pagina pubblica</ButtonLink>}
                  </div>
                </div>
                {s && <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-sm sm:grid-cols-6">
                  {([["Visualizzazioni", s.views], ["Clic", s.clicks], ["Richieste", s.claims], ["Confermate", s.confirmed], ["Utilizzate (verificate)", s.used], ["Coupon usati", s.coupons_used]] as [string, number][]).map(([l, v]) => <div key={l} className="rounded-lg bg-mist p-2"><dt className="text-xs text-muted">{l}</dt><dd className="font-bold tabular-nums">{Number(v)}</dd></div>)}
                </dl>}
                <p className="mt-2 text-xs text-muted">Conversione richieste/visualizzazioni: {conv ?? "dati insufficienti"}. Le visualizzazioni non sono acquisti: «utilizzate» conta solo i codici che hai segnato tu come usati.</p>
              </Card></li>
            );
          })}</ul>
        )
      )}
      {tab === "coupon" && <Coupons profileId={profile.id} offers={(offers ?? []).map((o) => ({ id: o.id, title: o.title }))} />}
      {tab === "richieste" && <Claims userId={user.id} />}
    </>
  );
}

function OfferForm({ profileId, o, userId }: { profileId: string; o?: Tables<"promotional_offers">; userId: string }) {
  const eur = (c?: number) => (c ? String(c / 100) : "");
  return (
    <ActionForm action={saveOffer} submitLabel="Salva come bozza" hidden={{ profile_id: profileId, id: o?.id }}>
      {((s: FormState) => (<div className="grid gap-3 sm:grid-cols-2">
        <Field id="o-t" label="Titolo" error={s.fieldErrors?.title} className="sm:col-span-2"><Input id="o-t" name="title" defaultValue={o?.title} maxLength={120} /></Field>
        <Field id="o-c" label="Categoria" error={s.fieldErrors?.category}><Select id="o-c" name="category" defaultValue={o?.category ?? "tagliandi"}>{Object.entries(OFFER_CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
        <Field id="o-q" label="Quantità disponibile" optional hint="Vuoto = senza limite"><Input id="o-q" name="quantity_total" inputMode="numeric" defaultValue={o?.quantity_total ?? ""} /></Field>
        <Field id="o-op" label="Prezzo originale (€)" error={s.fieldErrors?.original_price} hint="Il prezzo che applichi normalmente."><Input id="o-op" name="original_price" inputMode="decimal" defaultValue={eur(o?.original_price_cents)} /></Field>
        <Field id="o-pp" label="Prezzo promozionale (€)" error={s.fieldErrors?.promo_price}><Input id="o-pp" name="promo_price" inputMode="decimal" defaultValue={eur(o?.promo_price_cents)} /></Field>
        <Field id="o-s" label="Inizio" error={s.fieldErrors?.starts_on}><Input id="o-s" name="starts_on" type="date" defaultValue={o?.starts_on ?? ""} /></Field>
        <Field id="o-e" label="Scadenza" error={s.fieldErrors?.ends_on}><Input id="o-e" name="ends_on" type="date" defaultValue={o?.ends_on ?? ""} /></Field>
        <Field id="o-d" label="Descrizione" error={s.fieldErrors?.description} className="sm:col-span-2"><Textarea id="o-d" name="description" rows={4} defaultValue={o?.description} /></Field>
        <Field id="o-co" label="Condizioni" error={s.fieldErrors?.conditions} className="sm:col-span-2" hint="Cosa è incluso, esclusioni, veicoli ammessi, prenotazione."><Textarea id="o-co" name="conditions" rows={3} defaultValue={o?.conditions} /></Field>
        <div className="flex flex-col gap-2"><Checkbox id="o-n" name="neo_dedicated" label="Offerta dedicata ai neopatentati" defaultChecked={o?.neo_dedicated} />
          <Select name="neo_topic" aria-label="Tipo di offerta per neopatentati" defaultValue={o?.neo_topic ?? "prima_manutenzione"}>{Object.entries(NEO_TOPICS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></div>
        <div><FileUploader bucket="business-media" folder={userId} kind="image" label={o?.image_path ? "Sostituisci la foto" : "Fotografia dell'offerta"} name="image_path" max={1} /><p className="mt-1 text-xs text-muted">Solo foto tue o con diritti d&apos;uso.</p></div>
        <div className="flex items-center gap-2 sm:col-span-2"><input type="checkbox" id="o-sub" name="submit" value="1" className="accent-orange" /><label htmlFor="o-sub" className="text-sm font-semibold">Invia allo staff per la pubblicazione</label></div>
      </div>))(initialFormState)}
    </ActionForm>
  );
}

async function Coupons({ profileId, offers }: { profileId: string; offers: { id: string; title: string }[] }) {
  const supabase = await createClient();
  const { data } = await supabase.from("promotional_coupons").select("*").eq("profile_id", profileId).order("created_at", { ascending: false });
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {!data?.length ? <EmptyState title="Nessun coupon" description="I coupon sono codici che i clienti inseriscono quando richiedono un'offerta." /> : (
        <ul className="flex flex-col gap-2">{data.map((c) => (
          <li key={c.id}><Card className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
            <span><span className="font-mono font-bold">{c.code}</span> · {c.discount_type === "percentuale" ? `−${c.discount_value}%` : `−${formatPrice(c.discount_value * 100)}`} · usi {c.uses_count}{c.max_uses ? `/${c.max_uses}` : ""} · fino al {formatDate(c.valid_until)}{c.min_amount_cents ? ` · minimo ${formatPrice(c.min_amount_cents)}` : ""}{c.categories.length ? ` · ${c.categories.map((x) => OFFER_CATEGORIES[x as keyof typeof OFFER_CATEGORIES]).join(", ")}` : ""}</span>
            <ActionForm action={toggleCoupon} submitLabel={c.active ? "Disattiva" : "Riattiva"} size="sm" variant="outline" hidden={{ id: c.id, active: c.active ? "0" : "1" }} />
          </Card></li>
        ))}</ul>
      )}
      <Card className="p-5"><h2 className="mb-3 font-bold">Nuovo coupon</h2>
        <ActionForm action={saveCoupon} submitLabel="Crea coupon" hidden={{ profile_id: profileId }} resetOnSuccess>
          {((s: FormState) => (<div className="grid gap-3">
            <Field id="cp-c" label="Codice" error={s.fieldErrors?.code}><Input id="cp-c" name="code" maxLength={24} placeholder="PRIMA10" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field id="cp-t" label="Tipo"><Select id="cp-t" name="discount_type"><option value="percentuale">Percentuale</option><option value="importo">Importo fisso (€)</option></Select></Field>
              <Field id="cp-v" label="Valore"><Input id="cp-v" name="discount_value" inputMode="numeric" /></Field>
              <Field id="cp-m" label="Utilizzi massimi" optional><Input id="cp-m" name="max_uses" inputMode="numeric" /></Field>
              <Field id="cp-u" label="Per cliente"><Input id="cp-u" name="per_user_limit" inputMode="numeric" defaultValue="1" /></Field>
              <Field id="cp-mi" label="Importo minimo (€)" optional><Input id="cp-mi" name="min_amount" inputMode="decimal" /></Field>
              <Field id="cp-s" label="Scadenza" error={s.fieldErrors?.valid_until}><Input id="cp-s" name="valid_until" type="date" /></Field>
            </div>
            <Field id="cp-o" label="Solo per l'offerta" optional><Select id="cp-o" name="offer_id" defaultValue=""><option value="">Tutte le mie offerte</option>{offers.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}</Select></Field>
            <fieldset><legend className="mb-1 text-sm font-semibold">Solo per le categorie (facoltativo)</legend><div className="flex flex-wrap gap-2">{Object.entries(OFFER_CATEGORIES).map(([k, l]) => <Checkbox key={k} id={`cpc-${k}`} name="categories" value={k} label={l} />)}</div></fieldset>
          </div>))(initialFormState)}
        </ActionForm>
      </Card>
    </div>
  );
}

async function Claims({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data } = await supabase.from("offer_claims").select("*, promotional_offers!inner(title, owner_id)").eq("promotional_offers.owner_id", userId).order("created_at", { ascending: false }).limit(200);
  if (!data?.length) return <EmptyState title="Nessuna richiesta" description="Quando un cliente richiede un'offerta la trovi qui, con il suo codice personale." />;
  return (
    <ul className="flex flex-col gap-2">{data.map((c) => (
      <li key={c.id}><Card className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
        <span><span className="font-mono font-bold">{c.claim_code}</span> · {(c.promotional_offers as unknown as { title: string }).title} · {formatDateTime(c.created_at)} · stima {formatPrice(c.estimated_cents)}{c.message ? ` · «${c.message}»` : ""} <Badge tone="neutral">{CLAIM_STATUS[c.status as keyof typeof CLAIM_STATUS]}</Badge></span>
        <span className="flex flex-wrap gap-2">
          {c.conversation_id && <Link className="underline" href={`/dashboard/messaggi/${c.conversation_id}`}>Messaggi</Link>}
          {c.status === "richiesto" && <ActionForm action={updateClaim} submitLabel="Conferma" size="sm" hidden={{ id: c.id, status: "confermato" }} />}
          {c.status === "confermato" && <ActionForm action={updateClaim} submitLabel="Segna come utilizzato" size="sm" hidden={{ id: c.id, status: "utilizzato" }} confirm="Il cliente ha usufruito dell'offerta?" />}
          {["richiesto", "confermato"].includes(c.status) && <ActionForm action={updateClaim} submitLabel="Annulla" size="sm" variant="ghost" hidden={{ id: c.id, status: "annullato" }} />}
        </span>
      </Card></li>
    ))}</ul>
  );
}
