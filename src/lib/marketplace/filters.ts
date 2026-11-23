import { findBrand } from "@/config/brands";
import { BODY_LABELS, CONDITION_LABELS, FUEL_LABELS, NEO_LABELS, TRANSMISSION_LABELS } from "@/lib/labels";
import type { Enums } from "@/lib/supabase/database.types";

/**
 * Filtri del marketplace auto: lettura sicura dai parametri URL (condivisibili),
 * serializzazione e descrizione dei filtri attivi. Nessun accesso al database qui.
 */
export const LISTING_SORTS = {
  recenti: "Annunci più recenti",
  prezzo_asc: "Prezzo crescente",
  prezzo_desc: "Prezzo decrescente",
  anno_desc: "Anno più recente",
  km_asc: "Chilometraggio crescente",
} as const;
export type ListingSort = keyof typeof LISTING_SORTS;

export const NEO_FILTERS = {
  compatibili: "Solo compatibili",
  compatibili_da_verificare: "Compatibili e da verificare",
  da_verificare: "Solo da verificare",
  non_compatibili: "Solo non compatibili",
} as const;
export type NeoFilter = keyof typeof NEO_FILTERS;

export const PAGE_SIZE = 12;

export type ListingFilters = {
  q?: string;
  /** Testo libero della barra unica: marca, modello o luogo. */
  cerca?: string;
  marca?: string;
  modello?: string;
  prezzo_min?: number;
  prezzo_max?: number;
  anno_min?: number;
  anno_max?: number;
  km_max?: number;
  potenza_min?: number;
  potenza_max?: number;
  alimentazione?: Enums<"fuel_type">;
  cambio?: Enums<"transmission_type">;
  carrozzeria?: Enums<"body_type">;
  condizione?: Enums<"vehicle_condition">;
  venditore?: Enums<"seller_kind">;
  citta?: string;
  cap?: string;
  neo?: NeoFilter;
  /** Ricerca per distanza: posizione arrotondata (solo su consenso) e raggio in km. */
  lat?: number;
  lng?: number;
  raggio?: number;
  ordina: ListingSort;
  pagina: number;
};

