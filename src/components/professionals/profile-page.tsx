import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { Suspense } from "react";
import { BadgeCheck, Clock, ExternalLink, Globe, Mail, MapPin, Navigation, Phone, Star } from "lucide-react";
import { Badge, Container, Skeleton } from "@/components/ui/feedback";
import { Breadcrumbs } from "@/components/marketing/page-hero";
import { JsonLd } from "@/components/marketing/json-ld";
import { MapView } from "@/components/maps/map-view";
import { ListingCard } from "@/components/marketplace/listing-card";
import { ReportButton } from "@/components/reports/report-button";
import { ProfileContact } from "./profile-contact";
import { getPublicProfile, type PublicProfile } from "@/lib/data/profile-detail";
import { createPublicClient } from "@/lib/supabase/public";
import { DAYS, parseHours } from "@/lib/professionals/hours";
import { formatPrice } from "@/lib/format";
import { PART_CONDITION_LABELS, WORK_MODE_LABELS } from "@/lib/labels";
import { publicFileUrl } from "@/lib/storage";
import { formatDate } from "@/lib/utils";
import { getSiteUrl } from "@/lib/env";
import type { ListingCardData } from "@/lib/data/listings";

const TYPE: Record<string, { base: string; crumb: string; schema: string }> = {
  officina: { base: "/garages", crumb: "Garages", schema: "AutoRepair" },
  meccanico: { base: "/meccanici", crumb: "Meccanici", schema: "AutoRepair" },
  venditore_ricambi: { base: "/venditori-ricambi", crumb: "Ricambi", schema: "AutoPartsStore" },
  venditore_auto: { base: "/professionisti", crumb: "Professionisti", schema: "AutoDealer" },
};

export async function profileMetadata(slug: string, expectedType?: string) {
  const d = await getPublicProfile(slug);
  if (!d || (expectedType && d.profile.professional_type !== expectedType)) notFound();
  const t = TYPE[d.profile.professional_type];
  const title = `${d.profile.display_name}${d.profile.city ? ` — ${d.profile.city}` : ""}`;
  const description = (d.profile.description ?? `${d.profile.display_name}: servizi, orari e contatti su AutoGarage24.`).slice(0, 160);
  const img = publicFileUrl("business-media", d.profile.cover_path ?? d.profile.logo_path);
  // Profili poveri di informazioni non vengono indicizzati (niente pagine SEO vuote).
  const thin = !d.profile.description && d.services.length === 0;
  return {
    title, description,
    alternates: { canonical: `${t.base}/${slug}` },
    robots: thin ? { index: false, follow: true } : undefined,
    openGraph: { title, description, url: `${t.base}/${slug}`, images: img ? [{ url: img }] : undefined },
  };
}

