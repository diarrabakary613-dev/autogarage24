/**
 * Restituisce un percorso interno sicuro per i redirect dopo il login.
 * Blocca URL esterni e trucchi come "//sito.com" o "/\\sito.com"
 * (protezione da open redirect).
 */
export function safeNextPath(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string") return fallback;
  const path = value.trim();
  if (!path.startsWith("/")) return fallback;
  if (path.startsWith("//") || path.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(path)) return fallback;
  if (path.length > 512) return fallback;
  // Evita loop verso le pagine di autenticazione
  if (/^\/(accedi|registrati)(\/|\?|$)/.test(path)) return fallback;
  return path;
}
