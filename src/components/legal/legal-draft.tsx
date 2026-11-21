import type { ReactNode } from "react";
import { Alert, Container } from "@/components/ui/feedback";

/**
 * Impaginazione dei documenti legali.
 * Fino alla revisione di un professionista, ogni documento mostra
 * chiaramente che si tratta di una bozza non definitiva.
 */
export function LegalDraft({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Container className="max-w-3xl py-12 sm:py-16">
      <h1 className="mb-6 text-3xl font-extrabold">{title}</h1>
      <Alert tone="warning" title="Documento in preparazione" className="mb-8">
        Il testo definitivo sarà pubblicato prima del lancio pubblico, dopo la revisione di un consulente legale.
        Quanto riportato qui ha valore solo informativo.
      </Alert>
      <div className="flex flex-col gap-4 leading-relaxed text-graphite [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold">
        {children}
      </div>
    </Container>
  );
}
