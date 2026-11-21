import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { Suspense } from "react";
import { CalendarClock, MapPin, ShieldCheck } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Container, Skeleton } from "@/components/ui/feedback";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Breadcrumbs } from "@/components/marketing/page-hero";
import { JsonLd } from "@/components/marketing/json-ld";
import { getSiteUrl } from "@/lib/env";
import { FavoriteButton } from "@/components/marketplace/favorite-button";
import { ReportButton } from "@/components/reports/report-button";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { claimOffer } from "@/lib/actions/offers";
import { startConversation } from "@/lib/actions/requests";
import { publicFileUrl } from "@/lib/storage";
import { formatPrice } from "@/lib/format";
import { formatDate } from "@/lib/utils";
import { NEO_TOPICS, OFFER_CATEGORIES, discountPct } from "@/lib/offers/labels";

export async function generateMetadata(props: PageProps<"/offerte/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const pub = /^[a-z0-9-]{2,160}$/.test(slug) ? createPublicClient() : null;
  const { data: o } = pub ? await pub.from("promotional_offers").select("title, description, status, ends_on, image_path").eq("slug", slug).maybeSingle() : { data: null };
  if (!o) return { title: "Offerta non trovata", robots: { index: false } };
  const live = o.status === "pubblicata" && o.ends_on >= new Date().toISOString().slice(0, 10);
  const img = publicFileUrl("business-media", o.image_path);
  return {
    title: o.title, description: o.description.slice(0, 155), alternates: { canonical: `/offerte/${slug}` },
    openGraph: { title: o.title, description: o.description.slice(0, 155), images: img ? [{ url: img }] : undefined },
    robots: live ? undefined : { index: false, follow: true },
  };
}
const BASE: Record<string, string> = { officina: "/garages", meccanico: "/meccanici", venditore_ricambi: "/venditori-ricambi" };

export default function OfferPage(props: PageProps<"/offerte/[slug]">) {
  return <Suspense fallback={<Container className="py-10"><Skeleton className="h-96" /></Container>}><Offer params={props.params} /></Suspense>;
}

