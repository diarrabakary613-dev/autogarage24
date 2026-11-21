import type { Metadata } from "next";
import { seoMetadata } from "@/lib/seo/overrides";
import { BrandGrid, BrandMarquee } from "@/components/marketing/brands";
import { HomeHero } from "@/components/marketing/hero";
import {
  FeaturedCars,
  HowItWorks,
  NeopatentatiHighlight,
  ProfessionalsSection,
  ServicesShowcase,
  Testimonials,
} from "@/components/marketing/home-sections";
import { JsonLd } from "@/components/marketing/json-ld";
import { Announcement } from "@/components/marketing/announcement";
import { SITE } from "@/config/site";
import { getSiteUrl } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/", {
  title: { absolute: "AutoGarage24 — Auto per neopatentati, auto usate, officine e meccanici a Milano" },
  description:
    "Trova la tua prossima automobile, scopri officine e meccanici qualificati a Milano e provincia, cerca ricambi e gestisci le esigenze della tua auto con AutoGarage24.",
  alternates: { canonical: "/" },
});
}

/**
 * Homepage commerciale. Ordine delle sezioni secondo la priorità del brief:
 * Neopatentati → Garages e meccanici → Auto usate → Ricambi → Manutenzione.
 */
export default function HomePage() {
  const site = getSiteUrl();
  return (
    <>
      <Announcement />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": `${site}/#organization`,
              name: SITE.name,
              url: site,
              areaServed: { "@type": "AdministrativeArea", name: "Città metropolitana di Milano" },
              ...(SITE.contactEmail ? { email: SITE.contactEmail } : {}),
              ...(SITE.socials.length ? { sameAs: SITE.socials.map((s) => s.href) } : {}),
            },
            { "@type": "WebSite", "@id": `${site}/#website`, name: SITE.name, url: site, inLanguage: "it-IT" },
          ],
        }}
      />
      <HomeHero />
      <BrandMarquee />
      <NeopatentatiHighlight />
      <BrandGrid />
      <ServicesShowcase />
      <ProfessionalsSection />
      <FeaturedCars />
      <HowItWorks />
      <Testimonials />
    </>
  );
}
