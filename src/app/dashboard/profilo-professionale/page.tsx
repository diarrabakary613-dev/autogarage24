import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { BadgeCheck, ExternalLink } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { PageHeader, TabLinks } from "@/components/ui/misc";
import { FileUploader } from "@/components/ui/file-uploader";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  addCertification, deleteBusinessPhoto, registerBusinessMedia, requestAffiliation, requestVerification, saveProfessionalProfile, submitProfessionalProfile,
} from "@/lib/actions/professional";
import { DAYS, parseHours } from "@/lib/professionals/hours";
import { REVIEW_STATUS_LABELS, WORK_MODE_LABELS } from "@/lib/labels";
import { publicFileUrl } from "@/lib/storage";
import { formatDate } from "@/lib/utils";
import { BRANDS } from "@/config/brands";

export const metadata: Metadata = { title: "Profilo professionale", robots: { index: false } };

const PUBLIC_BASE: Record<string, string> = { officina: "/garages", meccanico: "/meccanici", venditore_ricambi: "/venditori-ricambi", venditore_auto: "/professionisti" };
const TYPE_LABEL: Record<string, string> = { officina: "Officina / garage", meccanico: "Meccanico indipendente", venditore_ricambi: "Venditore di ricambi", venditore_auto: "Venditore di automobili" };

export default function ProProfilePage(props: PageProps<"/dashboard/profilo-professionale">) {
  return (
    <>
      <PageHeader title="Profilo professionale" description="Completa il profilo anche in più momenti: le modifiche si salvano come bozza finché non lo invii per la verifica." />
      <Suspense fallback={<Skeleton className="h-[700px]" />}><Editor searchParams={props.searchParams} /></Suspense>
    </>
  );
}

