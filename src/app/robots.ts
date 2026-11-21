import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";
import { robotsExtraDisallow } from "@/lib/seo/sitemap-data";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = getSiteUrl();
  const extra = await robotsExtraDisallow();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/admin", "/business", "/auth/", "/aggiorna-password", "/account-sospeso", "/design-system", "/disiscriviti/", "/invita/", "/api/", ...extra],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
  };
}
