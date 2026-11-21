/** Fuso orario unico delle prenotazioni. */
export const TZ = "Europe/Rome";

const fmt = new Intl.DateTimeFormat("it-IT", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("it-IT", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
const hourFmt = new Intl.DateTimeFormat("it-IT", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

export const formatSlot = (iso: string) => fmt.format(new Date(iso));
export const formatDay = (iso: string) => dayFmt.format(new Date(iso));
export const formatHour = (iso: string) => hourFmt.format(new Date(iso));

/** Scostamento (minuti) di Europe/Rome rispetto a UTC nell'istante indicato. */
function offsetMinutes(at: Date): number {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    .formatToParts(at).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** Converte "AAAA-MM-GGTHH:MM" (ora locale di Milano) in ISO UTC. Restituisce null se non valido. */
export function romeLocalToIso(value: string | null | undefined): string | null {
  const m = value?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  if (!Number.isFinite(guess)) return null;
  let ts = guess - offsetMinutes(new Date(guess)) * 60000;
  ts = guess - offsetMinutes(new Date(ts)) * 60000; // corregge i giorni di cambio dell'ora legale
  return new Date(ts).toISOString();
}

/** Raggruppa gli orari per giorno (in ora di Milano). */
export function groupByDay<T extends { starts_at: string }>(slots: T[]): { day: string; slots: T[] }[] {
  const map = new Map<string, T[]>();
  for (const s of slots) { const d = formatDay(s.starts_at); map.set(d, [...(map.get(d) ?? []), s]); }
  return [...map.entries()].map(([day, list]) => ({ day, slots: list }));
}

export const BOOKING_KINDS: Record<string, string> = {
  visione: "Visione dell'auto",
  test_drive: "Test drive",
  visione_test_drive: "Visione e test drive",
  concessionario: "Appuntamento in concessionaria",
  luogo_concordato: "Incontro in un luogo concordato",
};
export const BOOKING_STATUS: Record<string, { label: string; tone: "neutral" | "orange" | "success" | "danger" | "warning" | "dark" }> = {
  in_attesa: { label: "In attesa di conferma", tone: "warning" },
  confermato: { label: "Confermato", tone: "success" },
  modifica_proposta: { label: "Nuovo orario proposto", tone: "orange" },
  rifiutato: { label: "Rifiutato", tone: "danger" },
  annullato: { label: "Annullato", tone: "neutral" },
  completato: { label: "Completato", tone: "dark" },
  mancata_presentazione: { label: "Mancata presentazione", tone: "danger" },
};
export const WEEKDAYS = ["", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

/** Istante corrente (componenti server: un rendering per richiesta). */
export const nowMs = () => Date.now();
