import type { Metadata } from "next";
import { seoMetadata } from "@/lib/seo/overrides";
import { ProDirectory } from "@/components/professionals/directory";
import { MECHANICS_PAGE } from "@/content/professionals";
import { SERVICES } from "@/content/services";

const s = SERVICES.meccanici;

export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/meccanici", {
  title: "Meccanici indipendenti a Milano: assistenza e preventivi",
  description: "Trova meccanici indipendenti ed elettrauto a Milano: competenze dichiarate, zone servite, intervento in sede o mobile. Richiedi assistenza e preventivi online.",
  alternates: { canonical: s.href },
  keywords: ["meccanico indipendente", "meccanico vicino a me", "meccanico a domicilio", "meccanico Milano", "diagnosi auto Milano", "elettrauto Milano"],
});
}

export default function MechanicsPage(props: PageProps<"/meccanici">) {
  return <ProDirectory service={s} type="meccanico" content={MECHANICS_PAGE} searchParams={props.searchParams} registerHref="/professionisti/registrazione-meccanico" searchCta="Trova un meccanico" registerCta="Diventa un professionista" />;
}
