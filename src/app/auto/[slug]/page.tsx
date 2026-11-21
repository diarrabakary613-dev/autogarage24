import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { Suspense } from "react";
import { BookingBox } from "@/components/bookings/booking-box";
import { BadgeCheck, Building2, CalendarDays, Fuel, Gauge, MapPin, Settings2, ShieldAlert, User, Zap } from "lucide-react";
import { Container, Badge, Skeleton, Alert } from "@/components/ui/feedback";
import { Breadcrumbs } from "@/components/marketing/page-hero";
import { JsonLd } from "@/components/marketing/json-ld";
import { Gallery } from "@/components/marketplace/gallery";
import { NeoVerification } from "@/components/neopatentati/neo-verification";
import { ListingContact } from "@/components/marketplace/listing-contact";
import { ReportButton } from "@/components/reports/report-button";
import { CompareBar, CompareToggle } from "@/components/marketplace/compare";
import { getPublicListing, type ListingDetail } from "@/lib/data/listing-detail";
import { createPublicClient } from "@/lib/supabase/public";
import { formatKm, formatNumber, formatPower, formatPrice } from "@/lib/format";
import { BODY_LABELS, CONDITION_LABELS, FUEL_LABELS, TRANSMISSION_LABELS } from "@/lib/labels";
import { publicFileUrl } from "@/lib/storage";
import { formatDate } from "@/lib/utils";
import { getSiteUrl } from "@/lib/env";

export async function generateMetadata(props: PageProps<"/auto/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const data = await getPublicListing(slug);
  if (!data) notFound();
  const { listing, vehicle, images } = data;
  const title = `${vehicle.make_name} ${vehicle.model}${vehicle.version ? ` ${vehicle.version}` : ""} ${vehicle.year ?? ""} — ${formatPrice(listing.price_cents)}`;
  const description = [
    `${vehicle.make_name} ${vehicle.model} in vendita a ${listing.city ?? "Milano"}`,
    vehicle.mileage_km !== null ? formatKm(vehicle.mileage_km) : null,
    vehicle.fuel ? FUEL_LABELS[vehicle.fuel] : null,
    listing.seller_kind === "professionista" ? "venditore professionale" : "venditore privato",
  ].filter(Boolean).join(" · ") + ". Contatta il venditore su AutoGarage24.";
  const img = publicFileUrl("listing-images", images[0]?.storage_path);
  return {
    title,
    description,
    alternates: { canonical: `/auto/${slug}` },
    // Gli annunci venduti restano consultabili ma non vengono indicizzati.
    robots: listing.status === "pubblicato" ? undefined : { index: false, follow: true },
    openGraph: { title, description, type: "website", url: `/auto/${slug}`, images: img ? [{ url: img }] : undefined },
  };
}

export default function ListingPage(props: PageProps<"/auto/[slug]">) {
  return <Suspense fallback={<DetailSkeleton />}><ListingDetailView params={props.params} /></Suspense>;
}

function DetailSkeleton() {
  return <div className="bg-mist pb-16"><Container className="grid gap-8 pt-10 lg:grid-cols-[minmax(0,1fr)_380px]"><Skeleton className="aspect-[16/10] rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></Container></div>;
}

