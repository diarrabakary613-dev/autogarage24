"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { reportClientError } from "@/lib/analytics/report-error";
import { Container } from "@/components/ui/feedback";

/** Pagina mostrata in caso di errore imprevisto. Non espone dettagli tecnici. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const missingConfig = error.message?.includes("Variabile d'ambiente mancante");
  useEffect(() => { if (!missingConfig) reportClientError(error); }, [error, missingConfig]);
  return (
    <Container className="flex max-w-xl flex-col items-start gap-4 py-20">
      <h1 className="text-2xl font-extrabold">Qualcosa è andato storto</h1>
      <p className="text-muted">
        {missingConfig
          ? "Il sito non è ancora collegato al database. Consulta docs/ENVIRONMENT.md per completare la configurazione."
          : "Si è verificato un errore imprevisto. Riprova tra qualche istante."}
      </p>
      {error.digest && <p className="font-mono text-xs text-muted">Codice: {error.digest}</p>}
      <Button onClick={reset}>Riprova</Button>
    </Container>
  );
}
