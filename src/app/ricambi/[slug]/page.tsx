import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { Suspense } from "react";
import { BadgeCheck, CheckCircle2, HelpCircle, LogIn, MessageSquare, Search } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Container, Skeleton } from "@/components/ui/feedback";
import { Field, Textarea } from "@/components/ui/form";
import { Breadcrumbs } from "@/components/marketing/page-hero";
import { JsonLd } from "@/components/marketing/json-ld";
import { Gallery } from "@/components/marketplace/gallery";
import { FavoriteButton } from "@/components/marketplace/favorite-button";
import { RequestForm } from "@/components/requests/request-form";
import { ReportButton } from "@/components/reports/report-button";
import { getPublicPart } from "@/lib/data/part-detail";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { startConversation } from "@/lib/actions/requests";
import { checkPartCompatibility, type PartCompatibilityRow } from "@/lib/parts/compatibility";
import { formatPrice } from "@/lib/format";
import { PART_CONDITION_LABELS } from "@/lib/labels";
import { publicFileUrl } from "@/lib/storage";
import { getSiteUrl } from "@/lib/env";
import { findBrand } from "@/config/brands";

const DELIVERY: Record<string, string> = { ritiro: "Ritiro presso il venditore", spedizione: "Spedizione", consegna_locale: "Consegna locale" };
const BASIS: Record<string, string> = { dichiarazione_venditore: "dichiarata dal venditore", codice_oem: "basata su codice OEM", catalogo_produttore: "confermata su catalogo del produttore" };

export async function generateMetadata(props: PageProps<"/ricambi/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const d = await getPublicPart(slug);
  if (!d) notFound();
  const p = d.part;
  const title = `${p.title}${p.oem_code ? ` — OEM ${p.oem_code}` : ""} · ${formatPrice(p.price_cents)}`;
  const description = `${p.title} ${PART_CONDITION_LABELS[p.condition].toLowerCase()}${p.manufacturer_brand ? ` ${p.manufacturer_brand}` : ""}${p.city ? ` a ${p.city}` : ""}. Verifica la compatibilità e contatta il venditore su AutoGarage24.`;
  const img = publicFileUrl("listing-images", d.images[0]?.storage_path);
  return { title, description, alternates: { canonical: `/ricambi/${slug}` }, robots: p.status === "pubblicato" ? undefined : { index: false }, openGraph: { title, description, images: img ? [{ url: img }] : undefined } };
}

export default function PartPage(props: PageProps<"/ricambi/[slug]">) {
  return <Suspense fallback={<div className="bg-mist pb-16"><Container className="pt-10"><Skeleton className="h-[600px] rounded-2xl" /></Container></div>}><PartDetailView params={props.params} /></Suspense>;
}

