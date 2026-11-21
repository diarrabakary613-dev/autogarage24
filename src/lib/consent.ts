/**
 * Consenso per strumenti di terze parti (pixel pubblicitari, Google Analytics 4).
 * Gli ID sono pubblici per natura (vengono inviati al browser); nessuna chiave segreta qui.
 * Se nessun ID è configurato non compare alcun banner e non si carica alcuno script.
 */
export type ThirdParty = { ga4: string | null; googleAds: string | null; metaPixel: string | null; tiktokPixel: string | null };

const id = (v: string | undefined, re: RegExp) => (v && re.test(v.trim()) ? v.trim() : null);

export function thirdPartyIds(): ThirdParty {
  return {
    ga4: id(process.env.NEXT_PUBLIC_GA4_ID, /^G-[A-Z0-9]{4,16}$/),
    googleAds: id(process.env.NEXT_PUBLIC_GOOGLE_ADS_ID, /^AW-[0-9]{6,14}$/),
    metaPixel: id(process.env.NEXT_PUBLIC_META_PIXEL_ID, /^[0-9]{8,20}$/),
    tiktokPixel: id(process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID, /^[A-Z0-9]{10,30}$/),
  };
}

export function anyThirdParty(t: ThirdParty = thirdPartyIds()): boolean {
  return Boolean(t.ga4 || t.googleAds || t.metaPixel || t.tiktokPixel);
}

export type ConsentChoice = { v: 1; analytics: boolean; marketing: boolean; at: string };
export const CONSENT_KEY = "ag24-consent";
export const CONSENT_EVENT = "ag24:consent-open";

export function parseConsent(raw: string | null): ConsentChoice | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(raw) as Partial<ConsentChoice>;
    if (c.v !== 1 || typeof c.analytics !== "boolean" || typeof c.marketing !== "boolean" || typeof c.at !== "string") return null;
    // Il consenso va rinnovato dopo 12 mesi.
    if (Date.parse(c.at) < Date.now() - 365 * 864e5) return null;
    return c as ConsentChoice;
  } catch { return null; }
}
