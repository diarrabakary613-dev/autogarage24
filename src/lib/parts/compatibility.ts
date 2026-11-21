/**
 * Compatibilità ricambio ↔ automobile. Non si basa mai solo su marca e modello:
 * - "verificata": base tecnica affidabile (codice OEM o catalogo confermato dallo staff)
 *   + marca/modello + anno nell'intervallo + codice motore o versione coincidenti;
 * - "potenziale": marca, modello e anno coincidono ma mancano dettagli tecnici
 *   (motore/versione) o la base è solo la dichiarazione del venditore;
 * - "da_verificare": dati insufficienti o nessuna corrispondenza.
 */
export type PartCompatibilityRow = {
  make_slug: string; model: string; generation?: string | null; version?: string | null;
  year_from?: number | null; year_to?: number | null; engine?: string | null; engine_code?: string | null;
  basis: "dichiarazione_venditore" | "codice_oem" | "catalogo_produttore";
};
export type VehicleForParts = {
  make_slug: string | null; model: string | null; version?: string | null; year?: number | null; engine_code?: string | null;
};
export type PartCompatibility = { result: "verificata" | "potenziale" | "da_verificare"; reason: string; row?: PartCompatibilityRow };

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

export function checkPartCompatibility(rows: PartCompatibilityRow[], v: VehicleForParts): PartCompatibility {
  if (!v.make_slug || !v.model) return { result: "da_verificare", reason: "Mancano marca o modello dell'automobile." };
  if (rows.length === 0) return { result: "da_verificare", reason: "Il venditore non ha indicato dati di compatibilità: chiedi conferma prima dell'acquisto." };
  const sameModel = rows.filter((r) => norm(r.make_slug) === norm(v.make_slug) && (norm(r.model) === norm(v.model) || norm(v.model).startsWith(norm(r.model)) && norm(r.model).length >= 3));
  if (sameModel.length === 0) return { result: "da_verificare", reason: "Nessuna corrispondenza con marca e modello indicati dal venditore." };
  if (!v.year) return { result: "da_verificare", reason: "Indica l'anno dell'automobile per controllare l'intervallo di produzione.", row: sameModel[0] };
  const inYears = sameModel.filter((r) => (r.year_from == null || v.year! >= r.year_from) && (r.year_to == null || v.year! <= r.year_to));
  if (inYears.length === 0) return { result: "da_verificare", reason: "L'anno dell'automobile è fuori dagli anni indicati per questo ricambio.", row: sameModel[0] };

  const technical = inYears.find((r) => {
    const reliable = r.basis === "codice_oem" || r.basis === "catalogo_produttore";
    const yearsKnown = r.year_from != null || r.year_to != null;
    const engineMatch = Boolean(r.engine_code && v.engine_code && norm(r.engine_code) === norm(v.engine_code));
    const versionMatch = Boolean(r.version && v.version && norm(r.version) === norm(v.version));
    return reliable && yearsKnown && (engineMatch || versionMatch);
  });
  if (technical) return { result: "verificata", reason: technical.engine_code ? "Corrispondono codice motore, anni e riferimento tecnico." : "Corrispondono versione, anni e riferimento tecnico.", row: technical };

  const conflicting = inYears.every((r) => (r.engine_code && v.engine_code && norm(r.engine_code) !== norm(v.engine_code)) || (r.version && v.version && norm(r.version) !== norm(v.version) && !r.engine_code));
  if (conflicting) return { result: "da_verificare", reason: "La versione o il motore indicati non coincidono con quelli dell'automobile.", row: inYears[0] };
  return { result: "potenziale", reason: "Marca, modello e anno coincidono, ma mancano dati tecnici (motore o versione) per confermarlo: verifica con il venditore o un professionista.", row: inYears[0] };
}

/** Normalizzazione dei codici OEM/produttore per la ricerca (stessa regola della colonna generata nel database). */
export function normalizeCode(code: string | null | undefined): string {
  return (code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}