async function Editor({ searchParams }: { searchParams: PageProps<"/dashboard/profilo-professionale">["searchParams"] }) {
  const user = await requireUser("/dashboard/profilo-professionale");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: profiles } = await supabase.from("professional_profiles").select("*").eq("user_id", user.id).is("deleted_at", null).order("created_at");
  if (!profiles?.length) {
    return <EmptyState title="Non hai ancora un profilo professionale" description="Scegli il tipo di attività per iniziare." action={<div className="flex flex-wrap justify-center gap-2"><ButtonLink href="/professionisti/registrazione-garage" size="sm">Officina</ButtonLink><ButtonLink href="/professionisti/registrazione-meccanico" size="sm" variant="outline">Meccanico</ButtonLink><ButtonLink href="/professionisti/registrazione-ricambi" size="sm" variant="outline">Ricambi</ButtonLink></div>} />;
  }
  const p = profiles.find((x) => x.id === sp.profilo) ?? profiles[0];
  const section = typeof sp.sezione === "string" ? sp.sezione : "dati";
  const [priv, cats, business, photos, certs, verifs, affs] = await Promise.all([
    supabase.rpc("professional_private_details", { profile_id: p.id }),
    p.professional_type === "venditore_ricambi"
      ? supabase.from("part_categories").select("slug, name").is("parent_id", null).eq("active", true).order("position")
      : supabase.from("business_categories").select("slug, name").in("applies_to", [p.professional_type === "meccanico" ? "meccanico" : "officina", "entrambi"]).eq("active", true).order("position"),
    supabase.from("business_profiles").select("legal_name, vat_number").eq("user_id", user.id).maybeSingle(),
    supabase.from("business_photos").select("id, storage_path").eq("profile_id", p.id).order("position"),
    supabase.from("professional_certifications").select("id, title, issuer, issued_on, verified_at").eq("profile_id", p.id),
    supabase.from("verification_requests").select("id, verification_type, status, decision_note, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    p.professional_type === "meccanico" ? supabase.from("professional_affiliations").select("id, status, garage:professional_profiles!professional_affiliations_garage_profile_id_fkey(display_name, slug)").eq("mechanic_profile_id", p.id) : Promise.resolve({ data: [] }),
  ]);
  const pd = priv.data?.[0];
  const hours = parseHours(p.opening_hours);
  const href = (s: string) => `/dashboard/profilo-professionale?profilo=${p.id}&sezione=${s}`;
  const canSubmit = p.review_status === "bozza" || p.review_status === "rifiutato";
  const missing = [!p.city && "città", !p.description && "descrizione", !(p.categories?.length) && "almeno una categoria"].filter(Boolean);

  return (
    <div className="flex flex-col gap-6">
      {profiles.length > 1 && (
        <div className="flex flex-wrap gap-2">{profiles.map((x) => <Link key={x.id} href={`/dashboard/profilo-professionale?profilo=${x.id}`} aria-current={x.id === p.id ? "page" : undefined} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${x.id === p.id ? "border-ink bg-ink text-white" : "border-line-strong bg-white"}`}>{x.display_name} · {TYPE_LABEL[x.professional_type]}</Link>)}</div>
      )}
      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted">{TYPE_LABEL[p.professional_type]}</p>
          <p className="text-lg font-bold">{p.display_name} <Badge tone={p.review_status === "approvato" ? "success" : p.review_status === "rifiutato" || p.review_status === "sospeso" ? "danger" : "warning"}>{REVIEW_STATUS_LABELS[p.review_status]}</Badge></p>
          {pd?.review_note && <p className="mt-1 text-sm text-[#6e4000]">Nota del team: {pd.review_note}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {p.review_status === "approvato" && <ButtonLink href={`${PUBLIC_BASE[p.professional_type]}/${p.slug}`} variant="outline" size="sm" icon={<ExternalLink className="size-4" aria-hidden />}>Pagina pubblica</ButtonLink>}
          {canSubmit && (missing.length ? <p className="text-sm text-muted">Per inviare completa: {missing.join(", ")}.</p> : <ActionForm action={submitProfessionalProfile} submitLabel="Invia per la verifica" size="sm" hidden={{ profile_id: p.id }} confirm="Inviare il profilo al team?" />)}
        </div>
      </Card>

      <TabLinks current={section} items={[
        { key: "dati", label: "Dati e contatti", href: href("dati") },
        { key: "orari", label: "Orari", href: href("orari") },
        { key: "foto", label: "Logo e foto", href: href("foto") },
        { key: "verifica", label: "Verifica e documenti", href: href("verifica") },
        ...(p.professional_type === "meccanico" ? [{ key: "collegamenti", label: "Officine partner", href: href("collegamenti") }] : []),
      ]} />

      {(section === "dati" || section === "orari") && (
        <Card className="p-6">
          <ActionForm action={saveProfessionalProfile} submitLabel="Salva" pendingLabel="Salvataggio…" hidden={{ profile_id: p.id }}>
            {(s) => {
              const fe = s.fieldErrors ?? {};
              return (
                <>
                  <div className={section === "dati" ? "grid gap-4 sm:grid-cols-2" : "hidden"}>
                    <Field id="pp-name" label={p.professional_type === "meccanico" ? "Nome professionale" : "Nome attività"} error={fe.display_name}><Input id="pp-name" name="display_name" defaultValue={p.display_name} maxLength={120} /></Field>
                    <Field id="pp-ref" label="Referente dell'attività" optional hint="Non viene pubblicato."><Input id="pp-ref" name="contact_person" defaultValue={pd?.contact_person ?? ""} /></Field>
                    <Field id="pp-desc" label="Descrizione" className="sm:col-span-2"><Textarea id="pp-desc" name="description" rows={5} defaultValue={p.description ?? ""} maxLength={4000} /></Field>
                    <fieldset className="sm:col-span-2">
                      <legend className="mb-2 text-sm font-semibold">{p.professional_type === "venditore_ricambi" ? "Categorie trattate" : p.professional_type === "meccanico" ? "Specializzazioni" : "Tipologia di attività (anche più di una)"}</legend>
                      <div className="grid gap-2 sm:grid-cols-3">{(cats.data ?? []).map((c) => <Checkbox key={c.slug} id={`cat-${c.slug}`} name="categories" value={c.slug} defaultChecked={p.categories?.includes(c.slug)} label={c.name} />)}</div>
                    </fieldset>
                    <Field id="pp-brands" label="Marche trattate" optional hint={`Separate da virgola, es. ${BRANDS.slice(0, 3).map((b) => b.name).join(", ")}`} className="sm:col-span-2"><Input id="pp-brands" name="brands_served" defaultValue={(p.brands_served ?? []).join(", ")} /></Field>
                    {p.professional_type === "meccanico" && (
                      <>
                        <fieldset className="sm:col-span-2"><legend className="mb-2 text-sm font-semibold">Modalità di intervento</legend>
                          <div className="flex flex-wrap gap-4">{Object.entries(WORK_MODE_LABELS).map(([v, l]) => <Checkbox key={v} id={`wm-${v}`} name="work_modes" value={v} defaultChecked={p.work_modes?.includes(v as never)} label={l} />)}</div>
                        </fieldset>
                        <Field id="pp-exp" label="Anni di esperienza (dichiarati)" optional><Input id="pp-exp" name="experience_years" inputMode="numeric" defaultValue={p.experience_years ?? ""} /></Field>
                        <Field id="pp-rad" label="Raggio operativo (km)" optional><Input id="pp-rad" name="service_radius_km" inputMode="numeric" defaultValue={p.service_radius_km ?? ""} /></Field>
                        <Field id="pp-area" label="Zone servite" optional className="sm:col-span-2"><Input id="pp-area" name="service_area" defaultValue={p.service_area ?? ""} placeholder="Es. Milano Nord, Sesto San Giovanni, Monza" /></Field>
                      </>
                    )}
                    {p.professional_type !== "meccanico" && <input type="hidden" name="work_modes" value="sede" />}
                    <h3 className="mt-2 font-bold sm:col-span-2">Sede e contatti pubblici</h3>
                    <Field id="pp-addr" label="Indirizzo" optional className="sm:col-span-2"><Input id="pp-addr" name="address_line" defaultValue={pd?.address_line ?? ""} /></Field>
                    <Checkbox id="pp-show" name="show_address" defaultChecked={p.show_address} className="sm:col-span-2" label="Mostra l'indirizzo sulla pagina pubblica (altrimenti mostriamo solo la zona, con posizione approssimata)" />
                    <Field id="pp-city" label="Città"><Input id="pp-city" name="city" defaultValue={p.city ?? ""} /></Field>
                    <Field id="pp-cap" label="CAP" optional error={fe.postal_code}><Input id="pp-cap" name="postal_code" inputMode="numeric" maxLength={5} defaultValue={p.postal_code ?? ""} /></Field>
                    <Field id="pp-prov" label="Provincia (sigla)" optional><Input id="pp-prov" name="province" maxLength={2} defaultValue={p.province ?? ""} /></Field>
                    <Field id="pp-reg" label="Regione" optional><Input id="pp-reg" name="region" defaultValue={p.region ?? "Lombardia"} /></Field>
                    <Field id="pp-lat" label="Latitudine" optional error={fe.latitude} hint="Per la mappa: copia le coordinate da OpenStreetMap o Google Maps."><Input id="pp-lat" name="latitude" inputMode="decimal" defaultValue={pd?.latitude ?? ""} /></Field>
                    <Field id="pp-lng" label="Longitudine" optional><Input id="pp-lng" name="longitude" inputMode="decimal" defaultValue={pd?.longitude ?? ""} /></Field>
                    <Field id="pp-tel" label="Telefono pubblico" optional error={fe.phone_public}><Input id="pp-tel" name="phone_public" type="tel" defaultValue={p.phone_public ?? ""} /></Field>
                    <Field id="pp-mail" label="Email pubblica" optional error={fe.email_public}><Input id="pp-mail" name="email_public" type="email" defaultValue={p.email_public ?? ""} /></Field>
                    <Field id="pp-web" label="Sito web" optional error={fe.website}><Input id="pp-web" name="website" type="url" defaultValue={p.website ?? ""} placeholder="https://" /></Field>
                    <Checkbox id="pp-appt" name="accepts_appointments" defaultChecked={p.accepts_appointments} label="Accetto richieste di appuntamento" />
                    <h3 className="mt-2 font-bold sm:col-span-2">Dati aziendali (privati)</h3>
                    <Field id="pp-legal" label="Ragione sociale" optional><Input id="pp-legal" name="legal_name" defaultValue={business.data?.legal_name ?? ""} /></Field>
                    <Field id="pp-vat" label="Partita IVA" optional error={fe.vat_number}><Input id="pp-vat" name="vat_number" defaultValue={business.data?.vat_number ?? ""} /></Field>
                  </div>
                  <div className={section === "orari" ? "grid gap-4 sm:grid-cols-2" : "hidden"}>
                    <p className="text-sm text-muted sm:col-span-2">Per ogni giorno indica le fasce (es. 08:30-12:30, 14:00-18:30) oppure «chiuso». Lascia vuoto se non vuoi indicarlo.</p>
                    {DAYS.map(([k, label]) => <Field key={k} id={`h-${k}`} label={label} error={fe[`h_${k}`]}><Input id={`h-${k}`} name={`h_${k}`} defaultValue={hours[k] ?? ""} /></Field>)}
                    <Field id="pp-closed" label="Giorni di chiusura" optional className="sm:col-span-2"><Input id="pp-closed" name="closed_days" defaultValue={p.closed_days ?? ""} placeholder="Es. agosto dal 10 al 25, festivi" /></Field>
                  </div>
                </>
              );
            }}
          </ActionForm>
        </Card>
      )}

      {section === "foto" && (
        <Card className="flex flex-col gap-6 p-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <h3 className="font-bold">Logo</h3>
              {publicFileUrl("business-media", p.logo_path) && <div className="relative size-24 overflow-hidden rounded-xl bg-mist"><Image src={publicFileUrl("business-media", p.logo_path)!} alt="Logo attuale" fill sizes="96px" className="object-cover" /></div>}
              <FileUploader bucket="business-media" folder={user.id} kind="image" label="Carica il logo" onUploaded={registerBusinessMedia.bind(null, p.id, "logo")} />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="font-bold">Immagine di copertina</h3>
              {publicFileUrl("business-media", p.cover_path) && <div className="relative aspect-[3/1] overflow-hidden rounded-xl bg-mist"><Image src={publicFileUrl("business-media", p.cover_path)!} alt="Copertina attuale" fill sizes="400px" className="object-cover" /></div>}
              <FileUploader bucket="business-media" folder={user.id} kind="image" label="Carica la copertina" onUploaded={registerBusinessMedia.bind(null, p.id, "copertina")} />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="font-bold">Foto dell&apos;attività e dei lavori</h3>
            <p className="text-sm text-muted">Carica solo foto di cui hai i diritti e senza persone o targhe riconoscibili senza consenso.</p>
            <FileUploader bucket="business-media" folder={user.id} kind="image" label="Aggiungi foto" multiple max={10} onUploaded={registerBusinessMedia.bind(null, p.id, "foto")} />
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(photos.data ?? []).map((ph) => (
                <li key={ph.id} className="flex flex-col gap-1">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-mist">{publicFileUrl("business-media", ph.storage_path) && <Image src={publicFileUrl("business-media", ph.storage_path)!} alt="" fill sizes="200px" className="object-cover" />}</div>
                  <ActionForm action={deleteBusinessPhoto} submitLabel="Elimina" size="sm" variant="danger" hidden={{ profile_id: p.id, photo_id: ph.id }} confirm="Eliminare?" />
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      {section === "verifica" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h3 className="mb-1 font-bold">Richiedi una verifica</h3>
            <p className="mb-4 text-sm text-muted">Distinguiamo: identità verificata, attività verificata, documenti verificati. Nessun badge viene assegnato senza controllo; la verifica non certifica la qualità del servizio.</p>
            <ActionForm action={requestVerification} submitLabel="Invia richiesta" resetOnSuccess>
              <Field id="vr-t" label="Cosa vuoi verificare"><Select id="vr-t" name="verification_type" defaultValue="attivita_professionale"><option value="attivita_professionale">Attività professionale (visura, P.IVA)</option><option value="identita">Identità del titolare</option><option value="documentazione">Altra documentazione</option></Select></Field>
              <FileUploader bucket="verification-documents" folder={user.id} kind="document" label="Allega documenti (privati)" multiple max={5} name="document_paths" />
              <Field id="vr-n" label="Note per il team" optional><Textarea id="vr-n" name="notes" rows={3} /></Field>
            </ActionForm>
            <ul className="mt-4 flex flex-col gap-2 text-sm">{(verifs.data ?? []).map((v) => <li key={v.id} className="flex justify-between gap-2 rounded-lg bg-mist p-2"><span>{v.verification_type.replace("_", " ")} · {formatDate(v.created_at)}</span><Badge tone={v.status === "approvata" ? "success" : v.status === "rifiutata" ? "danger" : "warning"}>{v.status.replace("_", " ")}</Badge></li>)}</ul>
          </Card>
          <Card className="p-6">
            <h3 className="mb-1 font-bold">Certificazioni e formazione</h3>
            <p className="mb-4 text-sm text-muted">Sono pubbliche solo dopo che il team ha controllato il documento.</p>
            <ActionForm action={addCertification} submitLabel="Aggiungi certificazione" hidden={{ profile_id: p.id }} resetOnSuccess>
              <Field id="ce-t" label="Titolo"><Input id="ce-t" name="title" maxLength={160} /></Field>
              <Field id="ce-i" label="Ente" optional><Input id="ce-i" name="issuer" /></Field>
              <Field id="ce-d" label="Data di rilascio" optional><Input id="ce-d" name="issued_on" type="date" /></Field>
              <FileUploader bucket="verification-documents" folder={user.id} kind="document" label="Allega l'attestato" name="document_path" />
            </ActionForm>
            <ul className="mt-4 flex flex-col gap-2 text-sm">{(certs.data ?? []).map((c) => <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg bg-mist p-2"><span>{c.title}</span>{c.verified_at ? <Badge tone="success"><BadgeCheck className="size-3" aria-hidden /> Verificata</Badge> : <Badge tone="warning">In attesa di verifica</Badge>}</li>)}</ul>
          </Card>
        </div>
      )}

      {section === "collegamenti" && p.professional_type === "meccanico" && (
        <Card className="p-6">
          <h3 className="mb-1 font-bold">Collaborazione con un&apos;officina</h3>
          <p className="mb-4 text-sm text-muted">Il collegamento compare sul tuo profilo solo dopo l&apos;accettazione dell&apos;officina. Non ti dà alcun permesso di gestione sull&apos;officina.</p>
          <ActionForm action={requestAffiliation} submitLabel="Invia richiesta" hidden={{ profile_id: p.id }} resetOnSuccess>
            <Field id="af-g" label="Indirizzo della pagina dell'officina su AutoGarage24" hint="Es. https://…/garages/nome-officina"><Input id="af-g" name="garage_slug" /></Field>
            <Field id="af-m" label="Messaggio" optional><Input id="af-m" name="message" maxLength={500} /></Field>
          </ActionForm>
          <ul className="mt-4 flex flex-col gap-2 text-sm">{(affs.data ?? []).map((a) => { const g = a.garage as unknown as { display_name: string; slug: string } | null; return <li key={a.id} className="flex justify-between rounded-lg bg-mist p-2"><span>{g?.display_name}</span><Badge tone={a.status === "accettato" ? "success" : "neutral"}>{a.status.replace("_", " ")}</Badge></li>; })}</ul>
        </Card>
      )}
      {p.review_status === "approvato" && <Alert tone="info">Le modifiche al profilo approvato sono subito visibili. Il team può verificare nuovamente i dati in caso di segnalazioni.</Alert>}
    </div>
  );
}
