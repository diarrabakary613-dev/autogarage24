/** Orari di apertura: un testo per giorno (es. "08:30-12:30, 14:00-18:30" oppure "chiuso"). */
export const DAYS = [
  ["lun", "Lunedì"], ["mar", "Martedì"], ["mer", "Mercoledì"], ["gio", "Giovedì"], ["ven", "Venerdì"], ["sab", "Sabato"], ["dom", "Domenica"],
] as const;
export type DayKey = (typeof DAYS)[number][0];
export type OpeningHours = Partial<Record<DayKey, string>>;

const RANGE = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/;

/** Valida un giorno: vuoto, "chiuso" o fasce "HH:MM-HH:MM" separate da virgola (max 3). */
export function normalizeDay(input: string | null | undefined): { value?: string; error?: string } {
  const s = (input ?? "").trim().toLowerCase().replace(/\s+/g, "").replace(/–|—/g, "-").replace(/\./g, ":");
  if (!s) return {};
  if (s === "chiuso") return { value: "chiuso" };
  const parts = s.split(",").filter(Boolean);
  if (parts.length > 3 || !parts.every((p) => RANGE.test(p) && p.split("-")[0] < p.split("-")[1])) {
    return { error: "Usa il formato 08:30-12:30, 14:00-18:30 oppure «chiuso»." };
  }
  return { value: parts.join(", ") };
}

export function parseHours(raw: unknown): OpeningHours {
  if (!raw || typeof raw !== "object") return {};
  const out: OpeningHours = {};
  for (const [k] of DAYS) {
    const v = (raw as Record<string, unknown>)[k];
    if (typeof v === "string" && v.length <= 60) out[k] = v;
  }
  return out;
}
