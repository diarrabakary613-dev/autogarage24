import type { Metadata } from "next";
import { seoMetadata } from "@/lib/seo/overrides";
import { Suspense } from "react";
import { LocateButton } from "@/components/maps/locate-button";
import { SmartMap, type SmartPoint } from "@/components/maps/smart-map";
import { Alert, Container, Skeleton } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/marketing/page-hero";
import { createPublicClient } from "@/lib/supabase/public";
import { geocodeItaly } from "@/lib/geo/geocode";
import { publicFileUrl } from "@/lib/storage";
import { formatKm, formatPrice } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/mappa", {
  title: "Mappa: officine, meccanici, auto e ricambi vicino a te",
  description: "Mappa interattiva di AutoGarage24 a Milano: officine, meccanici, concessionari, ricambi e auto per neopatentati, con filtri per distanza, servizio, marca, prezzo e valutazione.",
  alternates: { canonical: "/mappa" },
});
}

const KINDS = { officina: "Officine", meccanico: "Meccanici", venditore_auto: "Concessionari e venditori", venditore_ricambi: "Venditori di ricambi", auto: "Automobili", ricambio: "Ricambi" } as const;
type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export default function MapPage(props: PageProps<"/mappa">) {
  return (
    <Container className="flex flex-col gap-5 py-8">
      <Breadcrumbs items={[{ name: "Mappa", href: "/mappa" }]} />
      <div>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Trova vicino a te</h1>
        <p className="mt-1 max-w-3xl text-muted">Officine, meccanici, concessionari, ricambi e automobili su un&apos;unica mappa. Condividere la posizione è facoltativo: puoi cercare per città o CAP.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-[70vh]" />}><MapResults searchParams={props.searchParams} /></Suspense>
    </Container>
  );
}

