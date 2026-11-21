import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BRANDS, brandHref } from "@/config/brands";
import { HOME } from "@/content/home";
import { Section, SectionHeading } from "./section";

/**
 * Logo marquee: fascia di marchi a scorrimento continuo.
 * - Pausa al passaggio del mouse e quando un link riceve il focus da tastiera.
 * - Con "riduci animazioni" diventa un elenco statico.
 * - Solo testo: nessuna immagine da caricare.
 */
export function BrandMarquee() {
  const items = (duplicate: boolean) =>
    BRANDS.map((b) => (
      <li key={`${b.slug}${duplicate ? "-dup" : ""}`} className="flex shrink-0 items-center">
        <Link
          href={brandHref(b)}
          tabIndex={duplicate ? -1 : undefined}
          className="rounded-md px-6 py-2 font-display text-xl font-extrabold tracking-tight whitespace-nowrap text-muted transition-colors hover:text-ink sm:px-9 sm:text-2xl"
        >
          {b.name}
        </Link>
        <span aria-hidden className="size-1.5 rounded-full bg-orange/60" />
      </li>
    ));

  return (
    <section aria-label={HOME.marquee.label} className="border-y border-line bg-white py-6 sm:py-8">
      <div className="ag-marquee relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="ag-marquee-track flex w-max">
          <ul className="flex">{items(false)}</ul>
          <ul className="ag-marquee-duplicate flex" aria-hidden>
            {items(true)}
          </ul>
        </div>
      </div>
      <p className="sr-only">{HOME.marquee.disclaimer}</p>
    </section>
  );
}

/** Griglia di marchi cliccabili: apre il marketplace filtrato per marca. */
export function BrandGrid() {
  return (
    <Section id="marchi" tone="mist" labelledBy="marchi-title">
      <SectionHeading id="marchi-title" eyebrow="Ricerca per marca" title={HOME.brandGrid.title} description={HOME.brandGrid.description} />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
        {BRANDS.map((b) => (
          <li key={b.slug}>
            <Link
              href={brandHref(b)}
              className="group flex h-24 flex-col justify-between rounded-xl border border-line bg-white p-4 shadow-card transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-orange/50 hover:shadow-lift"
            >
              <ArrowUpRight
                className="size-4 self-end text-line-strong transition-colors group-hover:text-orange"
                aria-hidden
              />
              <span className="font-display text-lg font-extrabold tracking-tight text-ink">{b.name}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs text-muted">{HOME.marquee.disclaimer}</p>
    </Section>
  );
}
