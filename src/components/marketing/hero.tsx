import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/feedback";
import { MEDIA } from "@/config/media";
import { HOME } from "@/content/home";
import { getPublishedContent } from "@/lib/data/content";
import { HeroMedia } from "./hero-media";
import { CarLineArt } from "./illustrations";

export async function HomeHero() {
  // Testi modificabili dal CMS (se pubblicati), altrimenti quelli predefiniti.
  const cms = await getPublishedContent("home.hero");
  const h = { ...HOME.hero, ...(cms ?? {}) };
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden bg-ink text-white">
      {/* Atmosfera: bagliore arancione e griglia sottile */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(55%_70%_at_80%_20%,rgb(244_123_32/0.30),transparent_65%),radial-gradient(40%_50%_at_0%_100%,rgb(255_255_255/0.07),transparent_70%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.06] [background-image:linear-gradient(rgb(255_255_255)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent)]"
      />

      <Container className="grid items-center gap-12 pt-14 pb-16 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-24 lg:pb-24">
        <div className="ag-fade-up flex flex-col gap-7">
          <p className="flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-white/80">
            <span aria-hidden className="size-1.5 rounded-full bg-orange" />
            {h.eyebrow}
          </p>
          <h1 id="hero-title" className="text-[2.6rem] leading-[1.02] font-extrabold text-balance text-white sm:text-6xl xl:text-7xl">
            {h.title} <span className="text-orange">{h.titleAccent}</span>
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-pretty text-white/70 sm:text-xl">{h.subtitle}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={h.primaryCta.href} size="lg" icon={<ArrowRight className="size-5" aria-hidden />}>
              {h.primaryCta.label}
            </ButtonLink>
            <ButtonLink
              href={h.secondaryCta.href}
              size="lg"
              variant="outline"
              className="border-white/25 bg-transparent text-white hover:border-white hover:bg-white/10"
            >
              {h.secondaryCta.label}
            </ButtonLink>
          </div>

          <nav aria-label={h.quickLinksLabel} className="flex flex-col gap-3 pt-2">
            <p className="text-xs font-semibold tracking-[0.16em] text-white/60 uppercase">{h.quickLinksLabel}</p>
            <ul className="flex flex-wrap gap-2">
              {h.quickLinks.map((q) => (
                <li key={q.label}>
                  <Link
                    href={q.href}
                    className="inline-flex h-9 items-center rounded-full border border-white/15 px-4 text-sm font-medium text-white/85 transition-colors hover:border-orange hover:bg-orange/10 hover:text-white"
                  >
                    {q.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="ag-fade-up relative [animation-delay:150ms]">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-graphite to-ink shadow-[0_40px_80px_-20px_rgb(0_0_0/0.6)] lg:aspect-[5/4]">
            <HeroMedia
              video={MEDIA.heroVideo}
              image={MEDIA.heroImage}
              fallback={
                <div className="flex h-full w-full items-center justify-center p-6 sm:p-10">
                  <CarLineArt className="max-w-[560px]" />
                </div>
              }
            />
            <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-white/10 ring-inset" />
          </div>
          {/* Promessa del servizio, non un dato statistico */}
          <div className="absolute -bottom-6 left-4 flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-ink shadow-lift sm:left-8">
            <span className="grid size-10 place-items-center rounded-xl bg-orange-50 text-orange-700">
              <ShieldCheck className="size-5" aria-hidden />
            </span>
            <span className="text-sm leading-tight">
              <strong className="block font-bold">Solo annunci autorizzati</strong>
              <span className="text-muted">e dati essenziali verificati</span>
            </span>
          </div>
        </div>
      </Container>
    </section>
  );
}
