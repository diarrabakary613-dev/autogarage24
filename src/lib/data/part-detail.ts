import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

export async function getPublicPart(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(`part:${slug}`, "parts");
  const supabase = createPublicClient();
  if (!supabase || !/^[a-z0-9-]{3,140}$/.test(slug)) return null;
  const { data: p } = await supabase.from("part_listings")
    .select("id, owner_id, slug, title, description, condition, refurbishment_notes, price_cents, quantity, delivery_options, warranty_text, shipping_info, city, province, manufacturer_brand, oem_code, manufacturer_code, seller_kind, professional_profile_id, status, published_at, category_id, part_categories(name, slug, parent_id), part_images(id, storage_path, position, is_cover), part_compatibility(id, make_slug, model, generation, version, year_from, year_to, engine, engine_code, oem_reference, basis, notes)")
    .eq("slug", slug).maybeSingle();
  if (!p) return null;
  const seller = p.professional_profile_id
    ? (await supabase.from("professional_profiles").select("slug, display_name, city, business_verified_at, identity_verified_at").eq("id", p.professional_profile_id).maybeSingle()).data
    : null;
  return { part: p, seller, images: [...(p.part_images ?? [])].sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.position - b.position) };
}