async function ListingDetailView({ params }: { params: PageProps<"/auto/[slug]">["params"] }) {
  const { slug } = await params;
  const data = await getPublicListing(slug);
  if (!data) notFound();
  const { listing, vehicle } = data;
  after(async () => {
    // Conteggio visualizzazioni (solo annunci pubblicati), fuori dal percorso di rendering.
    await createPublicClient()?.rpc("track_listing_view", { listing_slug: slug });
  });
  const name = `${vehicle.make_name} ${vehicle.model}`;
  const sold = listing.status === "venduto";

  return (
    <div className="bg-mist pb-16">
      <JsonLd data={vehicleJsonLd(data, slug)} />
      <Container className="pt-6">
        <Breadcrumbs items={[{ name: "Auto usate", href: "/auto-usate" }, { name: vehicle.make_name, href: `/auto-usate?marca=${vehicle.make_slug}` }, { name: listing.title, href: `/auto/${slug}` }]} />
      </Container>
      <Container className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Gallery alt={name} images={data.images.map((i) => ({ id: i.id, url: publicFileUrl("listing-images", i.storage_path)! })).filter((i) => i.url)} />
          <section className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="dark">{listing.seller_kind === "professionista" ? "Venditore professionale" : "Venditore privato"}</Badge>
              <Badge tone="neutral">{CONDITION_LABELS[vehicle.condition]}</Badge>
              {sold && <Badge tone="danger">Venduto</Badge>}
            </div>
            <h1 className="mt-3 text-3xl leading-tight font-extrabold sm:text-4xl">{name} {vehicle.version && <span className="font-semibold text-graphite">{vehicle.version}</span>}</h1>
            <p className="mt-2 font-display text-3xl font-extrabold">{formatPrice(listing.price_cents)}{listing.negotiable && <span className="ml-2 text-sm font-semibold text-muted">trattabile</span>}</p>
            <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <KeyFact icon={<CalendarDays />} label="Anno" value={vehicle.year ? String(vehicle.year) : null} />
              <KeyFact icon={<Gauge />} label="Chilometri" value={vehicle.mileage_km !== null ? formatKm(vehicle.mileage_km) : null} />
              <KeyFact icon={<Fuel />} label="Alimentazione" value={vehicle.fuel ? FUEL_LABELS[vehicle.fuel] : null} />
              <KeyFact icon={<Settings2 />} label="Cambio" value={vehicle.transmission ? TRANSMISSION_LABELS[vehicle.transmission] : null} />
              <KeyFact icon={<Zap />} label="Potenza" value={vehicle.power_kw ? formatPower(vehicle.power_kw) : null} />
              <KeyFact icon={<MapPin />} label="Località" value={[listing.city, listing.province].filter(Boolean).join(" (") + (listing.province ? ")" : "") || null} />
            </ul>
          </section>

          {listing.description && (
            <Section title="Descrizione del venditore">
              <p className="whitespace-pre-line text-graphite">{listing.description}</p>
              <p className="mt-3 text-xs text-muted">Le informazioni sono dichiarate dal venditore e non costituiscono una verifica professionale.</p>
            </Section>
          )}
          {data.videos.length > 0 && (
            <Section title="Video">
              <div className="grid gap-3 sm:grid-cols-2">{data.videos.map((v) => <video key={v.id} src={publicFileUrl("listing-videos", v.storage_path) ?? undefined} controls preload="metadata" className="w-full rounded-xl bg-ink" aria-label="Video dell'automobile" />)}</div>
            </Section>
          )}
          <SellerNotes listing={listing} />
          <VerificationStatus data={data} />
          <TechSpecs vehicle={vehicle} />
          <NeoVerification check={data.check} rule={data.rule} listingResult={listing.neo_result} checkedAt={listing.neo_checked_at} />
          {data.inspections.length > 0 && <Inspections inspections={data.inspections} />}
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <SellerCard data={data} />
          {sold ? (
            <Alert tone="info" title="Automobile venduta">Questo annuncio non è più disponibile. Puoi cercare automobili simili.</Alert>
          ) : (
            <Suspense fallback={<Skeleton className="h-72 rounded-2xl" />}>
              <ListingContact listingId={listing.id} ownerId={listing.owner_id} slug={slug} title={listing.title} />
            </Suspense>
          )}
          {!sold && <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}><BookingBox listingId={listing.id} ownerId={listing.owner_id} slug={slug} /></Suspense>}
          {!sold && <CompareToggle slug={slug} title={name} className="self-start" />}
          {!sold && (
            <section className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-5 text-sm">
              <h2 className="font-bold">Servizi per questa auto</h2>
              <Link className="font-semibold text-orange-700 hover:underline" href={`/valuta-la-tua-auto?permuta=${listing.id}`}>Proponi una permuta con la tua auto</Link>
              <Link className="font-semibold text-orange-700 hover:underline" href={`/trasporto-auto/richiesta?annuncio=${listing.id}`}>Richiedi il trasporto dell&apos;auto</Link>
              <Link className="font-semibold text-orange-700 hover:underline" href="/valuta-la-tua-auto">Valuta la tua auto</Link>
              <Link className="font-semibold text-orange-700 hover:underline" href="/assicurazione-auto">Informazioni sull&apos;assicurazione</Link>
            </section>
          )}
          <div className="px-1"><ReportButton targetType="annuncio_auto" targetId={listing.id} targetLabel={listing.title} returnTo={`/auto/${slug}`} /></div>
        </aside>
      </Container>
      <Container className="mt-10">
        <Link href={`/auto-usate?marca=${vehicle.make_slug}`} className="font-semibold text-orange-700 hover:underline">Altre {vehicle.make_name} in vendita →</Link>
      </Container>
      <CompareBar />
    </div>
  );
}

