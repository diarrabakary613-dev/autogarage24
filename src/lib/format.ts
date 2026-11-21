const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const euroCents = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
const integer = new Intl.NumberFormat("it-IT");

/** Prezzo in euro da centesimi (es. 1150000 → "11.500 €"). */
export function formatPrice(cents: number | null | undefined, withCents = false): string {
  if (cents === null || cents === undefined) return "Prezzo non indicato";
  return (withCents ? euroCents : euro).format(cents / 100);
}

export function formatKm(km: number | null | undefined): string {
  return km === null || km === undefined ? "—" : `${integer.format(km)} km`;
}

export function formatNumber(n: number | null | undefined, suffix = ""): string {
  return n === null || n === undefined ? "—" : `${integer.format(n)}${suffix}`;
}

/** kW → CV (1 kW = 1,35962 CV), arrotondato. */
export function kwToCv(kw: number | null | undefined): number | null {
  return kw === null || kw === undefined ? null : Math.round(kw * 1.35962);
}

export function formatPower(kw: number | null | undefined): string {
  if (kw === null || kw === undefined) return "—";
  return `${integer.format(kw)} kW (${kwToCv(kw)} CV)`;
}

/** Converte "11.500,50" o "11500" in centesimi. Restituisce null se non valido. */
export function parseEuroToCents(value: string | null | undefined): number | null {
  if (!value) return null;
  const clean = value.replace(/[€\s]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = Number(clean);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "adesso";
  if (diff < 3600) return `${Math.floor(diff / 60)} min fa`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h fa`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)} g fa`;
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", timeZone: "Europe/Rome" });
}
