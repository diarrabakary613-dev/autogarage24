import type { ReactNode } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/marketing/section";
import { Breadcrumbs, type Crumb } from "@/components/marketing/page-hero";
import { Container } from "@/components/ui/feedback";

export type Cta = { href: string; label: string; variant?: "primary" | "secondary" | "outline" };

/** Hero delle landing: titolo, proposta di valore, CTA tracciate (senza dati personali). */
export function LandingHero({ eyebrow, title, subtitle, ctas, crumbs, aside }: { eyebrow: string; title: ReactNode; subtitle: ReactNode; ctas: Cta[]; crumbs: Crumb[]; aside?: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_85%_10%,rgba(244,123,32,0.22),transparent_60%)]" />
      <Container className="relative grid gap-10 py-14 sm:py-20 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div className="flex flex-col gap-6">
          <Breadcrumbs items={crumbs} inverted />
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange">{eyebrow}</p>
          <h1 className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">{title}</h1>
          <p className="max-w-2xl text-pretty text-lg text-white/75">{subtitle}</p>
          <div className="flex flex-wrap gap-3">
            {ctas.map((c, i) => (
              <ButtonLink key={c.href + c.label} href={c.href} size="lg" variant={c.variant ?? (i === 0 ? "primary" : "outline")} data-track="cta" data-track-label={c.label}>
                {c.label}
              </ButtonLink>
            ))}
          </div>
        </div>
        {aside && <div className="lg:justify-self-end">{aside}</div>}
      </Container>
    </section>
  );
}

export type Feature = { icon: LucideIcon; title: string; text: string; href?: string; cta?: string };

export function FeatureGrid({ id, eyebrow, title, description, items, tone = "white", columns = 3 }: { id: string; eyebrow?: string; title: string; description?: string; items: Feature[]; tone?: "white" | "mist"; columns?: 2 | 3 | 4 }) {
  const cols = columns === 4 ? "lg:grid-cols-4" : columns === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3";
  return (
    <Section id={id} tone={tone} labelledBy={`${id}-t`}>
      <SectionHeading id={`${id}-t`} eyebrow={eyebrow} title={title} description={description} />
      <ul className={`grid gap-5 sm:grid-cols-2 ${cols}`}>
        {items.map(({ icon: Icon, title: t, text, href, cta }) => (
          <li key={t} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-6 shadow-card">
            <span className="grid size-11 place-items-center rounded-xl bg-ink text-orange"><Icon className="size-5" aria-hidden /></span>
            <h3 className="text-lg font-extrabold">{t}</h3>
            <p className="text-muted">{text}</p>
            {href && <Link href={href} data-track="cta" data-track-label={cta ?? t} className="mt-auto font-semibold text-ink underline decoration-orange decoration-2 underline-offset-4 hover:text-orange-700">{cta ?? "Scopri"}</Link>}
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function Steps({ id, title, eyebrow, steps, tone = "mist" }: { id: string; title: string; eyebrow?: string; steps: { title: string; text: string }[]; tone?: "white" | "mist" }) {
  return (
    <Section id={id} tone={tone} labelledBy={`${id}-t`}>
      <SectionHeading id={`${id}-t`} eyebrow={eyebrow} title={title} />
      <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-4 rounded-2xl border border-line bg-white p-5">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-orange font-bold text-ink">{i + 1}</span>
            <span><span className="block font-bold">{s.title}</span><span className="text-sm text-muted">{s.text}</span></span>
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-2">
      {items.map((t) => <li key={t} className="flex gap-2"><Check className="mt-0.5 size-5 shrink-0 text-success" aria-hidden /><span>{t}</span></li>)}
    </ul>
  );
}

export function FaqList({ id, title, items }: { id: string; title: string; items: { q: string; a: string }[] }) {
  return (
    <Section id={id} labelledBy={`${id}-t`}>
      <SectionHeading id={`${id}-t`} eyebrow="Domande frequenti" title={title} />
      <div className="divide-y divide-line rounded-2xl border border-line bg-white">
        {items.map((f) => (
          <details key={f.q} className="group p-5">
            <summary className="cursor-pointer list-none font-semibold marker:hidden">{f.q}</summary>
            <p className="mt-2 text-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

/** Blocco con modulo (candidatura o Beta). */
export function FormSection({ id, eyebrow, title, description, children, side }: { id: string; eyebrow?: string; title: string; description?: ReactNode; children: ReactNode; side?: ReactNode }) {
  return (
    <Section id={id} tone="mist" labelledBy={`${id}-t`}>
      <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr]">
        <div className="flex flex-col gap-4">
          <SectionHeading id={`${id}-t`} eyebrow={eyebrow} title={title} description={description} className="mb-0" />
          {side}
        </div>
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">{children}</div>
      </div>
    </Section>
  );
}

export const BETA_NOTE = "AutoGarage24 è in Beta a Milano e provincia: alcune sezioni possono avere ancora pochi contenuti. Mostriamo solo annunci e professionisti reali.";