function KeyFact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) {
  return (
    <li className="flex items-center gap-3 rounded-xl bg-mist p-3">
      <span className="text-orange-700 [&>svg]:size-5" aria-hidden>{icon}</span>
      <span className="flex flex-col"><span className="text-xs text-muted">{label}</span><span className="font-semibold">{value ?? "Non indicato"}</span></span>
    </li>
  );
}

function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="rounded-2xl border border-line bg-white p-6 shadow-card" aria-labelledby={id ? `${id}-t` : undefined}>
      <h2 id={id ? `${id}-t` : undefined} className="mb-4 text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function SpecList({ rows }: { rows: [string, string | null | undefined][] }) {
  const shown = rows.filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (shown.length === 0) return <p className="text-sm text-muted">Dati non forniti dal venditore.</p>;
  return (
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
      {shown.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 border-b border-line py-2 text-sm"><dt className="text-muted">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>
      ))}
    </dl>
  );
}

function TechSpecs({ vehicle: v }: { vehicle: ListingDetail extends null ? never : NonNullable<ListingDetail>["vehicle"] }) {
  const groups: { title: string; rows: [string, string | null][] }[] = [
    { title: "Motore", rows: [["Alimentazione", v.fuel ? FUEL_LABELS[v.fuel] : null], ["Cilindrata", v.engine_cc ? `${formatNumber(v.engine_cc)} cm³` : null], ["Classe emissioni", v.emission_class]] },
    { title: "Prestazioni", rows: [["Potenza", v.power_kw ? formatPower(v.power_kw) : null], ["Tara", v.tare_kg ? `${formatNumber(v.tare_kg)} kg` : null], ["Rapporto potenza/tara (documentato)", v.power_to_tare_documented ? `${v.power_to_tare_documented} kW/t` : null]] },
    { title: "Trasmissione", rows: [["Cambio", v.transmission ? TRANSMISSION_LABELS[v.transmission] : null]] },
    { title: "Dimensioni e caratteristiche", rows: [["Carrozzeria", v.body_type ? BODY_LABELS[v.body_type] : null], ["Porte", v.doors ? String(v.doors) : null], ["Posti", v.seats ? String(v.seats) : null], ["Colore", v.color]] },
    { title: "Consumi", rows: [["Consumo combinato", v.consumption_l100 ? `${v.consumption_l100} l/100 km` : null], ["Consumo elettrico", v.consumption_kwh100 ? `${v.consumption_kwh100} kWh/100 km` : null], ["Emissioni CO₂", v.co2_g_km ? `${v.co2_g_km} g/km` : null]] },
    { title: "Altre informazioni", rows: [["Condizione", CONDITION_LABELS[v.condition]], ["Prima immatricolazione", v.first_registration_date ? formatDate(v.first_registration_date) : null], ["Proprietari precedenti", v.owners_count !== null ? String(v.owners_count) : null], ["Codice variante", v.variant_code]] },
  ];
  return (
    <Section title="Caratteristiche tecniche" id="caratteristiche">
      <div className="flex flex-col gap-6">
        {groups.filter((g) => g.rows.some(([, val]) => val)).map((g) => (
          <div key={g.title}><h3 className="mb-2 font-semibold">{g.title}</h3><SpecList rows={g.rows} /></div>
        ))}
        {v.equipment && v.equipment.length > 0 && (
          <div>
            <h3 className="mb-2 font-semibold">Equipaggiamento</h3>
            <ul className="flex flex-wrap gap-2">{v.equipment.map((e) => <li key={e} className="rounded-full bg-mist px-3 py-1 text-sm">{e}</li>)}</ul>
          </div>
        )}
        <p className="text-xs text-muted">I dati non indicati non sono stati forniti dal venditore.</p>
      </div>
    </Section>
  );
}

