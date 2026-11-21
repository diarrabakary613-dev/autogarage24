"use client";

/** Apre la stampa del browser: da lì si salva il report in PDF. */
export function PrintButton() {
  return <button type="button" onClick={() => window.print()} className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white print:hidden">Stampa o salva in PDF</button>;
}
