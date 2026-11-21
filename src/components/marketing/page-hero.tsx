import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Container } from "@/components/ui/feedback";
import { getSiteUrl } from "@/lib/env";
import type { ServiceKey } from "@/content/services";
import { JsonLd } from "./json-ld";
import { ServiceArt } from "./illustrations";

export type Crumb = { name: string; href: string };

/** Breadcrumb visibile + dati strutturati BreadcrumbList. */
export function Breadcrumbs({ items, inverted = false }: { items: Crumb[]; inverted?: boolean }) {
  const all: Crumb[] = [{ name: "Home", href: "/" }, ...items];
  const site = getSiteUrl();
  return (
    <>
      <nav aria-label="Percorso di navigazione">
        <ol className={`flex flex-wrap items-center gap-1 text-sm ${inverted ? "text-white/55" : "text-muted"}`}>
          {all.map((c, i) => {
            const last = i === all.length - 1;
            return (
              <li key={c.href} className="flex items-center gap-1">
                {last ? (
                  <span aria-current="page" className={inverted ? "font-medium text-white" : "font-medium text-ink"}>
                    {c.name}
                  </span>
                ) : (
                  <>
                    <Link href={c.href} className={inverted ? "hover:text-white" : "hover:text-ink"}>
                      {c.name}
                    </Link>
                    <ChevronRight className="size-3.5 opacity-60" aria-hidden />
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: all.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.name,
            item: `${site}${c.href === "/" ? "" : c.href}`,
          })),
        }}
      />
    </>
  );
}

/** Intestazione delle pagine dedicate, coerente con la hero della homepage. */
export function PageHero({
  eyebrow,
  title,
  description,
  crumbs,
  serviceKey,
  actions,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  crumbs: Crumb[];
  serviceKey?: ServiceKey;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-ink text-white">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(50%_80%_at_90%_0%,rgb(244_123_32/0.25),transparent_65%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.05] [background-image:linear-gradient(rgb(255_255_255)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255)_1px,transparent_1px)] [background-size:64px_64px]"
      />
      <Container className="grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.4fr_1fr] lg:py-20">
        <div className="flex flex-col gap-5">
          <Breadcrumbs items={crumbs} inverted />
          <p className="text-xs font-bold tracking-[0.16em] text-orange uppercase">{eyebrow}</p>
          <h1 className="text-4xl leading-[1.05] font-extrabold text-balance text-white sm:text-5xl">{title}</h1>
          <p className="max-w-2xl text-lg leading-relaxed text-white/70">{description}</p>
          {actions && <div className="flex flex-col gap-3 pt-1 sm:flex-row">{actions}</div>}
          {children}
        </div>
        {serviceKey && (
          <ServiceArt
            serviceKey={serviceKey}
            tone="orange"
            className="hidden aspect-[4/3] rounded-[28px] shadow-[0_30px_60px_-20px_rgb(0_0_0/0.6)] lg:block"
          />
        )}
      </Container>
    </section>
  );
}
