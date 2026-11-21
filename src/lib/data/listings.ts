import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { neoValues, PAGE_SIZE, type ListingFilters } from "@/lib/marketplace/filters";
import type { Views } from "@/lib/supabase/database.types";

export type ListingCardData = Pick<
  Views<"listing_search">,
  "id" | "slug" | "title" | "price_cents" | "negotiable" | "city" | "province" | "seller_kind" | "seller_name" | "make_name" | "model"
  | "version" | "year" | "mileage_km" | "fuel" | "transmission" | "power_kw" | "cover_path" | "status" | "published_at"
  | "neo_result" | "source"
>;

const CARD_COLUMNS =
  "id, slug, title, price_cents, negotiable, city, province, seller_kind, seller_name, make_name, model, version, year, mileage_km, fuel, transmission, power_kw, cover_path, status, published_at, neo_result, source";

/**
 * Ricerca degli annunci pubblicati, con filtri e ordinamento applicati dal
 * database (una sola query + conteggio, paginata).
 */
export async function searchListings(f: ListingFilters): Promise<{ items: ListingCardData[]; total: number; error: boolean }> {
  const supabase = createPublicClient();
  if (!supabase) return { items: [], total: 0, error: false };

  let q = supabase.from("listing_search").select(CARD_COLUMNS, { count: "exact" }).eq("status", "pubblicato");
  if (f.marca) q = q.eq("make_slug", f.marca);
  if (f.modello) q = q.ilike("model", `%${f.modello}%`);
  if (f.q) q = q.ilike("search_text", `%${f.q.toLowerCase()}%`);
  if (f.prezzo_min !== undefined) q = q.gte("price_cents", f.prezzo_min * 100);
  if (f.prezzo_max !== undefined) q = q.lte("price_cents", f.prezzo_max * 100);
  if (f.anno_min !== undefined) q = q.gte("year", f.anno_min);
  if (f.anno_max !== undefined) q = q.lte("year", f.anno_max);
  if (f.km_max !== undefined) q = q.lte("mileage_km", f.km_max);
  if (f.potenza_min !== undefined) q = q.gte("power_kw", f.potenza_min);
  if (f.potenza_max !== undefined) q = q.lte("power_kw", f.potenza_max);
  if (f.alimentazione) q = q.eq("fuel", f.alimentazione);
  if (f.cambio) q = q.eq("transmission", f.cambio);
  if (f.carrozzeria) q = q.eq("body_type", f.carrozzeria);
  if (f.condizione) q = q.eq("condition", f.condizione);
  if (f.venditore) q = q.eq("seller_kind", f.venditore);
  if (f.citta) q = q.ilike("city", f.citta);
  if (f.cap) q = q.eq("postal_code", f.cap);

  const neo = neoValues(f.neo);
  if (neo) q = q.in("neo_result", neo);
  if (f.lat !== undefined && f.lng !== undefined) {
    const { data: near } = await supabase.rpc("listings_within", { p_lat: f.lat, p_lng: f.lng, p_radius_km: f.raggio ?? 25 });
    const ids = (near ?? []).map((n) => n.listing_id);
    q = ids.length ? q.in("id", ids.slice(0, 500)) : q.eq("id", "00000000-0000-0000-0000-000000000000");
  }

  switch (f.ordina) {
    case "prezzo_asc": q = q.order("price_cents", { ascending: true }); break;
    case "prezzo_desc": q = q.order("price_cents", { ascending: false }); break;
    case "anno_desc": q = q.order("year", { ascending: false, nullsFirst: false }); break;
    case "km_asc": q = q.order("mileage_km", { ascending: true, nullsFirst: false }); break;
    default: q = q.order("published_at", { ascending: false });
  }
  const from = (f.pagina - 1) * PAGE_SIZE;
  const { data, count, error } = await q.range(from, from + PAGE_SIZE - 1);
  if (error) return { items: [], total: 0, error: true };

  return { items: (data ?? []) as ListingCardData[], total: count ?? 0, error: false };
}

export async function latestListings(limit = 6, neoOnly?: ("compatibile" | "da_verificare")[]) {
  const supabase = createPublicClient();
  if (!supabase) return [];
  let q = supabase.from("listing_search").select(CARD_COLUMNS).eq("status", "pubblicato").order("published_at", { ascending: false }).limit(limit);
  if (neoOnly) q = q.in("neo_result", neoOnly);
  const { data } = await q;
  return (data ?? []) as ListingCardData[];
}

/** Annunci raccolti dal fondatore (Field Manager) e pubblicati. */
export async function fieldManagerListings(limit = 6) {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data } = await supabase.from("listing_search").select(CARD_COLUMNS).eq("status", "pubblicato").eq("source", "field_manager")
    .order("published_at", { ascending: false }).limit(limit);
  return (data ?? []) as ListingCardData[];
}

/** Insieme degli annunci preferiti dell'utente collegato (una query per pagina). */
export async function favoriteListingIds(): Promise<Set<string> | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("favorites").select("listing_id").not("listing_id", "is", null);
  return new Set((data ?? []).map((f) => f.listing_id as string));
}

export async function otherListingsBySeller(professionalProfileId: string, excludeId: string) {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data } = await supabase.from("listing_search").select(CARD_COLUMNS).eq("status", "pubblicato")
    .eq("professional_profile_id", professionalProfileId).neq("id", excludeId).limit(3);
  return (data ?? []) as ListingCardData[];
}

/** Ultimi annunci per le vetrine pubbliche (in cache pochi minuti, invalidata con il tag "listings"). */
export async function latestListingsCached(limit = 6) {
  "use cache";
  cacheLife("minutes");
  cacheTag("listings");
  return latestListings(limit);
}

/** Ultime auto compatibili per neopatentati (esito calcolato dal motore, non dichiarato dal venditore). */
export async function latestNeoListingsCached(limit = 3) {
  "use cache";
  cacheLife("minutes");
  cacheTag("listings");
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data } = await supabase.from("listing_search").select(CARD_COLUMNS).eq("status", "pubblicato").eq("neo_result", "compatibile")
    .order("published_at", { ascending: false }).limit(limit);
  return (data ?? []) as ListingCardData[];
}