export async function ProfilePage({ slug, expectedType }: { slug: string; expectedType: string[] }) {
  const d = await getPublicProfile(slug);
  if (!d || !expectedType.includes(d.profile.professional_type)) notFound();
  const p = d.profile;
  const t = TYPE[p.professional_type];
  after(async () => { await createPublicClient()?.rpc("track_profile_view", { profile_slug: slug }); });
  const hours = parseHours(p.opening_hours);
  const cover = publicFileUrl("business-media", p.cover_path);
  const logo = publicFileUrl("business-media", p.logo_path);
  const loc = d.location;
  const names = new Map(d.categories.map((c) => [c.slug, c.name]));
  const directions = loc && !loc.approximate ? `https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}` : null;
  const here = `${t.base}/${slug}`;

  return (
    <div className="bg-mist pb-16">
      <JsonLd data={profileJsonLd(d, t.schema, here)} />
      <div className="relative h-44 bg-ink sm:h-60">
        {cover && <Image src={cover} alt="" fill priority sizes="100vw" className="object-cover opacity-80" />}
      </div>
      <Container className="-mt-16 relative">
        <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-6 shadow-card sm:flex-row sm:items-end">
          <span className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl border-4 border-white bg-mist shadow-card">
            {logo ? <Image src={logo} alt={`Logo ${p.display_name}`} fill sizes="96px" className="object-cover" /> : <span className="font-display text-3xl font-extrabold text-muted">{p.display_name.slice(0, 1)}</span>}
          </span>
          <div className="min-w-0 flex-1">
            <Breadcrumbs items={[{ name: t.crumb, href: t.base === "/venditori-ricambi" ? "/ricambi" : t.base }, { name: p.display_name, href: here }]} />
            <h1 className="mt-1 text-3xl font-extrabold">{p.display_name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1"><MapPin className="size-4" aria-hidden />{[p.city, p.province].filter(Boolean).join(" · ")}</span>
              {d.reviewCount > 0 && d.ratingAvg !== null && <span className="inline-flex items-center gap-1"><Star className="size-4 fill-orange text-orange" aria-hidden />{d.ratingAvg.toLocaleString("it-IT")} · {d.reviewCount} recensioni</span>}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.business_verified_at && <Badge tone="success"><BadgeCheck className="size-3" aria-hidden /> Attività verificata</Badge>}
              {p.identity_verified_at && <Badge tone="success"><BadgeCheck className="size-3" aria-hidden /> Identità verificata</Badge>}
              {p.documents_checked_at && <Badge tone="success"><BadgeCheck className="size-3" aria-hidden /> Documenti verificati</Badge>}
              {!p.business_verified_at && !p.identity_verified_at && <Badge tone="neutral">Profilo registrato</Badge>}
              {d.founding && <Badge tone="dark" title="Tra i primi partner ammessi da AutoGarage24 a Milano">Founding Partner</Badge>}
              <Badge tone="neutral">Su AutoGarage24 dal {formatDate(p.created_at)}</Badge>
              {d.listings.length > 0 && <Badge tone="neutral">{d.listings.length}{d.listings.length === 6 ? "+" : ""} annunci attivi</Badge>}
            </div>
          </div>
        </div>
      </Container>

      <Container className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          {p.description && <Block title="Presentazione"><p className="whitespace-pre-line text-graphite">{p.description}</p></Block>}

          {(p.categories?.length || p.brands_served?.length || p.work_modes?.length || p.experience_years !== null) ? (
            <Block title={p.professional_type === "meccanico" ? "Competenze e modalità" : "Specializzazioni"}>
              {(p.categories?.length ?? 0) > 0 && <ul className="flex flex-wrap gap-2">{p.categories!.map((c) => <li key={c} className="rounded-full bg-mist px-3 py-1 text-sm">{names.get(c) ?? c}</li>)}</ul>}
              {(p.brands_served?.length ?? 0) > 0 && <p className="mt-3 text-sm"><strong>Marche trattate (dichiarate):</strong> {p.brands_served!.join(", ")}</p>}
              {(p.work_modes?.length ?? 0) > 0 && <p className="mt-2 text-sm"><strong>Modalità di intervento:</strong> {p.work_modes!.map((m) => WORK_MODE_LABELS[m]).join(", ")}</p>}
              {p.experience_years !== null && <p className="mt-2 text-sm"><strong>Esperienza dichiarata:</strong> {p.experience_years} anni</p>}
              {p.service_area && <p className="mt-2 text-sm"><strong>Zone servite:</strong> {p.service_area}{p.service_radius_km ? ` (raggio di circa ${p.service_radius_km} km)` : ""}</p>}
              <p className="mt-3 text-xs text-muted">Competenze ed esperienza sono dichiarate dal professionista e non costituiscono una certificazione.</p>
            </Block>
          ) : null}

          {d.certifications.length > 0 && (
            <Block title="Certificazioni verificate">
              <ul className="flex flex-col gap-2 text-sm">{d.certifications.map((c) => <li key={c.id} className="flex items-center gap-2"><BadgeCheck className="size-4 text-success" aria-hidden /><span><strong>{c.title}</strong>{c.issuer ? ` — ${c.issuer}` : ""}{c.issued_on ? ` (${formatDate(c.issued_on)})` : ""}</span></li>)}</ul>
              <p className="mt-2 text-xs text-muted">Documento controllato da AutoGarage24 il {formatDate(d.certifications[0].verified_at!)}.</p>
            </Block>
          )}

          {d.services.length > 0 && (
            <Block title="Servizi">
              <ul className="divide-y divide-line">
                {d.services.map((s) => (
                  <li key={s.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between">
                    <div><p className="font-semibold">{s.name}</p>{s.description && <p className="text-sm text-muted">{s.description}</p>}{s.duration_text && <p className="text-xs text-muted">Durata indicativa: {s.duration_text}</p>}</div>
                    <p className="shrink-0 font-bold">{s.price_type === "fisso" && s.price_cents !== null ? formatPrice(s.price_cents) : s.price_type === "a_partire_da" && s.price_cents !== null ? `da ${formatPrice(s.price_cents)}` : "Prezzo su preventivo"}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">Prezzi indicativi pubblicati dall&apos;attività; il prezzo finale è quello del preventivo.</p>
            </Block>
          )}

          {d.photos.length > 0 && (
            <Block title="Foto">
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {d.photos.map((ph) => publicFileUrl("business-media", ph.storage_path) && (
                  <li key={ph.id} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-mist">
                    <Image src={publicFileUrl("business-media", ph.storage_path)!} alt={ph.caption ?? `Foto di ${p.display_name}`} fill sizes="(min-width: 640px) 33vw, 50vw" className="object-cover" loading="lazy" />
                  </li>
                ))}
              </ul>
            </Block>
          )}

          {(d.garages.length > 0 || d.mechanics.length > 0) && (
            <Block title={d.garages.length ? "Collabora con" : "Meccanici che collaborano con l'officina"}>
              <ul className="flex flex-wrap gap-2">
                {d.garages.map((g) => <li key={g.slug}><Link className="rounded-full border border-line-strong px-3 py-1 text-sm hover:border-ink" href={`/garages/${g.slug}`}>{g.display_name}</Link></li>)}
                {d.mechanics.map((m) => <li key={m.slug}><Link className="rounded-full border border-line-strong px-3 py-1 text-sm hover:border-ink" href={`/meccanici/${m.slug}`}>{m.display_name}</Link></li>)}
              </ul>
            </Block>
          )}

          {d.listings.length > 0 && (
            <Block title="Automobili in vendita">
              <ul className="grid gap-4 sm:grid-cols-2">{(d.listings as ListingCardData[]).map((l) => <li key={l.id}><ListingCard item={l} favorite={null} /></li>)}</ul>
            </Block>
          )}
          {d.parts.length > 0 && (
            <Block title="Ricambi pubblicati">
              <ul className="grid gap-3 sm:grid-cols-2">
                {d.parts.map((r) => (
                  <li key={r.id}><Link href={`/ricambi/${r.slug}`} className="flex flex-col rounded-xl border border-line p-3 hover:border-ink"><span className="font-semibold">{r.title}</span><span className="text-sm text-muted">{formatPrice(r.price_cents)} · {r.condition ? PART_CONDITION_LABELS[r.condition] : ""}{r.oem_code ? ` · OEM ${r.oem_code}` : ""}</span></Link></li>
                ))}
              </ul>
            </Block>
          )}

          <Block title={`Recensioni${d.reviewCount ? ` (${d.reviewCount})` : ""}`}>
            {d.reviews.length === 0 ? <p className="text-sm text-muted">Nessuna recensione ancora. Le recensioni possono essere lasciate solo da clienti con un intervento completato o un acquisto confermato da entrambe le parti su AutoGarage24.</p> : (
              <>
              {d.reputation && d.reputation.count > 0 && <ReputationSummary r={d.reputation} />}
              <ul className="flex flex-col gap-4">
                {d.reviews.map((r) => (
                  <li key={r.id} className="rounded-xl bg-mist p-4">
                    <p className="flex items-center gap-1 font-semibold">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`size-4 ${i < r.rating ? "fill-orange text-orange" : "text-line-strong"}`} aria-hidden />)}<span className="sr-only">{r.rating} su 5</span>{r.title && <span className="ml-2">{r.title}</span>}</p>
                    <p className="mt-1 text-sm text-graphite">{r.comment}</p>
                    <Criteria r={r} />
                    <p className="mt-1 text-xs text-muted">{formatDate(r.created_at)}{r.experience_date ? ` · esperienza del ${formatDate(r.experience_date)}` : ""}{r.service_label ? ` · ${r.service_label}` : ""} · <BadgeCheck className="inline size-3 text-success" aria-hidden /> {r.review_kind === "acquisto" ? "Acquisto confermato da acquirente e venditore" : "Intervento completato su AutoGarage24"}</p>
                    {r.reply && <p className="mt-2 border-l-2 border-orange pl-3 text-sm"><strong>Risposta:</strong> {r.reply}</p>}
                    <div className="mt-2"><ReportButton targetType="recensione" targetId={r.id} targetLabel={`Recensione su ${p.display_name}`} returnTo={here} /></div>
                  </li>
                ))}
              </ul>
              </>
            )}
          </Block>
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <Suspense fallback={<Skeleton className="h-72 rounded-2xl" />}>
            <ProfileContact profileId={p.id} ownerId={p.user_id} type={p.professional_type} name={p.display_name} returnTo={here} services={d.services.map((s) => ({ id: s.id, name: s.name }))} workModes={p.work_modes} />
          </Suspense>
          <section className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 text-sm shadow-card">
            <h2 className="text-lg font-bold">Informazioni</h2>
            {loc?.address_line && <p className="flex gap-2"><MapPin className="size-4 shrink-0 text-muted" aria-hidden />{loc.address_line}, {p.postal_code} {p.city}</p>}
            {!loc?.address_line && <p className="flex gap-2"><MapPin className="size-4 shrink-0 text-muted" aria-hidden />{[p.city, p.province].filter(Boolean).join(" · ")}{loc?.approximate ? " (zona indicativa)" : ""}</p>}
            {p.phone_public && <a className="flex gap-2 hover:underline" href={`tel:${p.phone_public.replace(/\s/g, "")}`}><Phone className="size-4 text-muted" aria-hidden />{p.phone_public}</a>}
            {p.email_public && <a className="flex gap-2 hover:underline" href={`mailto:${p.email_public}`}><Mail className="size-4 text-muted" aria-hidden />{p.email_public}</a>}
            {p.website && /^https?:\/\//.test(p.website) && <a className="flex gap-2 hover:underline" href={p.website} target="_blank" rel="noopener noreferrer nofollow"><Globe className="size-4 text-muted" aria-hidden />Sito web <ExternalLink className="size-3" aria-hidden /></a>}
            {Object.keys(hours).length > 0 && (
              <div>
                <p className="mb-1 flex items-center gap-2 font-semibold"><Clock className="size-4 text-muted" aria-hidden /> Orari</p>
                <dl className="grid grid-cols-[90px_1fr] gap-y-0.5">{DAYS.map(([k, label]) => hours[k] && <div key={k} className="contents"><dt className="text-muted">{label}</dt><dd>{hours[k] === "chiuso" ? "Chiuso" : hours[k]}</dd></div>)}</dl>
              </div>
            )}
            {p.closed_days && <p><strong>Chiusure:</strong> {p.closed_days}</p>}
            {loc && <MapView className="h-56" points={[{ id: p.id, lat: loc.latitude!, lng: loc.longitude!, label: p.display_name, approximate: loc.approximate, radiusKm: loc.approximate ? (p.service_radius_km ?? 2) : null }]} />}
            {directions && <a href={directions} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-semibold text-orange-700 hover:underline"><Navigation className="size-4" aria-hidden /> Indicazioni stradali</a>}
          </section>
          <div className="px-1"><ReportButton targetType="profilo" targetId={p.id} targetLabel={p.display_name} returnTo={here} /></div>
        </aside>
      </Container>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-line bg-white p-6 shadow-card"><h2 className="mb-4 text-xl font-bold">{title}</h2>{children}</section>;
}

function profileJsonLd(d: PublicProfile, schema: string, path: string) {
  const p = d.profile;
  return {
    "@context": "https://schema.org", "@type": schema, name: p.display_name, url: `${getSiteUrl()}${path}`,
    description: p.description ?? undefined, telephone: p.phone_public ?? undefined, email: p.email_public ?? undefined,
    address: { "@type": "PostalAddress", streetAddress: d.location?.address_line ?? undefined, addressLocality: p.city ?? undefined, postalCode: p.postal_code ?? undefined, addressRegion: p.province ?? undefined, addressCountry: "IT" },
    geo: d.location && !d.location.approximate ? { "@type": "GeoCoordinates", latitude: d.location.latitude, longitude: d.location.longitude } : undefined,
    // Valutazione aggregata solo se esistono recensioni reali pubblicate.
    aggregateRating: d.reviewCount > 0 && d.ratingAvg !== null ? { "@type": "AggregateRating", ratingValue: d.ratingAvg, reviewCount: d.reviewCount, bestRating: 5, worstRating: 1 } : undefined,
  };
}

function Stars({ v }: { v: number | null }) {
  if (v === null) return <span className="text-muted">—</span>;
  return <span className="font-semibold tabular-nums">{String(v).replace(".", ",")}<span className="text-muted">/5</span></span>;
}

function ReputationSummary({ r }: { r: import("@/lib/data/profile-detail").Reputation }) {
  const max = Math.max(1, ...Object.values(r.distribution));
  return (
    <div className="mb-5 grid gap-5 rounded-xl border border-line p-4 sm:grid-cols-[auto_1fr_1fr]">
      <div className="text-center">
        <p className="text-4xl font-extrabold tabular-nums">{r.average !== null ? String(r.average).replace(".", ",") : "—"}</p>
        <p className="text-sm text-muted">{r.count} recensioni verificate</p>
        {r.replies > 0 && <p className="text-xs text-muted">{r.replies} con risposta</p>}
      </div>
      <ul className="flex flex-col gap-1 text-sm" aria-label="Distribuzione delle valutazioni">
        {(["5", "4", "3", "2", "1"] as const).map((k) => (
          <li key={k} className="flex items-center gap-2"><span className="w-8 tabular-nums">{k} ★</span><span className="h-2 flex-1 rounded-full bg-mist"><span className="block h-2 rounded-full bg-orange" style={{ width: `${(r.distribution[k] / max) * 100}%` }} /></span><span className="w-6 text-right tabular-nums text-muted">{r.distribution[k]}</span></li>
        ))}
      </ul>
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm">
        {r.service.count > 0 && <><dt>Qualità del servizio</dt><dd><Stars v={r.service.quality} /></dd><dt>Professionalità</dt><dd><Stars v={r.service.professionalism} /></dd><dt>Rapporto qualità-prezzo</dt><dd><Stars v={r.service.value} /></dd></>}
        {r.purchase.count > 0 && <><dt>Accuratezza della descrizione</dt><dd><Stars v={r.purchase.accuracy} /></dd><dt>Comunicazione</dt><dd><Stars v={r.purchase.communication} /></dd><dt>Affidabilità</dt><dd><Stars v={r.purchase.reliability} /></dd></>}
      </dl>
    </div>
  );
}

function Criteria({ r }: { r: { review_kind: string; quality_rating: number | null; professionalism_rating: number | null; value_rating: number | null; accuracy_rating: number | null; communication_rating: number | null; reliability_rating: number | null } }) {
  const items = r.review_kind === "acquisto"
    ? [["Descrizione", r.accuracy_rating], ["Comunicazione", r.communication_rating], ["Affidabilità", r.reliability_rating]]
    : [["Qualità", r.quality_rating], ["Professionalità", r.professionalism_rating], ["Qualità-prezzo", r.value_rating]];
  if (items.every(([, v]) => v === null)) return null;
  return <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-graphite">{items.map(([l, v]) => v !== null && <span key={l as string}>{l}: <strong>{v}/5</strong></span>)}</p>;
}