async function Offer({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{2,160}$/.test(slug)) notFound();
  const pub = createPublicClient();
  if (!pub) notFound();
  const { data: o } = await pub.from("promotional_offers").select("*, professional_profiles(id, slug, display_name, city, professional_type, business_verified_at)").eq("slug", slug).maybeSingle();
  if (!o) notFound();
  after(async () => { await createPublicClient()?.rpc("track_offer", { offer_slug: slug, is_click: false }); });
  const p = o.professional_profiles as unknown as { id: string; slug: string; display_name: string; city: string | null; professional_type: string; business_verified_at: string | null };
  const user = await getCurrentUser();
  const fav = user ? (await (await createClient()).from("favorites").select("id").eq("offer_id", o.id).maybeSingle()).data : null;
  const img = publicFileUrl("business-media", o.image_path);
  const pct = discountPct(o.original_price_cents, o.promo_price_cents);
  const here = `/offerte/${slug}`;
  const left = o.quantity_total !== null ? o.quantity_total - o.quantity_claimed : null;
  return (
    <Container className="flex flex-col gap-6 py-8">
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "Offer", name: o.title, description: o.description, url: `${getSiteUrl()}${here}`,
        price: (o.promo_price_cents / 100).toFixed(2), priceCurrency: "EUR", validFrom: o.starts_on, priceValidUntil: o.ends_on,
        availability: o.status === "pubblicata" && (left === null || left > 0) ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
        image: img ?? undefined, seller: { "@type": "LocalBusiness", name: p.display_name, address: p.city ? { "@type": "PostalAddress", addressLocality: p.city, addressCountry: "IT" } : undefined },
      }} />
      <Breadcrumbs items={[{ name: "Offerte", href: "/offerte" }, { name: o.title, href: here }]} />
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-5">
          {img && <div className="overflow-hidden rounded-2xl bg-ink">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt={o.title} className="aspect-[16/9] w-full object-cover" /></div>}
          <div className="flex flex-wrap gap-2"><Badge tone="orange">{OFFER_CATEGORIES[o.category as keyof typeof OFFER_CATEGORIES]}</Badge>{o.neo_topic && <Badge tone="dark">Neopatentati · {NEO_TOPICS[o.neo_topic as keyof typeof NEO_TOPICS]}</Badge>}</div>
          <h1 className="text-3xl font-extrabold">{o.title}</h1>
          <p className="whitespace-pre-line text-graphite">{o.description}</p>
          <section className="rounded-2xl border border-line bg-white p-5"><h2 className="mb-2 font-bold">Condizioni dell&apos;offerta</h2><p className="whitespace-pre-line text-sm">{o.conditions}</p></section>
          <ReportButton targetType="offerta" targetId={o.id} targetLabel={o.title} returnTo={here} />
        </div>
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <p className="flex items-baseline gap-3"><span className="text-3xl font-extrabold">{formatPrice(o.promo_price_cents)}</span><span className="text-muted line-through">{formatPrice(o.original_price_cents)}</span>{pct !== null && <Badge tone="orange">−{pct}%</Badge>}</p>
            <p className="mt-1 text-xs text-muted">Prezzi indicati dal partner e controllati in moderazione; sconto calcolato automaticamente.</p>
            <p className="mt-3 flex items-center gap-2 text-sm"><CalendarClock className="size-4" aria-hidden />Dal {formatDate(o.starts_on)} al {formatDate(o.ends_on)}</p>
            {left !== null && <p className="text-sm">{left > 0 ? `${left} disponibili` : "Esaurita"}</p>}
            <div className="mt-4 flex items-center justify-between"><span className="text-sm font-semibold">Salva tra i preferiti</span><FavoriteButton kind="offer" id={o.id} initial={Boolean(fav)} label={o.title} /></div>
            <hr className="my-4 border-line" />
            {o.status === "pubblicata" ? (
              <ActionForm action={claimOffer} submitLabel={user ? "Richiedi l'offerta" : "Accedi per richiederla"} hidden={{ offer_id: o.id, return_to: here }}>
                <div className="grid gap-3">
                  <Field id="cl-c" label="Codice coupon" optional><Input id="cl-c" name="coupon" maxLength={24} autoCapitalize="characters" /></Field>
                  <Field id="cl-m" label="Messaggio al partner" optional><Textarea id="cl-m" name="message" rows={2} placeholder="Es. disponibilità, modello dell'auto" /></Field>
                  <p className="text-xs text-muted">Riceverai un codice personale. È una prenotazione, non un acquisto: il partner conferma disponibilità e condizioni.</p>
                </div>
              </ActionForm>
            ) : <Alert tone="info">Questa offerta non è più disponibile.</Alert>}
          </div>
          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="text-sm text-muted">Offerta di</p>
            <p className="flex items-center gap-2 font-bold">{BASE[p.professional_type] ? <Link className="underline" href={`${BASE[p.professional_type]}/${p.slug}`}>{p.display_name}</Link> : p.display_name}{p.business_verified_at && <ShieldCheck className="size-4 text-success" aria-label="Attività verificata" />}</p>
            <p className="flex items-center gap-1 text-sm text-muted"><MapPin className="size-3.5" aria-hidden />{o.city ?? p.city ?? "—"}</p>
            <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-orange-700">Contatta il partner</summary>
              <ActionForm action={startConversation} submitLabel="Invia messaggio" size="sm" hidden={{ professional_profile_id: p.id, return_to: here }} className="mt-2">
                <Field id="cp-m" label="Messaggio"><Textarea id="cp-m" name="message" rows={3} defaultValue={`Buongiorno, vorrei informazioni sull'offerta «${o.title}».`} /></Field>
              </ActionForm>
            </details>
          </div>
        </aside>
      </div>
    </Container>
  );
}
