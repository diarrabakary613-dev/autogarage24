import type { Metadata } from "next";
import { seoMetadata } from "@/lib/seo/overrides";
import { ProDirectory } from "@/components/professionals/directory";
import { GARAGES_PAGE } from "@/content/professionals";
import { SERVICES } from "@/content/services";

const s = SERVICES.garages;

export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/garages", {
  title: "Officine e garage a Milano: preventivi e appuntamenti",
  description: "Trova officine, carrozzerie, gommisti ed elettrauto a Milano e provincia. Confronta servizi e orari, richiedi un preventivo e un appuntamento online.",
  alternates: { canonical: s.href },
  keywords: ["officina vicino a me", "garage Milano", "officina auto", "carrozzeria Milano", "gommista vicino a me", "cambio olio auto", "tagliando auto"],
});
}

export default function GaragesPage(props: PageProps<"/garages">) {
  return <ProDirectory service={s} type="officina" content={GARAGES_PAGE} searchParams={props.searchParams} registerHref="/professionisti/registrazione-garage" searchCta="Trova un'officina" registerCta="Registra la tua attività" />;
}
