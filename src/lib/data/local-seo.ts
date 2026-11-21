import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { LOCAL_CATEGORIES, type LocalCategory } from "@/lib/seo/sitemap-data";
import type { ProCardData } from "@/components/professionals/pro-card";

/** Dati reali di una pagina locale (città + categoria). Null se non esiste nessun profilo pubblicato. */
export async function localPage(citySlug: string, cat: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("seo", "local");
  if (!/^[a-z0-9-]{2,60}$/.test(citySlug) || !(cat in LOCAL_CATEGORIES)) return null;
  const sb = createPublicClient();
  if (!sb) return null;
  try {
    const c = LOCAL_CATEGORIES[cat as LocalCategory];
    const { data: pages } = await sb.rpc("seo_local_pages");
    const page = (pages ?? []).find((p) => p.city_slug === citySlug && p.professional_type === c.type);
    if (!page) return null;
    const { data: items } = await sb.rpc("search_professionals", { p_type: c.type, p_city: page.city, p_limit: 48, p_sort: "valutazione" });
    const others = (pages ?? []).filter((p) => p.city_slug === citySlug && p.professional_type !== c.type && p.profiles > 0);
    return { city: page.city, count: Number(page.profiles), indexable: page.indexable, items: (items ?? []) as unknown as ProCardData[], category: c, others };
  } catch { return null; }
}
