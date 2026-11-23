import Link from "next/link";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/form";
import { Pagination } from "@/components/ui/misc";
import { BRANDS } from "@/config/brands";
import { favoriteListingIds, searchListings } from "@/lib/data/listings";
import {
  activeFilterChips, LISTING_SORTS, listingSearchHref, NEO_FILTERS, PAGE_SIZE, parseListingFilters, type ListingFilters,
} from "@/lib/marketplace/filters";
import { BODY_LABELS, CONDITION_LABELS, FUEL_LABELS, TRANSMISSION_LABELS } from "@/lib/labels";
import { ListingCard } from "./listing-card";
import { SortSelect } from "./sort-select";
import { CompareBar } from "./compare";
import { LocateButton } from "@/components/maps/locate-button";
import { geocodeItaly } from "@/lib/geo/geocode";

type Params = Record<string, string | string[] | undefined>;

/**
 * Ricerca completa del marketplace: filtri (modulo GET, URL condivisibili),
 * filtri attivi rimovibili, ordinamento, risultati reali e paginazione.
 */
/**
 * Testo della barra unica: prima come marca, modello o parola dell'annuncio;
 * se non trova nulla, come luogo (indirizzo, città o CAP) con le auto più vicine.
 */
async function resolveListingSearch(f: ListingFilters) {
  if (!f.cerca || f.lat !== undefined) return { effective: f, result: await searchListings(f), place: null as string | null, geoFail: false };
  const text = f.cerca;
  if (!/^\d{5}$/.test(text)) {
    const byText: ListingFilters = { ...f, q: text };
    const result = await searchListings(byText);
    if (result.total > 0 || result.error) return { effective: byText, result, place: null, geoFail: false };
  }
  const g = await geocodeItaly(/^\d{5}$/.test(text) ? `${text} Italia` : text);
  if (g) {
    const near: ListingFilters = { ...f, lat: g.lat, lng: g.lng, raggio: f.raggio ?? 25 };
    return { effective: near, result: await searchListings(near), place: g.label, geoFail: false };
  }
  return { effective: { ...f, q: text }, result: await searchListings({ ...f, q: text }), place: null, geoFail: true };
}

export async function ListingSearch({ base, params, neoMode = false }: { base: string; params: Params; neoMode?: boolean }) {
  const filters = parseListingFilters(params);
  if (neoMode && !params.neo) filters.neo = "compatibili_da_verificare";
  const [{ effective, result: { items, total, error }, place, geoFail }, favs] = await Promise.all([resolveListingSearch(filters), favoriteListingIds()]);
  const chips = activeFilterChips(base, filters);
  const advancedCount = chips.filter((c) => c.key !== "cerca").length;

  return (
    <div className="flex flex-col gap-6">
      <details className="group rounded-2xl border border-line bg-white shadow-card" open={neoMode || undefined}>
        <summary className="flex cursor-pointer items-center justify-between px-5 py-4 font-semibold">
          <span className="flex items-center gap-2"><SlidersHorizontal className="size-4" aria-hidden /> Filtri avanzati {advancedCount > 0 ? `(${advancedCount})` : <span className="font-normal text-muted">(facoltativi: prezzo, anno, km, carburante…)</span>}</span>
          <span className="text-sm font-semibold text-orange-700 group-open:hidden">Mostra</span>
        </summary>
        <FilterForm base={base} filters={filters} neoMode={neoMode} />
      </details>

      <section id="risultati" aria-labelledby="risultati-title" className="min-w-0">
        {place && <p className="mb-3 text-sm text-graphite">Automobili entro {effective.raggio} km da <strong>{place}</strong>.</p>}
        {geoFail && <Alert tone="warning" className="mb-3">Non abbiamo trovato «{filters.cerca}» come luogo: mostriamo gli annunci che contengono questa parola. Per cercare vicino a un indirizzo scrivi via, numero e città.</Alert>}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="risultati-title" className="text-lg font-bold" aria-live="polite">
            {error ? "Risultati non disponibili" : `${total} ${total === 1 ? "automobile trovata" : "automobili trovate"}`}
          </h2>
          <SortSelect base={base} filters={filters} />
        </div>

        {chips.length > 0 && (
          <ul className="mb-5 flex flex-wrap gap-2" aria-label="Filtri attivi">
            {chips.map((c) => (
              <li key={c.key}>
                <Link href={c.href} className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-white px-3 py-1.5 text-sm font-medium hover:border-ink">
                  {c.label} <X className="size-3.5" aria-label="rimuovi filtro" />
                </Link>
              </li>
            ))}
            <li>
              <Link href={neoMode ? `${base}?neo=compatibili_da_verificare` : base} className="inline-flex items-center px-2 py-1.5 text-sm font-semibold text-orange-700 hover:underline">
                Azzera tutti i filtri
              </Link>
            </li>
          </ul>
        )}

        {error ? (
          <Alert tone="error">Non è stato possibile caricare gli annunci. Riprova tra qualche istante.</Alert>
        ) : items.length === 0 ? (
          <EmptyState
            title="Nessuna automobile corrisponde alla ricerca"
            description={chips.length > 0 ? "Prova a rimuovere qualche filtro o ad ampliare la zona di ricerca." : "Non ci sono ancora annunci pubblicati. Torna a trovarci presto: le prime auto sono in arrivo."}
          />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <li key={item.id} className="flex">
                <div className="w-full"><ListingCard item={item} favorite={favs ? favs.has(item.id!) : false} showNeo={neoMode} /></div>
              </li>
            ))}
          </ul>
        )}
        <CompareBar />
        <Pagination page={filters.pagina} pageSize={PAGE_SIZE} total={total} hrefFor={(p) => listingSearchHref(base, filters, { pagina: p })} />
      </section>
    </div>
  );
}

