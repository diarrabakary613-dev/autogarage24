import { describe, expect, it } from "vitest";
import { buildSegment, describeSegment, pickVariant, safeInternalPath } from "@/lib/growth/labels";
import { anyThirdParty, parseConsent } from "@/lib/consent";

describe("Growth Engine", () => {
  it("segmento: solo chiavi e valori ammessi", () => {
    expect(buildSegment({ citta: " Milano ", ruolo: "neopatentati", inattivi: 30, campagna: "lancio_milano" })).toEqual({ citta: "Milano", ruolo: "neopatentati", inattivi_giorni: "30", campagna: "lancio_milano" });
    expect(buildSegment({ ruolo: "admin", campagna: "DROP TABLE", inattivi: -1 })).toEqual({});
    expect(describeSegment({})).toBe("Tutti gli utenti attivi");
  });
  it("percorsi interni sicuri", () => {
    expect(safeInternalPath("/registrati")).toBe("/registrati");
    expect(safeInternalPath("//evil.example")).toBeNull();
    expect(safeInternalPath("https://evil.example")).toBeNull();
    expect(safeInternalPath("/x?y=1&z=2")).toBe("/x?y=1&z=2");
    expect(safeInternalPath("javascript:alert(1)")).toBeNull();
  });
  it("variante: B solo con esperimento attivo", () => {
    for (let i = 0; i < 50; i++) expect(pickVariant(false)).toBe("a");
    const seen = new Set(Array.from({ length: 200 }, () => pickVariant(true)));
    expect(seen.has("a") && seen.has("b")).toBe(true);
  });
  it("consenso: formato, scadenza a 12 mesi, nessun ID = nessun banner", () => {
    expect(parseConsent(JSON.stringify({ v: 1, analytics: true, marketing: false, at: new Date().toISOString() }))?.analytics).toBe(true);
    expect(parseConsent(JSON.stringify({ v: 1, analytics: true, marketing: true, at: "2020-01-01T00:00:00Z" }))).toBeNull();
    expect(parseConsent("non json")).toBeNull();
    expect(anyThirdParty({ ga4: null, googleAds: null, metaPixel: null, tiktokPixel: null })).toBe(false);
  });
});
