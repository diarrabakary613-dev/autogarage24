import "server-only";

import { createPublicClient } from "@/lib/supabase/public";
import { cleanText } from "@/lib/marketplace/filters";
import type { Enums } from "@/lib/supabase/database.types";

export type ProType = "officina" | "meccanico" | "venditore_ricambi";
export const PRO_SORTS = { nome: "Nome (A–Z)", recenti: "Più recenti", valutazione: "Valutazione", distanza: "Distanza" } as const;
export const PRO_PAGE = 12;

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export type ProFilters = {
  q?: string; citta?: string; cap?: string; regione?: string; categoria?: string; marca?: string;
  modalita?: Enums<"work_mode">; verificati: boolean; lat?: number; lng?: number; raggio?: number;
  ordina: keyof typeof PRO_SORTS; pagina: number;
};

export function parseProFilters(p: Params): ProFilters {
  const lat = Number(one(p.lat)); const lng = Number(one(p.lng)); const r = Number(one(p.raggio));
  const hasPos = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && one(p.lat) !== undefined;
  const sort = one(p.ordina);
  const mode = one(p.modalita);
  return {
    q: cleanText(one(p.q)),
    citta: cleanText(one(p.citta)),
    cap: one(p.cap)?.match(/^\d{5}$/) ? one(p.cap) : undefined,
    regione: cleanText(one(p.regione)),
    categoria: one(p.categoria)?.match(/^[a-z0-9-]{2,40}$/) ? one(p.categoria) : undefined,
    marca: cleanText(one(p.marca)),
    modalita: mode === "sede" || mode === "officina_partner" || mode === "mobile" ? mode : undefined,
    verificati: one(p.verificati) === "1",
    lat: hasPos ? lat : undefined,
    lng: hasPos ? lng : undefined,
    raggio: hasPos && Number.isInteger(r) && r >= 1 && r <= 200 ? r : hasPos ? 15 : undefined,
    ordina: sort && sort in PRO_SORTS && (sort !== "distanza" || hasPos) ? (sort as ProFilters["ordina"]) : hasPos ? "distanza" : "nome",
    pagina: Math.min(500, Math.max(1, Number(one(p.pagina)) || 1)),
  };
}

export function proHref(base: string, f: Partial<ProFilters>, o: Partial<ProFilters> = {}) {
  const m = { ...f, ...o };
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(m)) {
    if (v === undefined || v === null || v === "" || v === false) continue;
    if (k === "pagina" && v === 1) continue;
    if (k === "ordina" && v === "nome") continue;
    sp.set(k, v === true ? "1" : String(v));
  }
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

export async function searchProfessionals(type: ProType, f: ProFilters) {
  const supabase = createPublicClient();
  if (!supabase) return { items: [], total: 0, error: false };
  const { data, error } = await supabase.rpc("search_professionals", {
    p_type: type, p_query: f.q, p_city: f.citta, p_postal_code: f.cap, p_region: f.regione, p_category: f.categoria,
    p_brand: f.marca, p_work_mode: f.modalita, p_verified_only: f.verificati, p_lat: f.lat, p_lng: f.lng, p_radius_km: f.raggio,
    p_sort: f.ordina, p_limit: PRO_PAGE, p_offset: (f.pagina - 1) * PRO_PAGE,
  });
  if (error) return { items: [], total: 0, error: true };
  return { items: data ?? [], total: Number(data?.[0]?.total_count ?? 0), error: false };
}

export async function getCategories(appliesTo: "officina" | "meccanico") {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data } = await supabase.from("business_categories").select("slug, name").in("applies_to", [appliesTo, "entrambi"]).order("position");
  return data ?? [];
}