function FilterForm({ base, filters: f, neoMode }: { base: string; filters: ListingFilters; neoMode: boolean }) {
  const opt = (map: Record<string, string>) => Object.entries(map).map(([v, l]) => <option key={v} value={v}>{l}</option>);
  return (
    <form action={`${base}#cerca`} method="get" className="grid gap-4 border-t border-line p-5 sm:grid-cols-2 lg:grid-cols-3">
      {f.cerca && <input type="hidden" name="cerca" value={f.cerca} />}
      {neoMode && (
        <Field id="f-neo" label="Compatibilità neopatentati">
          <Select id="f-neo" name="neo" defaultValue={f.neo ?? ""}>
            <option value="">Tutte (anche non compatibili)</option>
            {opt(NEO_FILTERS)}
          </Select>
        </Field>
      )}
      <Field id="f-q" label="Cerca"><Input id="f-q" name="q" defaultValue={f.q} placeholder="Es. Panda hybrid" /></Field>
      <Field id="f-marca" label="Marca">
        <Select id="f-marca" name="marca" defaultValue={f.marca ?? ""}>
          <option value="">Tutte le marche</option>
          {BRANDS.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
        </Select>
      </Field>
      <Field id="f-modello" label="Modello"><Input id="f-modello" name="modello" defaultValue={f.modello} /></Field>
      <div className="grid grid-cols-2 gap-3 sm:col-span-2 lg:col-span-1">
        <Field id="f-pmin" label="Prezzo min (€)"><Input id="f-pmin" name="prezzo_min" inputMode="numeric" defaultValue={f.prezzo_min} /></Field>
        <Field id="f-pmax" label="Prezzo max (€)"><Input id="f-pmax" name="prezzo_max" inputMode="numeric" defaultValue={f.prezzo_max} /></Field>
        <Field id="f-amin" label="Anno da"><Input id="f-amin" name="anno_min" inputMode="numeric" defaultValue={f.anno_min} /></Field>
        <Field id="f-amax" label="Anno a"><Input id="f-amax" name="anno_max" inputMode="numeric" defaultValue={f.anno_max} /></Field>
        <Field id="f-kw1" label="Potenza da (kW)"><Input id="f-kw1" name="potenza_min" inputMode="numeric" defaultValue={f.potenza_min} /></Field>
        <Field id="f-kw2" label="Potenza a (kW)"><Input id="f-kw2" name="potenza_max" inputMode="numeric" defaultValue={f.potenza_max} /></Field>
      </div>
      <Field id="f-km" label="Chilometraggio massimo"><Input id="f-km" name="km_max" inputMode="numeric" defaultValue={f.km_max} /></Field>
      <Field id="f-fuel" label="Alimentazione"><Select id="f-fuel" name="alimentazione" defaultValue={f.alimentazione ?? ""}><option value="">Tutte</option>{opt(FUEL_LABELS)}</Select></Field>
      <Field id="f-tr" label="Cambio"><Select id="f-tr" name="cambio" defaultValue={f.cambio ?? ""}><option value="">Tutti</option>{opt(TRANSMISSION_LABELS)}</Select></Field>
      <Field id="f-body" label="Carrozzeria"><Select id="f-body" name="carrozzeria" defaultValue={f.carrozzeria ?? ""}><option value="">Tutte</option>{opt(BODY_LABELS)}</Select></Field>
      <Field id="f-cond" label="Condizione"><Select id="f-cond" name="condizione" defaultValue={f.condizione ?? ""}><option value="">Tutte</option>{opt(CONDITION_LABELS)}</Select></Field>
      <Field id="f-seller" label="Venditore">
        <Select id="f-seller" name="venditore" defaultValue={f.venditore ?? ""}>
          <option value="">Privati e professionisti</option><option value="professionista">Solo professionisti</option><option value="privato">Solo privati</option>
        </Select>
      </Field>
      <div className="grid grid-cols-[1fr_110px] gap-3">
        <Field id="f-city" label="Città"><Input id="f-city" name="citta" defaultValue={f.citta} placeholder="Milano" /></Field>
        <Field id="f-cap" label="CAP"><Input id="f-cap" name="cap" inputMode="numeric" defaultValue={f.cap} /></Field>
      </div>
      {f.lat !== undefined && f.lng !== undefined ? (
        <div className="grid gap-2">
          <input type="hidden" name="lat" value={f.lat} /><input type="hidden" name="lng" value={f.lng} />
          <Field id="f-r" label="Distanza dalla tua posizione"><Select id="f-r" name="raggio" defaultValue={String(f.raggio ?? 25)}>{[5, 10, 25, 50, 100].map((r) => <option key={r} value={r}>Entro {r} km</option>)}</Select></Field>
        </div>
      ) : null}
      <LocateButton />
      <p className="text-xs text-muted">La distanza usa la tua posizione approssimata (~1 km), solo se la condividi, e la zona dell&apos;annuncio. Gli annunci senza posizione compaiono nella ricerca per città.</p>
      {f.ordina !== "recenti" && <input type="hidden" name="ordina" value={f.ordina} />}
      <Button type="submit" className="w-full self-end">Applica filtri</Button>
    </form>
  );
}

export { LISTING_SORTS };
