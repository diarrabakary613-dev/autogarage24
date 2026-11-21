import { describe, expect, it } from "vitest";
import { BOOKING_KINDS, BOOKING_STATUS, formatHour, groupByDay, romeLocalToIso } from "@/lib/bookings/time";
import { discountPct, OFFER_CATEGORIES } from "@/lib/offers/labels";
import { ROADSIDE_ACTIVE, ROADSIDE_NEXT, ROADSIDE_PROBLEMS, ROADSIDE_SERVICES, ROADSIDE_STATUS, TRANSPORT_STATUS } from "@/lib/services/labels";
import { APPT_STATUS, INSPECTION_CATEGORIES, OUTCOMES, VERIFICATION } from "@/lib/inspection/labels";
import { COVERAGES, PROVINCES, RP_STATUS } from "@/lib/insurance/labels";
import { DISCLAIMER, RELIABILITY, TARGET_STATUS, TRADE_STATUS } from "@/lib/valuation/labels";
import { REGIONS } from "@/lib/geo/regions";

describe("Fuso orario delle prenotazioni (Europe/Rome)", () => {
  it("converte l'ora locale di Milano in UTC con ora solare e legale", () => {
    expect(romeLocalToIso("2026-01-15T10:00")).toBe("2026-01-15T09:00:00.000Z");
    expect(romeLocalToIso("2026-07-15T10:00")).toBe("2026-07-15T08:00:00.000Z");
  });
  it("gestisce il giorno del cambio dell'ora", () => {
    expect(romeLocalToIso("2026-03-29T12:00")).toBe("2026-03-29T10:00:00.000Z");
    expect(romeLocalToIso("2026-10-25T12:00")).toBe("2026-10-25T11:00:00.000Z");
  });
  it("rifiuta valori non validi", () => {
    expect(romeLocalToIso("")).toBeNull();
    expect(romeLocalToIso("2026-13-01")).toBeNull();
    expect(romeLocalToIso(null)).toBeNull();
  });
  it("raggruppa gli orari per giorno e li mostra in ora italiana", () => {
    const g = groupByDay([{ starts_at: "2026-07-15T07:00:00Z" }, { starts_at: "2026-07-15T08:00:00Z" }, { starts_at: "2026-07-16T07:00:00Z" }]);
    expect(g).toHaveLength(2);
    expect(g[0].slots).toHaveLength(2);
    expect(formatHour("2026-07-15T07:00:00Z")).toBe("09:00");
  });
  it("ogni stato e tipo di prenotazione ha un'etichetta", () => {
    expect(Object.keys(BOOKING_STATUS)).toEqual(["in_attesa", "confermato", "modifica_proposta", "rifiutato", "annullato", "completato", "mancata_presentazione"]);
    expect(Object.keys(BOOKING_KINDS)).toHaveLength(5);
  });
});

describe("Offerte", () => {
  it("lo sconto si calcola solo da prezzi coerenti", () => {
    expect(discountPct(10000, 7500)).toBe(25);
    expect(discountPct(10000, 10000)).toBeNull();
    expect(discountPct(0, 100)).toBeNull();
  });
  it("categorie richieste dalla Fase 21", () => {
    for (const k of ["tagliandi", "pneumatici", "freni", "diagnosi", "carrozzeria", "manutenzione", "ricambi", "accessori"]) expect(Object.keys(OFFER_CATEGORIES).join()).toContain(k);
  });
});

describe("Soccorso stradale e trasporti", () => {
  it("ogni problema porta a un servizio esistente", () => {
    for (const p of ROADSIDE_PROBLEMS) expect(ROADSIDE_SERVICES[p.service]).toBeDefined();
  });
  it("le transizioni puntano a stati esistenti e vanno solo in avanti", () => {
    for (const [from, next] of Object.entries(ROADSIDE_NEXT)) for (const n of next) {
      expect(ROADSIDE_STATUS[n]).toBeDefined();
      expect(ROADSIDE_STATUS[n].step).toBeGreaterThanOrEqual(ROADSIDE_STATUS[from].step);
    }
    for (const a of ROADSIDE_ACTIVE) expect(ROADSIDE_STATUS[a]).toBeDefined();
  });
  it("stati del trasporto previsti dalla Fase 28", () => {
    for (const k of ["assegnata", "ritiro_programmato", "ritirato", "in_transito", "consegnato", "completata", "contestata", "annullata"]) expect(TRANSPORT_STATUS[k]).toBeDefined();
  });
  it("20 regioni italiane", () => expect(REGIONS).toHaveLength(20));
});

describe("Revisioni, assicurazioni, valutazioni", () => {
  it("categorie ed esiti della revisione", () => {
    expect(Object.keys(INSPECTION_CATEGORIES)).toContain("pesante");
    expect(Object.keys(OUTCOMES)).toEqual(["regolare", "ripetere", "sospeso"]);
    expect(VERIFICATION.confermato_centro.tone).toBe("success");
    expect(VERIFICATION.dichiarato.tone).not.toBe("success");
    expect(Object.keys(APPT_STATUS)).toContain("mancata_presentazione");
  });
  it("coperture e province", () => {
    expect(COVERAGES.rca.label).toBe("RC Auto");
    expect(PROVINCES).toContain("MI");
    expect(new Set(PROVINCES).size).toBe(PROVINCES.length);
    expect(RP_STATUS.preventivo_disponibile).toBeDefined();
  });
  it("la stima è sempre accompagnata dall'avvertenza", () => {
    expect(DISCLAIMER).toMatch(/non è una perizia/);
    expect(Object.keys(RELIABILITY)).toEqual(["alta", "media", "bassa"]);
    expect(TARGET_STATUS.rifiutata).toBeDefined();
    expect(TRADE_STATUS.controproposta).toBeDefined();
  });
});
