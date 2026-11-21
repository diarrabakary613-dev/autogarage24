import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, MapPin, Search } from "lucide-react";
import { HEADER_CTAS, MAIN_NAV } from "@/config/navigation";
import { SITE } from "@/config/site";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/feedback";
import { t } from "@/i18n";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { NavLinks, NavLinksStatic } from "./nav-links";
import { UserNav, UserNavFallback } from "./user-nav";

export function SiteHeader() {
  return (
    <>
      <a
        href="#contenuto"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
      >
        Vai al contenuto
      </a>

      {/* Barra superiore: area servita e accesso rapido per i professionisti */}
      <div className="hidden bg-ink text-white/70 md:block">
        <Container className="flex h-9 items-center justify-between text-xs">
          <p className="flex items-center gap-1.5">
            <MapPin className="size-3.5 text-orange" aria-hidden />
            Attivi a {SITE.area}
          </p>
          <Link
            href={HEADER_CTAS.professional.href}
            className="flex items-center gap-1 font-semibold text-white transition-colors hover:text-orange"
          >
            {HEADER_CTAS.professional.label}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </Container>
      </div>

      <header className="sticky top-0 z-50 border-b border-line/80 bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
        <Container className="flex h-16 items-center justify-between gap-4">
          <Logo />

          <nav aria-label={t.nav.mainNavigation} className="hidden flex-1 justify-center xl:flex">
            <Suspense fallback={<NavLinksStatic items={MAIN_NAV} variant="desktop" />}>
              <NavLinks items={MAIN_NAV} variant="desktop" />
            </Suspense>
          </nav>

          <div className="hidden items-center gap-2 xl:flex">
            <ButtonLink
              href={HEADER_CTAS.service.href}
              variant="outline"
              size="sm"
              icon={<Search className="size-4" aria-hidden />}
            >
              {HEADER_CTAS.service.label}
            </ButtonLink>
            <Suspense fallback={<UserNavFallback />}>
              <UserNav />
            </Suspense>
          </div>

          <Suspense fallback={<span aria-hidden className="size-11 xl:hidden" />}>
          <MobileMenu>
            <nav aria-label={t.nav.mainNavigation}>
              <NavLinks items={MAIN_NAV} variant="mobile" />
            </nav>
            <div className="mt-5 grid gap-2 border-t border-line pt-5 sm:grid-cols-2">
              <ButtonLink
                href={HEADER_CTAS.service.href}
                variant="primary"
                className="w-full"
                icon={<Search className="size-4" aria-hidden />}
              >
                {HEADER_CTAS.service.label}
              </ButtonLink>
              <ButtonLink href={HEADER_CTAS.professional.href} variant="secondary" className="w-full">
                {HEADER_CTAS.professional.label}
              </ButtonLink>
            </div>
            <div className="mt-5 border-t border-line pt-5">
              <Suspense fallback={<UserNavFallback />}>
                <UserNav layout="column" />
              </Suspense>
            </div>
          </MobileMenu>
          </Suspense>
        </Container>
      </header>
    </>
  );
}