async function PartDetailView({ params }: { params: PageProps<"/ricambi/[slug]">["params"] }) {
  const { slug } = await params;
  const d = await getPublicPart(slug);
  if (!d) notFound();
  const p = d.part;
  after(async () => { await createPublicClient()?.rpc("track_part_view", { part_slug: slug }); });
  const compat = (p.part_compatibility ?? []) as PartCompatibilityRow[];
  const cat = p.part_categories as unknown as { name: string; slug: string } | null;
  const soldOut = p.status === "esaurito";
  return (
    <div className="bg-mist pb-16">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Product", name: p.title, sku: p.manufacturer_code ?? undefined, mpn: p.oem_code ?? undefined, brand: p.manufacturer_brand ? { "@type": "Brand", name: p.manufacturer_brand } : undefined, image: d.images.map((i) => publicFileUrl("listing-images", i.storage_path)).filter(Boolean), url: `${getSiteUrl()}/ricambi/${slug}`, offers: p.price_cents !== null ? { "@type": "Offer", price: (p.price_cents / 100).toFixed(2), priceCurrency: "EUR", availability: soldOut ? "https://schema.org/OutOfStock" : "https://schema.org/InStock", itemCondition: p.condition === "nuovo" ? "https://schema.org/NewCondition" : p.condition === "ricondizionato" ? "https://schema.org/RefurbishedCondition" : "https://schema.org/UsedCondition" } : undefined }} />
      <Container className="pt-6"><Breadcrumbs items={[{ name: "Ricambi", href: "/ricambi" }, ...(cat ? [{ name: cat.name, href: `/ricambi?categoria=${cat.slug}` }] : []), { name: p.title, href: `/ricambi/${slug}` }]} /></Container>
      <Container className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Gallery alt={p.title} images={d.images.map((i) => ({ id: i.id, url: publicFileUrl("listing-images", i.storage_path)! })).filter((i) => i.url)} />
          <section className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <div className="flex flex-wrap gap-2"><Badge tone="dark">{PART_CONDITION_LABELS[p.condition]}</Badge>{soldOut && <Badge tone="danger">Esaurito</Badge>}{cat && <Badge tone="neutral">{cat.name}</Badge>}</div>
            <h1 className="mt-3 text-3xl font-extrabold">{p.title}</h1>
            <p className="mt-2 text-3xl font-extrabold">{formatPrice(p.price_cents)}</p>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              {[["Marca produttore", p.manufacturer_brand], ["Codice OEM", p.oem_code], ["Codice prodotto", p.manufacturer_code], ["Disponibilità dichiarata", soldOut ? "Esaurito" : p.quantity !== null ? `${p.quantity} pezzi` : "Disponibile (quantità non indicata)"], ["Località", [p.city, p.province].filter(Boolean).join(" ")]]
                .filter(([, v]) => v).map(([k, v]) => <div key={k} className="flex justify-between border-b border-line py-1.5"><dt className="text-muted">{k}</dt><dd className="font-semibold">{v}</dd></div>)}
            </dl>
            {p.description && <p className="mt-4 whitespace-pre-line text-graphite">{p.description}</p>}
            {p.condition === "ricondizionato" && p.refurbishment_notes && <p className="mt-3 text-sm"><strong>Ricondizionamento dichiarato:</strong> {p.refurbishment_notes}</p>}
            {p.warranty_text && <p className="mt-3 text-sm"><strong>Garanzia indicata dal venditore:</strong> {p.warranty_text}</p>}
            {(p.delivery_options?.length ?? 0) > 0 && <p className="mt-3 text-sm"><strong>Consegna:</strong> {p.delivery_options.map((o) => DELIVERY[o] ?? o).join(", ")}</p>}
            {p.shipping_info && <p className="mt-1 text-sm"><strong>Spedizione e ritiro:</strong> {p.shipping_info}</p>}
            <p className="mt-1 text-sm"><strong>Disponibilità:</strong> {p.quantity === null ? "da chiedere al venditore" : p.quantity > 0 ? `${p.quantity} ${p.quantity === 1 ? "pezzo" : "pezzi"}` : "esaurito"}</p>
          </section>
          <section className="rounded-2xl border border-line bg-white p-6 shadow-card" aria-labelledby="comp-t">
            <h2 id="comp-t" className="mb-3 text-xl font-bold">Compatibilità</h2>
            {compat.length === 0 ? <p className="text-sm text-muted">Il venditore non ha indicato automobili compatibili: chiedi conferma prima dell&apos;acquisto, indicando il codice del pezzo originale.</p> : (
              <ul className="flex flex-col gap-2 text-sm">
                {compat.map((c, i) => <li key={i} className="rounded-lg bg-mist p-3"><strong>{findBrand(c.make_slug)?.name ?? c.make_slug} {c.model}</strong>{c.version && ` ${c.version}`}{(c.year_from || c.year_to) && ` · ${c.year_from ?? "…"}–${c.year_to ?? "…"}`}{c.engine_code && ` · motore ${c.engine_code}`}{c.engine && ` (${c.engine})`}<span className="block text-xs text-muted">Compatibilità {BASIS[c.basis]}</span></li>)}
              </ul>
            )}
            <Suspense fallback={<Skeleton className="mt-4 h-20" />}><MyCarCheck rows={compat} slug={slug} /></Suspense>
          </section>
        </div>
        <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">Venditore</h2>
            <p className="mt-2 font-bold">{d.seller ? d.seller.display_name : "Venditore privato"}</p>
            {d.seller?.business_verified_at && <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-success"><BadgeCheck className="size-4" aria-hidden /> Attività verificata</p>}
            {d.seller && <Link href={`/venditori-ricambi/${d.seller.slug}`} className="mt-2 block text-sm font-semibold text-orange-700 hover:underline">Profilo e altri ricambi →</Link>}
          </section>
          {soldOut ? <Alert tone="info">Il ricambio risulta esaurito: puoi comunque scrivere al venditore per sapere se tornerà disponibile.</Alert> : null}
          <Suspense fallback={<Skeleton className="h-72 rounded-2xl" />}><PartContact id={p.id} ownerId={p.owner_id} slug={slug} title={p.title} code={p.oem_code} sellerProfile={p.professional_profile_id} /></Suspense>
          <div className="px-1"><ReportButton targetType="ricambio" targetId={p.id} targetLabel={p.title} returnTo={`/ricambi/${slug}`} /></div>
        </aside>
      </Container>
    </div>
  );
}

async function MyCarCheck({ rows, slug }: { rows: PartCompatibilityRow[]; slug: string }) {
  const user = await getCurrentUser();
  if (!user) return <p className="mt-4 text-sm text-muted"><Link className="font-semibold text-orange-700 underline" href={`/accedi?next=/ricambi/${slug}`}>Accedi</Link> per verificare con le automobili del tuo garage virtuale.</p>;
  const supabase = await createClient();
  const { data: vehicles } = await supabase.from("user_vehicles").select("id, make_slug, make, model, version, year, engine_code").is("deleted_at", null);
  if (!vehicles?.length) return <p className="mt-4 text-sm text-muted">Aggiungi la tua auto nel <Link className="font-semibold text-orange-700 underline" href="/dashboard/garage-auto">garage virtuale</Link> per verificare la compatibilità.</p>;
  return (
    <ul className="mt-4 flex flex-col gap-2">
      {vehicles.map((v) => {
        const r = checkPartCompatibility(rows, { make_slug: v.make_slug, model: v.model, version: v.version, year: v.year, engine_code: v.engine_code });
        const box = r.result === "verificata" ? "border-success/30 bg-success-50" : r.result === "potenziale" ? "border-warning/30 bg-warning-50" : "border-line bg-mist";
        return (
          <li key={v.id} className={`flex gap-3 rounded-xl border p-3 text-sm ${box}`}>
            {r.result === "verificata" ? <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden /> : <HelpCircle className="size-5 shrink-0 text-warning" aria-hidden />}
            <span><strong>{v.make} {v.model} {v.year ?? ""}: {r.result === "verificata" ? "compatibilità verificata" : r.result === "potenziale" ? "compatibilità potenziale" : "compatibilità da verificare"}</strong><span className="block text-graphite">{r.reason}</span></span>
          </li>
        );
      })}
      <li className="text-xs text-muted">L&apos;esito si basa sui dati forniti dal venditore e su quelli della tua auto. Prima dell&apos;acquisto verifica con il venditore o con un professionista.</li>
    </ul>
  );
}

async function PartContact({ id, ownerId, slug, title, code, sellerProfile }: { id: string; ownerId: string; slug: string; title: string; code: string | null; sellerProfile: string | null }) {
  const user = await getCurrentUser();
  const here = `/ricambi/${slug}`;
  if (!user) return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 shadow-card">
      <h2 className="text-lg font-bold">Ti interessa questo ricambio?</h2>
      <ButtonLink href={`/accedi?next=${encodeURIComponent(here)}`} icon={<LogIn className="size-4" aria-hidden />}>Accedi per contattare il venditore</ButtonLink>
    </section>
  );
  if (user.id === ownerId) return <section className="rounded-2xl border border-line bg-white p-5 shadow-card"><p className="font-bold">È un tuo ricambio</p><ButtonLink href="/dashboard/ricambi" variant="outline" className="mt-2">Gestisci i ricambi</ButtonLink></section>;
  const supabase = await createClient();
  const [{ data: fav }, { data: vehicles }] = await Promise.all([
    supabase.from("favorites").select("id").eq("part_id", id).maybeSingle(),
    supabase.from("user_vehicles").select("id, make, model, year").is("deleted_at", null).order("is_primary", { ascending: false }),
  ]);
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 shadow-card">
      <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Contatta il venditore</h2><FavoriteButton kind="part" id={id} initial={Boolean(fav)} label={title} /></div>
      <details className="rounded-xl border border-line" open>
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 font-semibold"><Search className="size-4 text-orange-700" aria-hidden /> Informazioni o preventivo</summary>
        <div className="border-t border-line p-4">
          <RequestForm kinds={[{ value: "info_ricambio", label: "Richiedi informazioni" }, { value: "preventivo_ricambio", label: "Richiedi preventivo" }]} target={{ part_id: id }} showVehicle showPartCode
            vehicles={(vehicles ?? []).map((v) => ({ id: v.id, label: `${v.make} ${v.model} ${v.year ?? ""}` }))}
            defaultSubject={`Ricambio: ${title}`.slice(0, 200)} defaultMessage={`Buongiorno, vorrei sapere se questo ricambio${code ? ` (codice ${code})` : ""} è compatibile con la mia automobile e se è disponibile.`} returnTo={here} />
        </div>
      </details>
      {sellerProfile && (
        <details className="rounded-xl border border-line">
          <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 font-semibold"><MessageSquare className="size-4 text-orange-700" aria-hidden /> Messaggio al venditore</summary>
          <div className="border-t border-line p-4"><ActionForm action={startConversation} submitLabel="Invia" hidden={{ professional_profile_id: sellerProfile, return_to: here }}><Field id="pm" label="Messaggio"><Textarea id="pm" name="message" rows={3} /></Field></ActionForm></div>
        </details>
      )}
      <p className="text-xs text-muted">Nessun pagamento avviene su AutoGarage24. Un messaggio o un preventivo non costituiscono una vendita conclusa.</p>
    </section>
  );
}
