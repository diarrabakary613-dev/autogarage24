import { Suspense } from "react";
import { LocateButton } from "@/components/maps/locate-button";
import { Alert, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { OfferCard, type OfferCardData } from "./offer-card";
import { createPublicClient } from "@/lib/supabase/public";
import { geocodeItaly } from "@/lib/geo/geocode";
import { OFFER_CATEGORIES } from "@/lib/offers/labels";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export function OfferSearch({ searchParams, neo = false, base }: { searchParams: Promise<SP>; neo?: boolean; base: string }) {
  return <Suspense fallback={<Skeleton className="h-96" />}><Results searchParams={searchParams} neo={neo} base={base} /></Suspense>;
}

async function Results({ searchParams, neo, base }: { searchParams: Promise<SP>; neo: boolean; base: string }) {
  const sp = await searchParams;
  const cat = one(sp.categoria) && one(sp.categoria)! in OFFER_CATEGORIES ? one(sp.categoria) : undefined;
  const city = one(sp.citta)?.slice(0, 80);
  const radius = [5, 10, 25, 50].includes(Number(one(sp.raggio))) ? Number(one(sp.raggio)) : 25;
  const lat = Number(one(sp.lat)), lng = Number(one(sp.lng));
  let center = one(sp.lat) !== undefined && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  let geoFail = false;
  if (!center && city) { const g = await geocodeItaly(city); if (g) center = g; else geoFail = true; }
  const supabase = createPublicClient();
  const { data, error } = supabase
    ? await supabase.rpc("search_offers", { p_lat: center?.lat, p_lng: center?.lng, p_radius_km: radius, p_city: center ? undefined : city, p_category: cat, p_neo: neo, p_limit: 60 })
    : { data: null, error: true };
  const items = (data ?? []) as OfferCardData[];
  return (
    <div className="flex flex-col gap-5">
      <form method="get" action={base} className="grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-card sm:grid-cols-4" role="search" aria-label="Filtra le offerte">
        <Field id="of-c" label="Categoria" optional><Select id="of-c" name="categoria" defaultValue={cat ?? ""}><option value="">Tutte</option>{Object.entries(OFFER_CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
        <Field id="of-ci" label="Città" optional><Input id="of-ci" name="citta" defaultValue={city ?? ""} placeholder="Es. Milano" /></Field>
        <Field id="of-r" label="Raggio"><Select id="of-r" name="raggio" defaultValue={String(radius)}>{[5, 10, 25, 50].map((r) => <option key={r} value={r}>{r} km</option>)}</Select></Field>
        <div className="flex flex-wrap items-end gap-2">
          {center && one(sp.lat) && <><input type="hidden" name="lat" value={lat} /><input type="hidden" name="lng" value={lng} /></>}
          <Button type="submit">Cerca</Button>
        </div>
        <div className="sm:col-span-4"><LocateButton /></div>
      </form>
      {geoFail && <Alert tone="warning">Non siamo riusciti a localizzare «{city}»: mostriamo le offerte di quella città senza distanze.</Alert>}
      <p className="text-xs text-muted">Prezzi e sconti sono indicati dal partner e controllati dallo staff prima della pubblicazione. La percentuale è calcolata automaticamente dai due prezzi. Nessun pagamento avviene su AutoGarage24: richiedere un&apos;offerta significa prenotarla presso il partner.</p>
      {error ? <Alert tone="error">Offerte non disponibili al momento.</Alert> : !items.length ? (
        <EmptyState title="Nessuna offerta attiva" description="Le offerte compaiono solo dopo l'approvazione dello staff. AutoGarage24 è in fase di lancio a Milano: torna presto." />
      ) : <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map((o) => <li key={o.slug}><OfferCard o={o} /></li>)}</ul>}
    </div>
  );
}
