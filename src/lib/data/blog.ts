import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { Tables } from "@/lib/supabase/database.types";

export type Article = Tables<"blog_articles"> & { blog_categories: { slug: string; name: string } | null };
const COLS = "*, blog_categories(slug, name)";

/** Articoli visibili al pubblico (la regola di visibilità è applicata dal database). */
export async function publicArticles(categorySlug?: string): Promise<Article[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("blog");
  const sb = createPublicClient();
  if (!sb) return [];
  try {
    let q = sb.from("blog_articles").select(categorySlug ? "*, blog_categories!inner(slug, name)" : COLS).order("published_at", { ascending: false }).limit(100);
    if (categorySlug) q = q.eq("blog_categories.slug", categorySlug);
    const { data } = await q;
    return (data ?? []) as unknown as Article[];
  } catch { return []; }
}

export async function publicArticle(slug: string): Promise<Article | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("blog");
  if (!/^[a-z0-9-]{3,90}$/.test(slug)) return null;
  const sb = createPublicClient();
  if (!sb) return null;
  try {
    const { data } = await sb.from("blog_articles").select(COLS).eq("slug", slug).maybeSingle();
    return (data as unknown as Article) ?? null;
  } catch { return null; }
}

export async function blogCategories() {
  "use cache";
  cacheLife("hours");
  cacheTag("blog");
  const sb = createPublicClient();
  if (!sb) return [];
  try { const { data } = await sb.from("blog_categories").select("id, slug, name, description").order("sort"); return data ?? []; } catch { return []; }
}
