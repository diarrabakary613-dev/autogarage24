import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { Tables } from "@/lib/supabase/database.types";
import type { Evaluation } from "@/lib/neopatentati/engine";

export type ListingDetail = Awaited<ReturnType<typeof loadListing>>;

/**
 * Dati pubblici della scheda annuncio (visitatore anonimo → solo annunci
 * pubblicati o venduti). In cache per pochi minuti, invalidati con il tag
 * `listing:<slug>` quando il venditore o l'amministratore modificano l'annuncio.
 */
export async function getPublicListing(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(`listing:${slug}`, "listings");
  return loadListing(slug);
}

async function loadListing(slug: string) {
  const supabase = createPublicClient();
  if (!supabase || !/^[a-z0-9-]{3,140}$/.test(slug)) return null;
  const { data: listing } = await supabase
    .from("vehicle_listings")
    .select("*, vehicles(*), vehicle_images(id, storage_path, position, is_cover)")
    .eq("slug", slug)
    .maybeSingle();
  if (!listing || !listing.vehicles) return null;
  const vehicle = listing.vehicles as unknown as Tables<"vehicles">;
  const [seller, inspections, check, rule, videos, verifications, prices, reputation] = await Promise.all([
    listing.professional_profile_id
      ? supabase.from("professional_profiles")
          .select("id, slug, display_name, professional_type, city, province, business_verified_at, identity_verified_at, documents_checked_at, logo_path")
          .eq("id", listing.professional_profile_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("vehicle_inspections")
      .select("id, inspector_name, inspected_on, mileage_km, mileage_source, observations, recommendations, recommended_repairs, inspection_items(item, result, note, position)")
      .eq("listing_id", listing.id).eq("status", "pubblicato").order("inspected_on", { ascending: false }),
    supabase.from("vehicle_compatibility_checks").select("result, details, checked_at, rule_version_id")
      .eq("vehicle_id", listing.vehicle_id).order("checked_at", { ascending: false }).limit(1).maybeSingle(),
    listing.neo_rule_version_id
      ? supabase.from("legal_rule_versions").select("id, version_label, sources, consulted_on, effective_from, license_obtained_from, license_obtained_to")
          .eq("id", listing.neo_rule_version_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("vehicle_videos").select("id, storage_path, mime_type").eq("listing_id", listing.id).order("position"),
    supabase.from("vehicle_verifications").select("kind, verified_at").eq("listing_id", listing.id).is("revoked_at", null),
    supabase.from("vehicle_price_history").select("old_cents, new_cents, changed_at").eq("listing_id", listing.id).order("changed_at"),
    listing.professional_profile_id ? supabase.rpc("profile_reputation", { profile_id: listing.professional_profile_id }) : Promise.resolve({ data: null }),
  ]);
  const images = [...((listing.vehicle_images ?? []) as { id: string; storage_path: string; position: number; is_cover: boolean }[])]
    .sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.position - b.position);
  const { vehicles: _v, vehicle_images: _i, ...rest } = listing;
  return {
    listing: rest,
    vehicle,
    images,
    seller: seller.data,
    inspections: inspections.data ?? [],
    videos: videos.data ?? [],
    verifications: verifications.data ?? [],
    priceHistory: prices.data ?? [],
    reputation: (reputation.data ?? null) as { count: number; average: number | null } | null,
    check: check.data ? { ...check.data, details: check.data.details as unknown as Evaluation } : null,
    rule: rule.data as (Pick<Tables<"legal_rule_versions">, "id" | "version_label" | "consulted_on" | "effective_from" | "license_obtained_from" | "license_obtained_to"> & { sources: { title: string; url: string }[] }) | null,
  };
}