async function MapResults({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const neo = one(sp.neo) === "1";
  const raw = Array.isArray(sp.tipo) ? sp.tipo : sp.tipo ? [sp.tipo] : [];
  const kinds = neo ? ["auto"] : raw.filter((k) => k in KINDS).length ? raw.filter((k) => k in KINDS) : ["officina", "meccanico", "venditore_auto", "venditore_ricambi"];
  const lat = Number(one(sp.lat)), lng = Number(one(sp.lng));
  const hasPos = one(sp.lat) !== undefined && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const radius = [2, 5, 10, 15, 25, 50].includes(Number(one(sp.raggio))) ? Number(one(sp.raggio)) : 15;
  const city = one(sp.citta)?.slice(0, 80);
  const cap = one(sp.cap)?.match(/^\d{5}$/) ? one(sp.cap) : undefined;
  const category = one(sp.categoria)?.match(/^[a-z0-9-]{2,40}$/) ? one(sp.categoria) : undefined;
  const brand = one(sp.marca)?.toLowerCase().replace(/[^a-z0-9 -]/g, "").slice(0, 40) || undefined;
  const priceMax = Number(one(sp.prezzo_max));
  const minRating = [3, 4, 4.5].includes(Number(one(sp.valutazione))) ? Number(one(sp.valutazione)) : undefined;
  const available = one(sp.disponibili) === "1";

  // Centro della ricerca: posizione dell'utente (arrotondata, solo su consenso) oppure città/CAP geocodificati.
  let center: { lat: number; lng: number; label: string } | null = hasPos ? { lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100, label: "La tua posizione (approssimata)" } : null;
  let geocodeFailed = false;
  if (!center && (cap || city)) {
    const g = await geocodeItaly(cap ? `${cap} ${city ?? ""}` : `${city}`);
    if (g) center = { ...g, label: `Centro di ${g.label}` }; else geocodeFailed = true;
  }
  const supabase = createPublicClient();
  const [{ data, error }, { data: cats }] = supabase ? await Promise.all([
    supabase.rpc("map_search", {
      p_kinds: kinds, p_lat: center?.lat, p_lng: center?.lng, p_radius_km: radius, p_city: center ? undefined : city, p_postal_code: center ? undefined : cap,
      p_category: category, p_brand: brand, p_price_max_cents: Number.isFinite(priceMax) && priceMax > 0 ? Math.round(priceMax * 100) : undefined,
      p_min_rating: minRating, p_only_available: available, p_neo_only: neo, p_limit: 200,
    }),
    supabase.from("business_categories").select("slug, name").eq("active", true).order("position"),
  ]) : [{ data: null, error: true }, { data: [] }];
  const base: Record<string, string> = { officina: "/garages", meccanico: "/meccanici", venditore_auto: "/professionisti", venditore_ricambi: "/venditori-ricambi", auto: "/auto", ricambio: "/ricambi" };
  const points: SmartPoint[] = (data ?? []).map((r) => {
    const href = `${base[r.kind]}/${r.slug}`;
    const isPro = !["auto", "ricambio"].includes(r.kind);
    return {
      id: `${r.kind}-${r.id}`, kind: r.kind, name: r.name, href,
      contactHref: isPro ? `${href}#contatta` : href,
      lat: r.latitude, lng: r.longitude, approximate: r.approximate, city: r.city, address: r.address, distanceKm: r.distance_km,
      rating: r.rating_avg, reviews: Number(r.review_count ?? 0),
      photo: r.photo_bucket && r.photo_path ? publicFileUrl(r.photo_bucket as "listing-images" | "business-media", r.photo_path) : null,
      subtitle: r.subtitle, price: r.price_cents ? formatPrice(r.price_cents) : null,
      meta: r.kind === "auto" ? [r.year, r.mileage_km !== null ? formatKm(r.mileage_km) : null, r.neo_result === "compatibile" ? "Compatibile neopatentati" : null].filter(Boolean).join(" · ") : r.accepts_appointments ? "Accetta appuntamenti" : null,
      directions: r.address && !r.approximate ? `https://www.openstreetmap.org/directions?to=${r.latitude}%2C${r.longitude}` : null,
    };
  });
  const sel = (k: string) => kinds.includes(k);
  return (
    <div className="flex flex-col gap-4">
      <form method="get" className="grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-card md:grid-cols-4" role="search" aria-label="Filtri della mappa">
        <fieldset className="md:col-span-4"><legend className="mb-1 text-sm font-semibold">Cosa cerchi</legend>
          <div className="flex flex-wrap gap-2">{Object.entries(KINDS).map(([k, l]) => (
            <label key={k} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-sm has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white">
              <input type="checkbox" name="tipo" value={k} defaultChecked={!neo && sel(k)} className="sr-only" />{l}
            </label>
          ))}
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-orange px-3 py-1.5 text-sm font-semibold has-[:checked]:bg-orange">
              <input type="checkbox" name="neo" value="1" defaultChecked={neo} className="sr-only" />Auto per neopatentati vicino a te
            </label>
          </div>
        </fieldset>
        <Field id="m-c" label="Città" optional><Input id="m-c" name="citta" defaultValue={city ?? ""} placeholder="Es. Milano" /></Field>
        <Field id="m-cap" label="CAP" optional><Input id="m-cap" name="cap" defaultValue={cap ?? ""} inputMode="numeric" maxLength={5} /></Field>
        <Field id="m-r" label="Raggio"><Select id="m-r" name="raggio" defaultValue={String(radius)}>{[2, 5, 10, 15, 25, 50].map((r) => <option key={r} value={r}>{r} km</option>)}</Select></Field>
        <Field id="m-cat" label="Tipologia di servizio" optional><Select id="m-cat" name="categoria" defaultValue={category ?? ""}><option value="">Tutte</option>{(cats ?? []).map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</Select></Field>
        <Field id="m-ma" label="Marca automobilistica" optional><Input id="m-ma" name="marca" defaultValue={brand ?? ""} placeholder="Es. fiat" /></Field>
        <Field id="m-p" label="Prezzo massimo (€)" optional hint="Per auto e ricambi"><Input id="m-p" name="prezzo_max" inputMode="numeric" defaultValue={Number.isFinite(priceMax) && priceMax > 0 ? String(priceMax) : ""} /></Field>
        <Field id="m-v" label="Valutazione minima" optional><Select id="m-v" name="valutazione" defaultValue={minRating ? String(minRating) : ""}><option value="">Qualsiasi</option><option value="3">3+</option><option value="4">4+</option><option value="4.5">4,5+</option></Select></Field>
        <div className="flex flex-col justify-end gap-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="disponibili" value="1" defaultChecked={available} className="accent-orange" /> Solo disponibili (appuntamenti / ricambi in stock)</label>
          {hasPos && <><input type="hidden" name="lat" value={center!.lat} /><input type="hidden" name="lng" value={center!.lng} /></>}
        </div>
        <div className="flex flex-wrap items-center gap-3 md:col-span-4">
          <Button type="submit" data-track="cta" data-track-label="Cerca sulla mappa">Cerca</Button>
          <LocateButton />
        </div>
      </form>
      {neo && <Alert tone="info">Modalità neopatentati: mostriamo solo auto con esito «compatibile» calcolato da potenza e tara secondo il Codice della strada, non auto dichiarate adatte dal venditore. Verifica sempre il libretto prima dell&apos;acquisto.</Alert>}
      {geocodeFailed && <Alert tone="warning">Non siamo riusciti a localizzare «{cap ?? city}»: mostriamo i risultati con quella città o CAP, senza distanze.</Alert>}
      {error ? <Alert tone="error">Ricerca non disponibile al momento.</Alert> : !points.length ? (
        <Alert tone="info">Nessun risultato con questi filtri. AutoGarage24 è in fase di lancio a Milano: prova ad ampliare il raggio o a cambiare i filtri.</Alert>
      ) : (
        <>
          <p className="text-sm text-muted">{points.length} risultati{center ? ` entro ${radius} km da: ${center.label}` : ""}. Distanze calcolate solo quando la posizione è nota.</p>
          <SmartMap points={points} center={center} />
        </>
      )}
    </div>
  );
}
