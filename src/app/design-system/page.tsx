import type { Metadata } from "next";
import { ArrowRight, Search } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert, Badge, Card, Container, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

const COLORS = [
  { name: "Nero profondo", token: "ink", hex: "#111318", cls: "bg-ink" },
  { name: "Grigio scuro", token: "graphite", hex: "#252A32", cls: "bg-graphite" },
  { name: "Grigio secondario", token: "slate", hex: "#737780", cls: "bg-slate" },
  { name: "Grigio chiaro", token: "mist", hex: "#F4F5F7", cls: "bg-mist border border-line" },
  { name: "Bianco", token: "white", hex: "#FFFFFF", cls: "bg-white border border-line" },
  { name: "Arancione", token: "orange", hex: "#F47B20", cls: "bg-orange" },
];

/** Catalogo dei componenti, utile al proprietario e agli sviluppatori. Non indicizzato. */
export default function DesignSystemPage() {
  return (
    <Container className="flex flex-col gap-14 py-12">
      <header>
        <p className="text-sm font-semibold text-orange-700">Strumento interno</p>
        <h1 className="text-4xl font-extrabold">Design system AutoGarage24</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Colori, tipografia e componenti usati in tutto il sito. Ogni nuova pagina riusa questi elementi per
          mantenere un aspetto coerente.
        </p>
      </header>

      <Section title="Palette">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {COLORS.map((c) => (
            <div key={c.token} className="flex flex-col gap-2">
              <div className={`h-20 rounded-lg ${c.cls}`} />
              <p className="text-sm font-semibold text-ink">{c.name}</p>
              <p className="font-mono text-xs text-muted">{c.hex}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tipografia">
        <div className="flex flex-col gap-3">
          <p className="font-display text-5xl font-extrabold tracking-tight text-ink">Manrope — Titoli</p>
          <p className="font-display text-2xl font-bold text-ink">La tua prima auto merita una scelta intelligente.</p>
          <p className="max-w-2xl text-base leading-relaxed">
            Inter — Testo corrente. Trova automobili adatte ai neopatentati, confronta le caratteristiche e scopri i
            professionisti che possono aiutarti a scegliere con maggiore sicurezza.
          </p>
          <p className="text-sm text-muted">Testo secondario, didascalie e note.</p>
        </div>
      </Section>

      <Section title="Pulsanti">
        <div className="flex flex-wrap items-center gap-3">
          <Button icon={<ArrowRight className="size-4" aria-hidden />}>Primario</Button>
          <Button variant="secondary">Secondario</Button>
          <Button variant="outline">Contorno</Button>
          <Button variant="ghost">Discreto</Button>
          <Button variant="danger">Elimina</Button>
          <Button loading>Caricamento</Button>
          <Button disabled>Disattivato</Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="sm">Piccolo</Button>
          <Button size="md">Medio</Button>
          <Button size="lg">Grande</Button>
          <ButtonLink href="/registrati" variant="outline">
            Link come pulsante
          </ButtonLink>
        </div>
      </Section>

      <Section title="Moduli">
        <Card className="grid max-w-3xl gap-5 sm:grid-cols-2">
          <Field id="ds-search" label="Cerca" hint="Esempio di suggerimento sotto il campo.">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <Input id="ds-search" placeholder="Marca, modello…" className="pl-9" aria-describedby="ds-search-hint" />
            </div>
          </Field>
          <Field id="ds-error" label="Con errore" error="Questo campo è obbligatorio.">
            <Input id="ds-error" invalid aria-describedby="ds-error-error" />
          </Field>
          <Field id="ds-select" label="Alimentazione">
            <Select id="ds-select" defaultValue="">
              <option value="" disabled>
                Seleziona…
              </option>
              <option>Benzina</option>
              <option>Diesel</option>
              <option>Ibrida</option>
              <option>Elettrica</option>
            </Select>
          </Field>
          <Field id="ds-optional" label="Note" optional>
            <Textarea id="ds-optional" rows={2} />
          </Field>
          <Checkbox id="ds-check" label="Casella di spunta con etichetta cliccabile" className="sm:col-span-2" />
        </Card>
      </Section>

      <Section title="Messaggi e badge">
        <div className="grid max-w-3xl gap-3">
          <Alert tone="success" title="Operazione completata">Le modifiche sono state salvate.</Alert>
          <Alert tone="error" title="Errore">Non è stato possibile completare l&apos;operazione.</Alert>
          <Alert tone="warning">Compatibilità da verificare.</Alert>
          <Alert tone="info">Informazione utile per l&apos;utente.</Alert>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Badge>Neutro</Badge>
          <Badge tone="orange">Neopatentati</Badge>
          <Badge tone="success">Identità verificata</Badge>
          <Badge tone="warning">Da monitorare</Badge>
          <Badge tone="danger">Riparazione consigliata</Badge>
          <Badge tone="dark">Amministratore</Badge>
        </div>
      </Section>

      <Section title="Card, caricamento e stati vuoti">
        <div className="grid gap-5 md:grid-cols-3">
          <Card>
            <p className="mb-1 font-display text-lg font-bold">Card</p>
            <p className="text-sm text-muted">Bordi eleganti, angoli arrotondati e ombra discreta.</p>
          </Card>
          <Card className="flex flex-col gap-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </Card>
          <EmptyState title="Nessun annuncio" description="Quando saranno pubblicati annunci reali, appariranno qui." />
        </div>
      </Section>
    </Container>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="border-b border-line pb-3 text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}
