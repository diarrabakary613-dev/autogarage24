import type { Metadata } from "next";
import { seoMetadata } from "@/lib/seo/overrides";
import { Building2, Mail, Phone, User } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { PageHero } from "@/components/marketing/page-hero";
import { Section } from "@/components/marketing/section";
import { SITE } from "@/config/site";

export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/contatti", {
  title: "Contatti",
  description: "Come contattare AutoGarage24 e come entrare nella rete dei professionisti.",
  alternates: { canonical: "/contatti" },
});
}

export default function ContactPage() {
  const hasDirectContacts = Boolean(SITE.contactEmail || SITE.contactPhone);
  return (
    <>
      <PageHero
        eyebrow="Contatti"
        title="Parliamone."
        description="Sei un automobilista con una domanda o un professionista che vuole entrare nella rete di AutoGarage24? Ecco come raggiungerci."
        crumbs={[{ name: "Contatti", href: "/contatti" }]}
      />
      <Section tone="mist">
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-7 shadow-card lg:col-span-1">
            <h2 className="text-xl font-extrabold">Contatti diretti</h2>
            {hasDirectContacts ? (
              <ul className="flex flex-col gap-3">
                {SITE.contactEmail && (
                  <li>
                    <a href={`mailto:${SITE.contactEmail}`} className="flex items-center gap-2 font-semibold text-orange-700 hover:underline">
                      <Mail className="size-4" aria-hidden /> {SITE.contactEmail}
                    </a>
                  </li>
                )}
                {SITE.contactPhone && (
                  <li>
                    <a href={`tel:${SITE.contactPhone.replace(/\s/g, "")}`} className="flex items-center gap-2 font-semibold text-orange-700 hover:underline">
                      <Phone className="size-4" aria-hidden /> {SITE.contactPhone}
                    </a>
                  </li>
                )}
              </ul>
            ) : (
              <Alert tone="info">
                I recapiti ufficiali di AutoGarage24 saranno pubblicati qui prima del lancio pubblico.
              </Alert>
            )}
            <p className="text-sm text-muted">
              Hai bisogno di aiuto, vuoi segnalare un problema o fare un reclamo? Consulta il centro assistenza.
            </p>
            <ButtonLink href="/assistenza" variant="outline" className="mt-auto w-fit">
              Assistenza e domande frequenti
            </ButtonLink>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-7 shadow-card">
            <span className="grid size-11 place-items-center rounded-xl bg-orange-50 text-orange-700">
              <Building2 className="size-5" aria-hidden />
            </span>
            <h2 className="text-xl font-extrabold">Sei un professionista?</h2>
            <p className="text-muted">
              Officine, meccanici e venditori possono registrarsi gratuitamente e presentare la propria attività.
            </p>
            <ButtonLink href="/professionisti" className="mt-auto w-fit">
              Entra nella rete
            </ButtonLink>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-7 shadow-card">
            <span className="grid size-11 place-items-center rounded-xl bg-orange-50 text-orange-700">
              <User className="size-5" aria-hidden />
            </span>
            <h2 className="text-xl font-extrabold">Sei un automobilista?</h2>
            <p className="text-muted">
              Crea un account gratuito per salvare i preferiti, contattare venditori e professionisti e gestire il
              garage della tua auto.
            </p>
            <ButtonLink href="/registrati" variant="outline" className="mt-auto w-fit">
              Crea un account
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
