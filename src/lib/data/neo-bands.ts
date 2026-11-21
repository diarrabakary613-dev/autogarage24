import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { NEO_BANDS, type NeoBand } from "@/lib/seo/sitemap-data";
import type { ListingCardData } from "@/lib/data/listings";

const CARD = "id, slug, title, price_cents, negotiable, city, province, seller_kind, seller_name, make_name, model, version, year, mileage_km, fuel, transmission, power_kw, cover_path, status, published_at, neo_result, source";

/** Annunci compatibili per fascia di prezzo; indicizzabile solo sopra la soglia configurata. */
export async function neoBandListings(band: NeoBand): Promise<{ items: ListingCardData[]; indexable: boolean }> {
  "use cache";
  cacheLife("hours");
  cacheTag("seo", "listings");
  const sb = createPublicClient();
  if (!sb) return { items: [], indexable: false };
  try {
    const b = NEO_BANDS[band];
    const [{ data }, { data: bands }] = await Promise.all([
      sb.from("listing_search").select(CARD).eq("status", "pubblicato").eq("neo_result", "compatibile").gte("price_cents", b.min).lt("price_cents", b.max).order("published_at", { ascending: false }).limit(48),
      sb.rpc("seo_neo_bands"),
    ]);
    return { items: (data ?? []) as ListingCardData[], indexable: Boolean((bands ?? []).find((x) => x.band === band)?.indexable) };
  } catch { return { items: [], indexable: false }; }
}
