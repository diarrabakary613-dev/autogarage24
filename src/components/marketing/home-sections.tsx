import { latestListingsCached } from "@/lib/data/listings";
import { ListingCard } from "@/components/marketplace/listing-card";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Building2, Car, Check, ClipboardCheck, Cog, Gauge, Quote, UserRoundCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { HOME, TESTIMONIALS } from "@/content/home";
import { HOME_SERVICE_ORDER, SERVICES, type ServiceArea } from "@/content/services";
import { cn } from "@/lib/utils";
import { CarLineArt, ServiceArt } from "./illustrations";
import { Section, SectionHeading } from "./section";

// ---------------------------------------------------------------------
// AutoGarage24 Neopatentati — sezione di massima visibilità
// ---------------------------------------------------------------------
const PILLAR_ICONS = [Gauge, ClipboardCheck, UserRoundCheck];

export function NeopatentatiHighlight() {
  const n = HOME.neopatentati;
  return (
    <section id="neopatentati" aria-labelledby="neo-title" className="relative scroll-mt-28 bg-white py-16 sm:py-24">
      <div className="mx-auto w-full max-w-[88rem] px-3 sm:px-6 lg:px-8">
        <div className="relative isolate overflow-hidden rounded-[32px] bg-orange px-6 py-12 text-ink sm:px-12 sm:py-16 lg:px-16">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_100%_0%,rgb(255_255_255/0.28),transparent_60%),radial-gradient(50%_60%_at_0%_100%,rgb(17_19_24/0.10),transparent_70%)]"
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 opacity-20 [background-image:radial-gradient(rgb(255_255_255)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_left,black,transparent_70%)]"
          />

          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
            <div className="flex flex-col gap-6">
              <p className="flex w-fit items-center gap-2 rounded-full bg-ink px-3.5 py-1.5 text-xs font-bold tracking-wide text-white">
                <BadgeCheck className="size-4 text-orange" aria-hidden />
                {n.eyebrow}
              </p>
              <h2 id="neo-title" className="text-4xl leading-[1.04] font-extrabold text-balance text-ink sm:text-5xl lg:text-6xl">
                {n.title}
              </h2>
              <p className="max-w-xl text-lg leading-relaxed text-ink/85">{n.description}</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <ButtonLink href={n.primaryCta.href} size="lg" variant="secondary" icon={<ArrowRight className="size-5" aria-hidden />}>
                  {n.primaryCta.label}
                </ButtonLink>
                <ButtonLink
                  href={n.secondaryCta.href}
                  size="lg"
                  variant="outline"
                  className="border-ink/35 bg-transparent text-ink hover:border-ink hover:bg-white/25"
                >
                  {n.secondaryCta.label}
                </ButtonLink>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-3xl bg-ink p-6 shadow-[0_30px_60px_-20px_rgb(17_19_24/0.55)] sm:p-8">
                <CarLineArt />
                <p className="mt-2 text-center text-xs font-semibold tracking-[0.16em] text-white/60 uppercase">
                  La tua prima auto
                </p>
              </div>
            </div>
          </div>

          <ul className="mt-12 grid gap-4 md:grid-cols-3">
            {n.pillars.map((p, i) => {
              const Icon = PILLAR_ICONS[i] ?? Check;
              return (
                <li key={p.title} className="rounded-2xl bg-white p-6 text-ink">
                  <span className="mb-4 grid size-11 place-items-center rounded-xl bg-orange-50 text-orange-700">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mb-1.5 text-lg font-bold">{p.title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{p.text}</p>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mx-auto mt-10 max-w-7xl px-1 sm:px-0">
          <h3 className="mb-4 text-xl font-bold">{n.listingsTitle}</h3>
          <EmptyState
            icon={<Car className="size-8" aria-hidden />}
            title="Nessun annuncio pubblicato per ora"
            description={n.listingsEmpty}
            action={
              <ButtonLink href="/professionisti" variant="outline" size="sm">
                Sei un venditore? Collabora con noi
              </ButtonLink>
            }
          />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------
// Card delle aree commerciali
// ---------------------------------------------------------------------
export function ServiceCard({
  service,
  size = "md",
  tone = "dark",
  headingLevel = "h3",
}: {
  service: ServiceArea;
  size?: "md" | "lg";
  tone?: "dark" | "light";
  headingLevel?: "h2" | "h3";
}) {
  const H = headingLevel;
  return (
    <article
      id={`servizio-${service.key}`}
      className="group relative flex h-full scroll-mt-28 flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <ServiceArt serviceKey={service.key} tone={tone} className={size === "lg" ? "h-52 sm:h-60" : "h-44"} />
      <div className="flex flex-1 flex-col gap-4 p-6 sm:p-7">
        <p className="text-xs font-bold tracking-[0.14em] text-orange-700 uppercase">{service.eyebrow}</p>
        <H className={cn("leading-tight font-extrabold", size === "lg" ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl")}>
          <Link href={service.href} className="after:absolute after:inset-0 focus-visible:outline-none">
            {service.title}
          </Link>
        </H>
        <p className="text-[0.95rem] leading-relaxed text-muted">{service.description}</p>
        <ul className={cn("grid gap-2 text-sm text-graphite", size === "lg" && "sm:grid-cols-2")}>
          {service.benefits.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-orange" aria-hidden />
              {b.replace(/\.$/, "")}
            </li>
          ))}
        </ul>
        <span className="mt-auto flex items-center gap-1.5 pt-2 text-sm font-bold text-ink transition-colors group-hover:text-orange-700 group-has-[a:focus-visible]:text-orange-700">
          {service.cta}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
        </span>
      </div>
      {/* indicatore di focus per l'intera card */}
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl ring-orange group-has-[a:focus-visible]:ring-2" />
    </article>
  );
}

/** Garages, meccanici, auto usate, ricambi, manutenzione — in ordine di priorità. */
export function ServicesShowcase() {
  const [first, second, ...rest] = HOME_SERVICE_ORDER.map((k) => SERVICES[k]);
  return (
    <Section id="servizi" tone="white" labelledBy="servizi-title">
      <SectionHeading id="servizi-title" eyebrow={HOME.services.eyebrow} title={HOME.services.title} />
      <div className="grid gap-5 lg:grid-cols-2">
        <ServiceCard service={first} size="lg" tone="dark" />
        <ServiceCard service={second} size="lg" tone="dark" />
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {rest.map((s) => (
          <ServiceCard key={s.key} service={s} tone="light" />
        ))}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------
// Professionisti
// ---------------------------------------------------------------------
export function ProfessionalsSection() {
  const p = HOME.professionals;
  const icons = [Building2, Cog];
  return (
    <Section id="professionisti" tone="ink" labelledBy="pro-title" className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(45%_60%_at_10%_0%,rgb(244_123_32/0.22),transparent_70%)]"
      />
      <SectionHeading id="pro-title" eyebrow="Per i professionisti" title={p.title} description={p.subtitle} inverted />
      <div className="grid gap-5 md:grid-cols-2">
        {p.cards.map((c, i) => {
          const Icon = icons[i] ?? Building2;
          return (
            <article key={c.title} className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/[0.04] p-7 sm:p-9">
              <span className="grid size-12 place-items-center rounded-xl bg-orange text-white">
                <Icon className="size-6" aria-hidden />
              </span>
              <h3 className="text-2xl font-extrabold text-white">{c.title}</h3>
              <p className="leading-relaxed text-white/70">{c.text}</p>
              <ButtonLink href={c.href} className="mt-auto w-full sm:w-fit" icon={<ArrowRight className="size-4" aria-hidden />}>
                {c.cta}
              </ButtonLink>
            </article>
          );
        })}
      </div>
      <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-white/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-semibold text-white">{p.sellersNote}</p>
        <div className="flex flex-wrap gap-2">
          {p.sellersLinks.map((l) => (
            <ButtonLink
              key={l.href}
              href={l.href}
              variant="outline"
              size="sm"
              className="border-white/25 bg-transparent text-white hover:border-white hover:bg-white/10"
            >
              {l.label}
            </ButtonLink>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------
// Auto presentate dai professionisti della rete (nessun dato inventato)
// ---------------------------------------------------------------------
export function FeaturedCars() {
  const f = HOME.featuredCars;
  return (
    <Section id="auto-selezionate" tone="mist" labelledBy="featured-title">
      <SectionHeading id="featured-title" eyebrow={f.eyebrow} title={f.title} />
      <FeaturedCarsList empty={f.empty} />
    </Section>
  );
}

/** Annunci reali più recenti; se non ce ne sono, uno stato vuoto (nessuna auto di esempio). */
async function FeaturedCarsList({ empty }: { empty: string }) {
  const items = await latestListingsCached(6);
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardCheck className="size-8" aria-hidden />}
        title="Le prime automobili sono in arrivo"
        description={empty}
        action={<ButtonLink href="/auto-usate" variant="outline" size="sm">Vai alle auto usate</ButtonLink>}
      />
    );
  }
  return (
    <>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map((i) => <li key={i.id}><ListingCard item={i} favorite={null} /></li>)}</ul>
      <div className="mt-8 text-center"><ButtonLink href="/auto-usate" variant="outline">Vedi tutte le automobili</ButtonLink></div>
    </>
  );
}

// ---------------------------------------------------------------------
// Come funziona
// ---------------------------------------------------------------------
export function HowItWorks({ id = "come-funziona" }: { id?: string }) {
  const steps = HOME.howItWorks.steps;
  return (
    <Section id={id} tone="white" labelledBy={`${id}-title`}>
      <SectionHeading id={`${id}-title`} eyebrow="Semplice e trasparente" title={HOME.howItWorks.title} align="center" />
      <ol className="relative grid gap-6 md:grid-cols-5 md:gap-4">
        <span aria-hidden className="absolute top-7 right-[10%] left-[10%] hidden h-px bg-line-strong md:block" />
        {steps.map((s, i) => (
          <li key={s.title} className="relative flex gap-4 md:flex-col md:items-center md:text-center">
            <span className="relative grid size-14 shrink-0 place-items-center rounded-2xl border border-line bg-white font-display text-xl font-extrabold text-orange-700 shadow-card">
              {i + 1}
            </span>
            <div>
              <h3 className="text-lg font-bold">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

// ---------------------------------------------------------------------
// Testimonianze: mostrate SOLO se esistono recensioni autentiche
// ---------------------------------------------------------------------
export function Testimonials() {
  if (TESTIMONIALS.length === 0) return null;
  return (
    <Section id="testimonianze" tone="mist" labelledBy="testimonials-title">
      <SectionHeading id="testimonials-title" title={HOME.testimonials.title} />
      <ul className="grid gap-5 md:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <li key={t.author + t.date}>
            <figure className="flex h-full flex-col gap-4 rounded-2xl border border-line bg-white p-6 shadow-card">
              <Quote className="size-6 text-orange" aria-hidden />
              <blockquote className="flex-1 leading-relaxed text-graphite">{t.quote}</blockquote>
              <figcaption className="text-sm">
                <strong className="text-ink">{t.author}</strong> · <span className="text-muted">{t.context}</span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </Section>
  );
}
