/**
 * Dati strutturati Schema.org (JSON-LD) per i motori di ricerca.
 * Il contenuto è generato dal server a partire da dati controllati.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // L'escape di "<" impedisce di chiudere il tag script dall'interno dei dati.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