function SellerNotes({ listing }: { listing: NonNullable<ListingDetail>["listing"] }) {
  const items: [string, string | null][] = [
    ["Condizioni", listing.condition_notes], ["Manutenzione documentata", listing.maintenance_notes],
    ["Interventi effettuati", listing.interventions_notes], ["Difetti conosciuti", listing.known_defects], ["Informazioni aggiuntive", listing.extra_info],
  ];
  const shown = items.filter(([, v]) => v);
  if (shown.length === 0) return null;
  return (
    <Section title="Dichiarazioni del venditore">
      <dl className="flex flex-col gap-4">
        {shown.map(([k, v]) => <div key={k}><dt className="font-semibold">{k}</dt><dd className="mt-1 whitespace-pre-line text-graphite">{v}</dd></div>)}
      </dl>
    </Section>
  );
}

function Inspections({ inspections }: { inspections: NonNullable<ListingDetail>["inspections"] }) {
  return (
    <Section title="Ispezione documentata" id="ispezione">
      {inspections.map((i) => (
        <div key={i.id} className="flex flex-col gap-3">
          <p className="text-sm text-graphite">Eseguita il {formatDate(i.inspected_on)} da {i.inspector_name}{i.mileage_km !== null && ` · ${formatKm(i.mileage_km)}`}.</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {[...i.inspection_items].sort((a, b) => a.position - b.position).map((it) => (
              <li key={it.item} className="flex items-start justify-between gap-3 rounded-lg bg-mist px-3 py-2 text-sm">
                <span>{it.item}{it.note && <span className="block text-xs text-muted">{it.note}</span>}</span>
                <Badge tone={it.result === "controllato" ? "success" : it.result === "da_monitorare" ? "warning" : it.result === "riparazione_consigliata" ? "danger" : "neutral"}>{it.result.replace(/_/g, " ")}</Badge>
              </li>
            ))}
          </ul>
          {i.observations && <p className="text-sm"><strong>Osservazioni:</strong> {i.observations}</p>}
          {i.recommended_repairs && <p className="text-sm"><strong>Interventi consigliati:</strong> {i.recommended_repairs}</p>}
          <p className="flex gap-2 text-xs text-muted"><ShieldAlert className="size-4 shrink-0" aria-hidden />L&apos;ispezione descrive lo stato rilevato in quella data e non è una garanzia sul veicolo.</p>
        </div>
      ))}
    </Section>
  );
}

