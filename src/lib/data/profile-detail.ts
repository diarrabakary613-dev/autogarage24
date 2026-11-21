import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

export type PublicProfile = NonNullable<Awaited<ReturnType<typeof getPublicProfile>>>;

/** Profilo pubblico di un professionista approvato, con servizi, foto, recensioni e collegamenti reali. */
export type Reputation = {
  count: number; average: number | null; replies: number; distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
  service: { count: number; quality: number | null; professionalism: number | null; value: number | null };
  purchase: { count: number; accuracy: number | null; communication: number | null; reliability: number | null };
};

export async function getPublicProfile(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(`profile:${slug}`, "profiles");
  const supabase = createPublicClient();
  if (!supabase || !/^[a-z0-9-]{2,140}$/.test(slug)) return null;
  const { data: p } = await supabase.from("professional_profiles")
    .select("id, user_id, professional_type, display_name, slug, description, phone_public, email_public, website, show_address, city, province, postal_code, region, identity_verified_at, business_verified_at, documents_checked_at, categories, brands_served, opening_hours, closed_days, logo_path, cover_path, work_modes, experience_years, service_area, service_radius_km, accepts_appointments, created_at")
    .eq("slug", slug).eq("review_status", "approvato").eq("is_published", true).is("deleted_at", null).maybeSingle();
  if (!p) return null;
  const [loc, services, photos, reviews, certs, affMech, affGarage, cats, listings, parts, founding] = await Promise.all([
    supabase.rpc("professional_locations", { profile_ids: [p.id] }),
    supabase.from("professional_services").select("id, name, category, description, price_type, price_cents, duration_text, vehicle_types, work_mode").eq("profile_id", p.id).eq("active", true).order("position"),
    supabase.from("business_photos").select("id, storage_path, kind, caption").eq("profile_id", p.id).order("position"),
    supabase.from("reviews").select("id, rating, title, comment, service_label, reply, reply_at, created_at, review_kind, experience_date, quality_rating, professionalism_rating, value_rating, accuracy_rating, communication_rating, reliability_rating").eq("profile_id", p.id).eq("status", "pubblicata").order("created_at", { ascending: false }).limit(20),
    supabase.from("professional_certifications").select("id, title, issuer, issued_on, verified_at").eq("profile_id", p.id).not("verified_at", "is", null),
    supabase.from("professional_affiliations").select("garage:professional_profiles!professional_affiliations_garage_profile_id_fkey(slug, display_name)").eq("mechanic_profile_id", p.id).eq("status", "accettato"),
    supabase.from("professional_affiliations").select("mechanic:professional_profiles!professional_affiliations_mechanic_profile_id_fkey(slug, display_name)").eq("garage_profile_id", p.id).eq("status", "accettato"),
    supabase.from("business_categories").select("slug, name"),
    ["venditore_auto", "officina"].includes(p.professional_type)
      ? supabase.from("listing_search").select("id, slug, title, price_cents, negotiable, city, province, seller_kind, seller_name, make_name, model, version, year, mileage_km, fuel, transmission, power_kw, cover_path, status, published_at, neo_result, source").eq("professional_profile_id", p.id).eq("status", "pubblicato").order("published_at", { ascending: false }).limit(6)
      : Promise.resolve({ data: [] }),
    p.professional_type === "venditore_ricambi"
      ? supabase.from("part_search").select("id, slug, title, price_cents, condition, city, cover_path, manufacturer_brand, oem_code, category_name, seller_name, seller_kind, quantity").eq("professional_profile_id", p.id).eq("status", "pubblicato").order("published_at", { ascending: false }).limit(12)
      : Promise.resolve({ data: [] }),
    supabase.rpc("founding_partner_profiles", { profile_ids: [p.id] }),
  ]);
  const { data: reputation } = await supabase.rpc("profile_reputation", { profile_id: p.id });
  const rated = reviews.data ?? [];
  // Media calcolata su tutte le recensioni pubblicate (non solo su quelle mostrate).
  const { data: allRatings } = await supabase.from("reviews").select("rating").eq("profile_id", p.id).eq("status", "pubblicata").limit(5000);
  const reviewCount = allRatings?.length ?? 0;
  const distribution = [5, 4, 3, 2, 1].map((star) => ({ star, count: (allRatings ?? []).filter((r) => r.rating === star).length }));
  const avg = reviewCount ? Math.round((allRatings!.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10) / 10 : null;
  return {
    profile: p,
    location: loc.data?.[0] ?? null,
    services: services.data ?? [],
    photos: photos.data ?? [],
    reviews: rated,
    reviewCount,
    ratingAvg: avg,
    distribution,
    founding: (founding.data ?? []).length > 0,
    reputation: (reputation ?? null) as Reputation | null,
    certifications: certs.data ?? [],
    garages: (affMech.data ?? []).map((a) => a.garage as unknown as { slug: string; display_name: string }).filter(Boolean),
    mechanics: (affGarage.data ?? []).map((a) => a.mechanic as unknown as { slug: string; display_name: string }).filter(Boolean),
    categories: cats.data ?? [],
    listings: listings.data ?? [],
    parts: parts.data ?? [],
  };
}
