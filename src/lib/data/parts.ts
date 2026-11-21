import "server-only";

import { createPublicClient } from "@/lib/supabase/public";
import { cleanText } from "@/lib/marketplace/filters";
import type { Enums } from "@/lib/supabase/database.types";

export const PART_SORTS = { recenti: "Più recenti", rilevanza: "Rilevanza", prezzo_asc: "Prezzo crescente", prezzo_desc: "Prezzo decrescente", condizione: "Condizione (nuovo prima)" } as const;
export const PART_PAGE = 12;
type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const intIn = (v: string | undefined, min: number, max: number) => { const n = Number(v); return v && Number.isInteger(n) && n >= min && n <= max ? n : undefined; };

export type PartFilters = {
  q?: string; categoria?: string; marca?: string; codice?: string; auto_marca?: string; auto_modello?: string; anno?: number;
  versione?: string; motore?: string; condizione?: Enums<"part_condition">; prezzo_min?: number; prezzo_max?: number; citta?: string;
  cap?: string; venditore?: Enums<"seller_kind">; disponibili: boolean; auto?: string; ordina: keyof typeof PART_SORTS; pagina: number;
};

export function parsePartFilters(p: Params): PartFilters {
  const cond = one(p.condizione); const seller = one(p.venditore); const sort = one(p.ordina);
  return {
    q: cleanText(one(p.q)), categoria: one(p.categoria)?.match(/^[a-z0-9-]{2,40}$/) ? one(p.categoria) : undefined,
    marca: cleanText(one(p.marca)), codice: one(p.codice)?.replace(/[^A-Za-z0-9 .-]/g, "").slice(0, 40) || undefined,
    auto_marca: one(p.auto_marca)?.match(/^[a-z0-9-]{2,30}$/) ? one(p.auto_marca) : undefined, auto_modello: cleanText(one(p.auto_modello)),
    anno: intIn(one(p.anno), 1950, 2100), versione: cleanText(one(p.versione)), motore: cleanText(one(p.motore)),
    condizione: cond === "nuovo" || cond === "usato" || cond === "ricondizionato" ? cond : undefined,
    prezzo_min: intIn(one(p.prezzo_min), 0, 1_000_000), prezzo_max: intIn(one(p.prezzo_max), 0, 1_000_000),
    citta: cleanText(one(p.citta)), cap: one(p.cap)?.match(/^\d{5}$/) ? one(p.cap) : undefined,
    venditore: seller === "privato" || seller === "professionista" ? seller : undefined, disponibili: one(p.disponibili) === "1",
    auto: one(p.auto)?.match(/^[0-9a-f-]{36}$/) ? one(p.auto) : undefined,
    ordina: sort && sort in PART_SORTS ? (sort as PartFilters["ordina"]) : one(p.q) || one(p.codice) ? "rilevanza" : "recenti",
    pagina: Math.min(500, Math.max(1, Number(one(p.pagina)) || 1)),
  };
}

export function partHref(base: string, f: Partial<PartFilters>, o: Partial<PartFilters> = {}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...f, ...o })) {
    if (v === undefined || v === null || v === "" || v === false) continue;
    if ((k === "pagina" && v === 1) || (k === "ordina" && v === "recenti")) continue;
    sp.set(k, v === true ? "1" : String(v));
  }
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

export async function searchParts(f: PartFilters) {
  const supabase = createPublicClient();
  if (!supabase) return { items: [], total: 0, error: false };
  const { data, error } = await supabase.rpc("search_parts", {
    p_query: f.q, p_category: f.categoria, p_brand: f.marca, p_code: f.codice, p_make: f.auto_marca, p_model: f.auto_modello, p_year: f.anno,
    p_condition: f.condizione, p_price_min: f.prezzo_min !== undefined ? f.prezzo_min * 100 : undefined, p_price_max: f.prezzo_max !== undefined ? f.prezzo_max * 100 : undefined,
    p_city: f.citta, p_postal_code: f.cap, p_seller: f.venditore, p_available_only: f.disponibili, p_sort: f.ordina,
    p_limit: PART_PAGE, p_offset: (f.pagina - 1) * PART_PAGE,
  });
  if (error) return { items: [], total: 0, error: true };
  return { items: data ?? [], total: Number(data?.[0]?.total_count ?? 0), error: false };
}

export async function getPartCategories() {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data } = await supabase.from("part_categories").select("id, slug, name, parent_id, position").eq("active", true).order("position");
  return data ?? [];
}
