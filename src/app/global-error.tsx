"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/analytics/report-error";

/** Errore nel layout principale: pagina minima senza dettagli tecnici. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { reportClientError(error); }, [error]);
  return (
    <html lang="it">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "4rem 1.5rem", maxWidth: 560, margin: "0 auto", color: "#111318" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Qualcosa è andato storto</h1>
        <p style={{ color: "#666a73" }}>Si è verificato un errore imprevisto. Riprova tra qualche istante.</p>
        {error.digest && <p style={{ fontFamily: "monospace", fontSize: 12, color: "#666a73" }}>Codice: {error.digest}</p>}
        <button type="button" onClick={reset} style={{ marginTop: 16, minHeight: 44, padding: "0 16px", borderRadius: 8, background: "#111318", color: "#fff", fontWeight: 600, border: 0 }}>Riprova</button>
      </body>
    </html>
  );
}