function SellerCard({ data }: { data: NonNullable<ListingDetail> }) {
  const s = data.seller;
  const verified = s && (s.business_verified_at || s.identity_verified_at);
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="venditore-t">
      <h2 id="venditore-t" className="text-sm font-semibold tracking-wide text-muted uppercase">Venditore</h2>
      <div className="mt-3 flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-xl bg-ink text-white">{s ? <Building2 className="size-6" aria-hidden /> : <User className="size-6" aria-hidden />}</span>
        <div className="min-w-0">
          <p className="truncate font-bold">{s ? s.display_name : "Venditore privato"}</p>
          <p className="text-sm text-muted">{s ? "Professionista" : "Privato"} · {[s?.city ?? data.listing.city].filter(Boolean).join("")}</p>
        </div>
      </div>
      {verified && <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-success"><BadgeCheck className="size-4" aria-hidden /> {s?.business_verified_at ? "Attività verificata da AutoGarage24" : "Identità verificata"}</p>}
      {s && <Link href={`/professionisti/${s.slug}`} className="mt-3 block text-sm font-semibold text-orange-700 hover:underline">Profilo e altri annunci →</Link>}
      {data.reputation && data.reputation.count > 0 && <p className="mt-2 text-sm">★ {String(data.reputation.average).replace(".", ",")} · {data.reputation.count} recensioni verificate del venditore</p>}
      {data.listing.published_at && <p className="mt-3 text-xs text-muted">Pubblicato il {formatDate(data.listing.published_at)}</p>}
    </section>
  );
}

function vehicleJsonLd(data: NonNullable<ListingDetail>, slug: string) {
  const { listing, vehicle: v, images } = data;
  return {
    "@context": "https://schema.org",
    "@type": "Car",
    name: `${v.make_name} ${v.model}${v.version ? ` ${v.version}` : ""}`,
    brand: { "@type": "Brand", name: v.make_name },
    model: v.model,
    vehicleModelDate: v.year ? String(v.year) : undefined,
    mileageFromOdometer: v.mileage_km !== null ? { "@type": "QuantitativeValue", value: v.mileage_km, unitCode: "KMT" } : undefined,
    fuelType: v.fuel ? FUEL_LABELS[v.fuel] : undefined,
    vehicleTransmission: v.transmission ? TRANSMISSION_LABELS[v.transmission] : undefined,
    image: images.map((i) => publicFileUrl("listing-images", i.storage_path)).filter(Boolean),
    url: `${getSiteUrl()}/auto/${slug}`,
    offers: {
      "@type": "Offer",
      price: listing.price_cents !== null ? (listing.price_cents / 100).toFixed(2) : undefined,
      priceCurrency: listing.currency ?? "EUR",
      availability: listing.status === "pubblicato" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      itemCondition: v.condition === "nuovo" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
    },
  };
}

const VERIF_LABELS: Record<string, string> = { documentazione: "Documentazione verificata", identita_venditore: "Identità del venditore verificata", dati_tecnici: "Dati tecnici verificati" };

/** Stato di verifica: solo verifiche documentate dallo staff. Nessuna dichiarazione automatica su incidenti o guasti. */
function VerificationStatus({ data }: { data: NonNullable<ListingDetail> }) {
  const active = new Map(data.verifications.map((v) => [v.kind, v.verified_at]));
  const ph = data.priceHistory;
  return (
    <Section title="Stato di verifica dell'annuncio" id="verifiche">
      <ul className="grid gap-2 sm:grid-cols-3">
        {Object.entries(VERIF_LABELS).map(([k, l]) => (
          <li key={k} className={`rounded-xl border p-3 text-sm ${active.has(k) ? "border-success/40 bg-success-50" : "border-line"}`}>
            <p className="font-semibold">{active.has(k) ? "✓ " : ""}{l.replace(" verificata", "").replace(" verificati", "")}</p>
            <p className="text-xs text-muted">{active.has(k) ? `Verificato dallo staff il ${formatDate(active.get(k)!)}` : "Non verificato"}</p>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">L&apos;annuncio è stato controllato dallo staff prima della pubblicazione. Le verifiche indicate riguardano solo i documenti esaminati: AutoGarage24 non certifica l&apos;assenza di incidenti o di problemi meccanici.</p>
      {ph.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold">Variazioni di prezzo</p>
          <ul className="text-sm">{ph.map((h, i) => <li key={i}>{formatDate(h.changed_at)}: {formatPrice(h.old_cents)} → <strong>{formatPrice(h.new_cents)}</strong></li>)}</ul>
        </div>
      )}
    </Section>
  );
}