type Params = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  const t = s?.trim();
  return t ? t.slice(0, 80) : undefined;
}
function intParam(v: string | string[] | undefined, min: number, max: number): number | undefined {
  const s = first(v);
  if (!s) return undefined;
  const n = Number(s.replace(/\./g, ""));
  return Number.isInteger(n) && n >= min && n <= max ? n : undefined;
}
function enumParam<T extends string>(v: string | string[] | undefined, allowed: Record<T, string>): T | undefined {
  const s = first(v);
  return s && s in allowed ? (s as T) : undefined;
}
/** Testo libero ripulito: niente caratteri usati dalla sintassi dei filtri PostgREST. */
export function cleanText(v: string | undefined): string | undefined {
  const s = v?.replace(/[%,()*\\:"']/g, " ").replace(/\s+/g, " ").trim();
  return s ? s.slice(0, 60) : undefined;
}

export function parseListingFilters(params: Params): ListingFilters {
  const year = 2100; // limite tecnico: l'anno reale è verificato dal database
  return {
    q: cleanText(first(params.q)),
    cerca: cleanText(first(params.cerca)),
    marca: findBrand(first(params.marca))?.slug ?? (first(params.marca)?.match(/^[a-z0-9-]{2,30}$/) ? first(params.marca) : undefined),
    modello: cleanText(first(params.modello)),
    prezzo_min: intParam(params.prezzo_min, 0, 10_000_000),
    prezzo_max: intParam(params.prezzo_max, 0, 10_000_000),
    anno_min: intParam(params.anno_min, 1950, year),
    anno_max: intParam(params.anno_max, 1950, year),
    km_max: intParam(params.km_max, 0, 2_000_000),
    potenza_min: intParam(params.potenza_min, 0, 2000),
    potenza_max: intParam(params.potenza_max, 0, 2000),
    alimentazione: enumParam(params.alimentazione, FUEL_LABELS),
    cambio: enumParam(params.cambio, TRANSMISSION_LABELS),
    carrozzeria: enumParam(params.carrozzeria, BODY_LABELS),
    condizione: enumParam(params.condizione, CONDITION_LABELS),
    venditore: enumParam(params.venditore, { privato: "", professionista: "" }),
    citta: cleanText(first(params.citta)),
    cap: first(params.cap)?.match(/^[0-9]{5}$/) ? first(params.cap) : undefined,
    neo: enumParam(params.neo, NEO_FILTERS),
    ...(() => {
      const la = Number(first(params.lat)), ln = Number(first(params.lng));
      if (first(params.lat) === undefined || !Number.isFinite(la) || !Number.isFinite(ln) || Math.abs(la) > 90 || Math.abs(ln) > 180) return {};
      const r = intParam(params.raggio, 1, 300) ?? 25;
      return { lat: Math.round(la * 100) / 100, lng: Math.round(ln * 100) / 100, raggio: r };
    })(),
    ordina: enumParam(params.ordina, LISTING_SORTS) ?? "recenti",
    pagina: intParam(params.pagina, 1, 1000) ?? 1,
  };
}

/** URL di ricerca con i filtri indicati (i valori vuoti vengono omessi). */
export function listingSearchHref(base: string, filters: Partial<ListingFilters>, overrides: Partial<ListingFilters> = {}): string {
  const merged: Partial<ListingFilters> = { ...filters, ...overrides };
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined || v === null || v === "") continue;
    if (k === "ordina" && v === "recenti") continue;
    if (k === "pagina" && v === 1) continue;
    sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

const euro = (n: number) => `${new Intl.NumberFormat("it-IT").format(n)} €`;

/** Filtri attivi con il link per rimuoverli singolarmente. */
export function activeFilterChips(base: string, f: ListingFilters): { key: string; label: string; href: string }[] {
  const chips: { key: keyof ListingFilters; label: string | undefined }[] = [
    { key: "cerca", label: f.cerca && `“${f.cerca}”` },
    { key: "q", label: f.q && `“${f.q}”` },
    { key: "marca", label: f.marca && (findBrand(f.marca)?.name ?? f.marca) },
    { key: "modello", label: f.modello && `Modello: ${f.modello}` },
    { key: "prezzo_min", label: f.prezzo_min !== undefined ? `Da ${euro(f.prezzo_min)}` : undefined },
    { key: "prezzo_max", label: f.prezzo_max !== undefined ? `Fino a ${euro(f.prezzo_max)}` : undefined },
    { key: "anno_min", label: f.anno_min ? `Dal ${f.anno_min}` : undefined },
    { key: "anno_max", label: f.anno_max ? `Fino al ${f.anno_max}` : undefined },
    { key: "km_max", label: f.km_max !== undefined ? `Max ${new Intl.NumberFormat("it-IT").format(f.km_max)} km` : undefined },
    { key: "potenza_min", label: f.potenza_min !== undefined ? `Da ${f.potenza_min} kW` : undefined },
    { key: "potenza_max", label: f.potenza_max !== undefined ? `Fino a ${f.potenza_max} kW` : undefined },
    { key: "alimentazione", label: f.alimentazione && FUEL_LABELS[f.alimentazione] },
    { key: "cambio", label: f.cambio && TRANSMISSION_LABELS[f.cambio] },
    { key: "carrozzeria", label: f.carrozzeria && BODY_LABELS[f.carrozzeria] },
    { key: "condizione", label: f.condizione && CONDITION_LABELS[f.condizione] },
    { key: "venditore", label: f.venditore && (f.venditore === "privato" ? "Privati" : "Professionisti") },
    { key: "citta", label: f.citta && `Città: ${f.citta}` },
    { key: "cap", label: f.cap && `CAP ${f.cap}` },
    { key: "neo", label: f.neo && NEO_FILTERS[f.neo] },
  ];
  return chips
    .filter((c): c is { key: keyof ListingFilters; label: string } => Boolean(c.label))
    .map((c) => ({ key: c.key, label: c.label, href: listingSearchHref(base, f, { [c.key]: undefined, pagina: 1 }) }));
}

export function neoValues(neo: NeoFilter | undefined): Enums<"neo_result">[] | null {
  if (neo === "compatibili") return ["compatibile"];
  if (neo === "compatibili_da_verificare") return ["compatibile", "da_verificare"];
  if (neo === "da_verificare") return ["da_verificare"];
  if (neo === "non_compatibili") return ["non_compatibile"];
  return null;
}

export { NEO_LABELS };
