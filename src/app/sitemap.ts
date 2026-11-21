import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";
import { PUBLIC_ROUTES } from "@/config/seo";
import { seoOverrides } from "@/lib/seo/overrides";
import { dynamicSitemapEntries } from "@/lib/seo/sitemap-data";

/** Sitemap: pagine pubbliche (meno quelle escluse dal SEO Manager) e contenuti reali indicizzabili. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  const [overrides, dynamic] = await Promise.all([seoOverrides(), dynamicSitemapEntries()]);
  const noindex = new Set(overrides.filter((o) => o.noindex).map((o) => o.path));
  const url = (p: string) => `${site}${p === "/" ? "" : p}`;
  return [
    ...PUBLIC_ROUTES.filter((r) => !noindex.has(r.path)).map(({ path, priority }) => ({ url: url(path), changeFrequency: "weekly" as const, priority })),
    ...dynamic.filter((d) => !noindex.has(d.path)).map((d) => ({ url: url(d.path), lastModified: d.lastModified, priority: d.priority })),
  ];
}
