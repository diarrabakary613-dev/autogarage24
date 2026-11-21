import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { categoryForType, LOCAL_CATEGORIES } from "./constants";
export { categoryForType, LOCAL_CATEGORIES, NEO_BANDS, type LocalCategory, type NeoBand } from "./constants";

type Entry = { path: string; lastModified?: string; priority: number };

/** URL dinamici per la sitemap: solo contenuti pubblici, reali e indicizzabili. */
export async function dynamicSitemapEntries(): Promise<Entry[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("seo", "sitemap");
  const sb = createPublicClient();
  if (!sb) return [];
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [listings, profiles, offers, articles, cats, lps, local, neo] = await Promise.all([
      sb.from("listing_search").select("slug, published_at").eq("status", "pubblicato").order("published_at", { ascending: false }).limit(5000),
      sb.from("professional_profiles").select("slug, professional_type, updated_at, description").eq("is_published", true).eq("review_status", "approvato").limit(5000),
      sb.from("promotional_offers").select("slug, updated_at").eq("status", "pubblicata").gte("ends_on", today).limit(2000),
      sb.from("blog_articles").select("slug, updated_at, category_id").order("published_at", { ascending: false }).limit(2000),
      sb.from("blog_categories").select("id, slug"),
      sb.from("landing_pages").select("slug, updated_at").eq("status", "pubblicata").eq("indexable", true).eq("experiment_active", false),
      sb.rpc("seo_local_pages"),
      sb.rpc("seo_neo_bands"),
    ]);
    const out: Entry[] = [];
    for (const l of listings.data ?? []) if (l.slug) out.push({ path: `/auto/${l.slug}`, lastModified: l.published_at ?? undefined, priority: 0.6 });
    for (const p of profiles.data ?? []) {
      const c = categoryForType(p.professional_type);
      // Profili «sottili» (senza descrizione) sono noindex: non vanno in sitemap.
      if (c && p.description) out.push({ path: `${LOCAL_CATEGORIES[c].base}/${p.slug}`, lastModified: p.updated_at, priority: 0.6 });
    }
    for (const o of offers.data ?? []) out.push({ path: `/offerte/${o.slug}`, lastModified: o.updated_at, priority: 0.5 });
    if ((articles.data ?? []).length) out.push({ path: "/blog", priority: 0.6 });
    for (const a of articles.data ?? []) out.push({ path: `/blog/${a.slug}`, lastModified: a.updated_at, priority: 0.6 });
    const used = new Set((articles.data ?? []).map((a) => a.category_id));
    for (const c of cats.data ?? []) if (used.has(c.id)) out.push({ path: `/blog/categoria/${c.slug}`, priority: 0.4 });
    for (const l of lps.data ?? []) out.push({ path: `/lp/${l.slug}`, lastModified: l.updated_at, priority: 0.5 });
    for (const l of local.data ?? []) { const c = categoryForType(l.professional_type); if (c && l.indexable) out.push({ path: `/zona/${l.city_slug}/${c}`, priority: 0.7 }); }
    for (const b of neo.data ?? []) if (b.indexable) out.push({ path: `/auto-per-neopatentati/prezzo/${b.band}`, priority: 0.7 });
    return out;
  } catch { return []; }
}

/** Percorsi aggiuntivi da escludere in robots.txt (impostazione del SEO Manager). */
export async function robotsExtraDisallow(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("seo");
  const sb = createPublicClient();
  if (!sb) return [];
  try {
    const { data } = await sb.from("platform_settings").select("value").eq("key", "seo_robots_extra_disallow").maybeSingle();
    const v = data?.value;
    return Array.isArray(v) ? v.filter((p): p is string => typeof p === "string" && /^\/[a-z0-9/_-]{1,100}$/.test(p)).slice(0, 50) : [];
  } catch { return []; }
}
