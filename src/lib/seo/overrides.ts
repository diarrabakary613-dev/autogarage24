import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

type Override = { path: string; title: string | null; description: string | null; canonical: string | null; noindex: boolean };

/** Tutti gli override meta (tabella piccola), in cache per qualche minuto e invalidati dal SEO Manager. */
export async function seoOverrides(): Promise<Override[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("seo");
  const supabase = createPublicClient();
  if (!supabase) return [];
  try {
    const { data } = await supabase.from("seo_overrides").select("path, title, description, canonical, noindex");
    return (data ?? []) as Override[];
  } catch { return []; }
}

/** Metadati della pagina con eventuale override dal pannello (titolo, descrizione, canonical, noindex). */
export async function seoMetadata(path: string, base: Metadata): Promise<Metadata> {
  const o = (await seoOverrides()).find((x) => x.path === path);
  if (!o) return base;
  return {
    ...base,
    ...(o.title ? { title: { absolute: o.title } } : {}),
    ...(o.description ? { description: o.description } : {}),
    alternates: { ...base.alternates, canonical: o.canonical ?? base.alternates?.canonical ?? path },
    ...(o.noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: { ...base.openGraph, ...(o.title ? { title: o.title } : {}), ...(o.description ? { description: o.description } : {}) },
  };
}
