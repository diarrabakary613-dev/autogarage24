/**
 * Attribuzione della visita (UTM e pagina d'ingresso) SOLO in memoria:
 * nessun cookie, nessun localStorage/sessionStorage. Si perde chiudendo la
 * scheda, ed è voluto: niente identificativi persistenti sul dispositivo.
 */
export type Attribution = { landing: string | null; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; utm_content: string | null; referrer_host: string | null };

const clean = (v: string | null) => (v ? v.toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 80) || null : null);

let current: Attribution | null = null;
const listeners = new Set<() => void>();
export function subscribeAttribution(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }

export function captureAttribution(pathname: string, search: string, referrer: string): Attribution {
  if (current) return current;
  const q = new URLSearchParams(search);
  let host: string | null = null;
  try {
    const r = referrer ? new URL(referrer).hostname.toLowerCase() : null;
    host = r && r !== window.location.hostname ? r.slice(0, 120) : null;
  } catch { host = null; }
  current = {
    landing: /^\/[a-z0-9/_-]{0,199}$/.test(pathname) ? pathname : null,
    utm_source: clean(q.get("utm_source")), utm_medium: clean(q.get("utm_medium")), utm_campaign: clean(q.get("utm_campaign")),
    utm_content: clean(q.get("utm_content")), referrer_host: host,
  };
  listeners.forEach((fn) => fn());
  return current;
}

export function getAttribution(): Attribution | null {
  return current;
}

/** L'utente ha chiesto di non essere tracciato (Do Not Track o Global Privacy Control). */
export function trackingRefused(): boolean {
  if (typeof navigator === "undefined") return true;
  const n = navigator as Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string };
  return n.doNotTrack === "1" || n.msDoNotTrack === "1" || n.globalPrivacyControl === true;
}

export function deviceClass(): "mobile" | "tablet" | "desktop" {
  const w = typeof window === "undefined" ? 1200 : window.innerWidth;
  return w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop";
}
