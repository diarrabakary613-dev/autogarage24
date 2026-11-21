import Link from "next/link";
import { ArrowRight, Mail, Phone } from "lucide-react";
import { FOOTER_NAV } from "@/config/navigation";
import { SITE } from "@/config/site";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/feedback";
import { Logo } from "./logo";
import { ConsentPreferencesLink } from "@/components/consent/consent-manager";
import { anyThirdParty } from "@/lib/consent";

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-ink text-white/70">
      {/* Invito finale */}
      <div className="border-b border-white/10">
        <Container className="flex flex-col items-start gap-5 py-10 md:flex-row md:items-center md:justify-between">
          <p className="max-w-xl font-display text-2xl leading-tight font-extrabold text-white sm:text-3xl">
            La tua auto, i tuoi professionisti. <span className="text-orange">Tutto in un unico posto.</span>
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/registrati" icon={<ArrowRight className="size-4" aria-hidden />}>
              Crea un account gratuito
            </ButtonLink>
            <ButtonLink
              href="/professionisti"
              variant="outline"
              className="border-white/25 bg-transparent text-white hover:border-white hover:bg-white/10"
            >
              Sono un professionista
            </ButtonLink>
          </div>
        </Container>
      </div>

      <Container className="grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <Logo inverted />
          <p className="max-w-sm text-sm leading-relaxed">
            L&apos;ecosistema digitale che mette in contatto automobilisti, neopatentati, officine, meccanici e
            venditori. Partiamo da {SITE.area}.
          </p>
          {(SITE.contactEmail || SITE.contactPhone) && (
            <ul className="flex flex-col gap-1.5 text-sm">
              {SITE.contactEmail && (
                <li>
                  <a href={`mailto:${SITE.contactEmail}`} className="flex items-center gap-2 hover:text-orange">
                    <Mail className="size-4" aria-hidden /> {SITE.contactEmail}
                  </a>
                </li>
              )}
              {SITE.contactPhone && (
                <li>
                  <a href={`tel:${SITE.contactPhone.replace(/\s/g, "")}`} className="flex items-center gap-2 hover:text-orange">
                    <Phone className="size-4" aria-hidden /> {SITE.contactPhone}
                  </a>
                </li>
              )}
            </ul>
          )}
          {SITE.socials.length > 0 && (
            <ul className="flex gap-4 text-sm" aria-label="Social network">
              {SITE.socials.map((s) => (
                <li key={s.href}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="hover:text-orange">
                    {s.name}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {FOOTER_NAV.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <p className="mb-3 text-xs font-semibold tracking-widest text-white/60 uppercase">{group.title}</p>
            <ul className="flex flex-col gap-2.5 text-sm">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="transition-colors hover:text-orange">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>

      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-2 py-6 text-xs text-white/60 sm:flex-row sm:justify-between">
          <p>© AutoGarage24. Tutti i diritti riservati.{anyThirdParty() && <> · <ConsentPreferencesLink /></>}</p>
          <p>
            AutoGarage24 mette in contatto utenti e professionisti: non vende direttamente veicoli e non garantisce
            gli interventi dei professionisti.
          </p>
        </Container>
      </div>
    </footer>
  );
}
