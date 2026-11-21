/**
 * Campi modificabili dal CMS amministrativo (solo testo semplice, niente HTML).
 * Ogni chiave corrisponde a una riga di public.site_content.
 */
export type CmsField = { name: string; label: string; multiline?: boolean; hint?: string };
export const CMS_FIELDS: Record<string, CmsField[]> = {
  "home.hero": [
    { name: "title", label: "Titolo" }, { name: "titleAccent", label: "Seconda riga del titolo (in arancione)" },
    { name: "subtitle", label: "Sottotitolo", multiline: true },
  ],
  "home.neopatentati": [{ name: "title", label: "Titolo" }, { name: "text", label: "Testo", multiline: true }],
  "home.announcement": [
    { name: "text", label: "Testo dell'avviso", multiline: true, hint: "Lascia vuoto o ritira la pubblicazione per non mostrare l'avviso." },
    { name: "link", label: "Collegamento (percorso interno, es. /auto-per-neopatentati)" }, { name: "linkLabel", label: "Testo del collegamento" },
  ],
  "site.contacts": [
    { name: "email", label: "Email pubblica" }, { name: "phone", label: "Telefono pubblico" }, { name: "address", label: "Indirizzo" },
    { name: "company", label: "Ragione sociale" }, { name: "vat", label: "Partita IVA" }, { name: "hours", label: "Orari dell'assistenza" },
  ],
  ...Object.fromEntries(["neopatentati", "garages", "meccanici", "ricambi"].map((k) => [`faq.${k}`, Array.from({ length: 6 }, (_, i) => [
    { name: `q${i + 1}`, label: `Domanda ${i + 1}` }, { name: `a${i + 1}`, label: `Risposta ${i + 1}`, multiline: true },
  ]).flat()])),
};

/** Pulizia lato server: solo stringhe, niente tag, lunghezza massima. */
export function sanitizeCms(key: string, input: Record<string, unknown>): Record<string, string> {
  const fields = CMS_FIELDS[key] ?? [];
  const out: Record<string, string> = {};
  for (const f of fields) {
    const v = input[f.name];
    if (typeof v !== "string") continue;
    const clean = v.replace(/<[^>]*>/g, "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, 2000);
    if (!clean) continue;
    if (f.name === "link" && !/^\/[a-z0-9\-/#?=&]*$/i.test(clean)) continue;
    out[f.name] = clean;
  }
  return out;
}
