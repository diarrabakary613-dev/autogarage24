import { describe, expect, it } from "vitest";
import { addMonths, driverSituation, evaluateVehicle, ruleForLicense, type RuleVersion } from "@/lib/neopatentati/engine";

// Parametri identici alle versioni caricate dalla migrazione 0010.
const P2024 = { license_categories: ["B"], duration_months: 36, max_power_to_tare_kw_t: 75, max_power_kw: 105, max_power_kw_categories: ["M1"], borderline_margin_pct: 2, documented_ratio_required_for_fuels: ["elettrica", "ibrida_plugin"] };
const P2011 = { ...P2024, duration_months: 12, max_power_to_tare_kw_t: 55, max_power_kw: 70 };
const versions: RuleVersion[] = [
  { id: "v2011", version_label: "2011", status: "pubblicata", license_obtained_from: null, license_obtained_to: "2024-12-13", effective_from: "2011-02-09", effective_to: null, params: P2011 },
  { id: "v2024", version_label: "2024", status: "pubblicata", license_obtained_from: "2024-12-14", license_obtained_to: null, effective_from: "2024-12-14", effective_to: null, params: P2024 },
  { id: "bozza", version_label: "bozza futura", status: "bozza", license_obtained_from: "2024-12-14", license_obtained_to: null, effective_from: "2025-01-01", effective_to: null, params: { ...P2024, max_power_kw: 200 } },
];
const car = (o: Partial<Parameters<typeof evaluateVehicle>[0]> = {}) => ({ power_kw: 51, tare_kg: 1000, power_to_tare_documented: null, fuel: "benzina", vehicle_category: "M1", ...o });

describe("evaluateVehicle — regola 2024", () => {
  it("compatibile quando potenza e rapporto sono entro i limiti", () => {
    const e = evaluateVehicle(car(), P2024);
    expect(e.result).toBe("compatibile");
    expect(e.ratio).toBe(51);
    expect(e.ratio_source).toBe("calcolato");
  });
  it("non compatibile oltre 105 kW anche con rapporto basso", () => {
    expect(evaluateVehicle(car({ power_kw: 110, tare_kg: 2000 }), P2024).result).toBe("non_compatibile");
  });
  it("esattamente 105 kW è entro il limite", () => {
    expect(evaluateVehicle(car({ power_kw: 105, tare_kg: 1600 }), P2024).result).toBe("compatibile");
  });
  it("non compatibile se il rapporto supera 75 kW/t", () => {
    expect(evaluateVehicle(car({ power_kw: 100, tare_kg: 1200 }), P2024).result).toBe("non_compatibile");
  });
  it("da verificare se il rapporto calcolato è nel margine del 2%", () => {
    const e = evaluateVehicle(car({ power_kw: 74, tare_kg: 1000 }), P2024);
    expect(e.result).toBe("da_verificare");
    expect(e.reasons[1]).toMatch(/troppo vicino/);
  });
  it("con rapporto documentato non si applica il margine", () => {
    expect(evaluateVehicle(car({ power_kw: 74, tare_kg: 1000, power_to_tare_documented: 74.9 }), P2024).result).toBe("compatibile");
    expect(evaluateVehicle(car({ power_kw: 74, tare_kg: 1000, power_to_tare_documented: 75.1 }), P2024).result).toBe("non_compatibile");
  });
  it("dati mancanti → da verificare, mai compatibile", () => {
    const noPower = evaluateVehicle(car({ power_kw: null }), P2024);
    expect(noPower.result).toBe("da_verificare");
    expect(noPower.missing).toContain("potenza (kW)");
    const noTare = evaluateVehicle(car({ tare_kg: null }), P2024);
    expect(noTare.result).toBe("da_verificare");
    expect(noTare.missing).toContain("tara o rapporto potenza/tara");
  });
  it("dati mancanti non nascondono un superamento certo", () => {
    expect(evaluateVehicle(car({ power_kw: 120, tare_kg: null }), P2024).result).toBe("non_compatibile");
  });
  it("elettriche e plug-in richiedono il rapporto documentato", () => {
    expect(evaluateVehicle(car({ fuel: "elettrica" }), P2024).result).toBe("da_verificare");
    expect(evaluateVehicle(car({ fuel: "ibrida_plugin", power_to_tare_documented: 50 }), P2024).result).toBe("compatibile");
  });
  it("il limite di potenza assoluto vale solo per le categorie indicate (M1)", () => {
    expect(evaluateVehicle(car({ power_kw: 110, tare_kg: 2500, vehicle_category: "N1" }), P2024).result).toBe("compatibile");
  });
  it("versioni diverse dello stesso modello danno esiti diversi", () => {
    const base = evaluateVehicle(car({ power_kw: 70, tare_kg: 1150 }), P2024);
    const sport = evaluateVehicle(car({ power_kw: 147, tare_kg: 1300 }), P2024);
    expect(base.result).toBe("compatibile");
    expect(sport.result).toBe("non_compatibile");
  });
  it("valori non validi (zero o negativi) sono trattati come mancanti", () => {
    expect(evaluateVehicle(car({ power_kw: 0 }), P2024).result).toBe("da_verificare");
    expect(evaluateVehicle(car({ tare_kg: -5 }), P2024).missing).toContain("tara o rapporto potenza/tara");
  });
});

describe("evaluateVehicle — regola 2011", () => {
  it("limiti più stringenti: 70 kW e 55 kW/t", () => {
    expect(evaluateVehicle(car({ power_kw: 51, tare_kg: 1000 }), P2011).result).toBe("compatibile");
    expect(evaluateVehicle(car({ power_kw: 74, tare_kg: 1100 }), P2011).result).toBe("non_compatibile");
    expect(evaluateVehicle(car({ power_kw: 60, tare_kg: 1000 }), P2011).result).toBe("non_compatibile");
  });
});

describe("selezione della regola e situazione del conducente", () => {
  it("regime transitorio: patente fino al 13/12/2024 → regola 2011", () => {
    expect(ruleForLicense(versions, "2024-12-13", "2026-11-19")?.id).toBe("v2011");
    expect(ruleForLicense(versions, "2024-12-14", "2026-11-19")?.id).toBe("v2024");
  });
  it("le bozze non vengono mai applicate", () => {
    expect(ruleForLicense(versions, "2025-06-01", "2026-11-19")?.id).toBe("v2024");
  });
  it("periodo terminato per la regola 2011 dopo 12 mesi", () => {
    const s = driverSituation(versions, "2024-06-01", "B", "2026-11-19");
    expect(s.kind).toBe("expired");
  });
  it("limiti in corso per patente 2025 (36 mesi)", () => {
    const s = driverSituation(versions, "2025-03-10", "B", "2026-11-19");
    expect(s.kind).toBe("limited");
    if (s.kind === "limited") expect(s.endsOn).toBe("2028-03-10");
  });
  it("data futura o non valida", () => {
    expect(driverSituation(versions, "2027-01-01", "B", "2026-11-19").kind).toBe("invalid");
    expect(driverSituation(versions, "01/01/2025", "B", "2026-11-19").kind).toBe("invalid");
  });
  it("categoria non coperta dal calcolatore", () => {
    expect(driverSituation(versions, "2025-03-10", "A2", "2026-11-19").kind).toBe("category_not_covered");
  });
  it("nessuna regola pubblicata → da verificare", () => {
    expect(driverSituation([], "2025-03-10", "B", "2026-11-19").kind).toBe("no_rule");
  });
  it("addMonths gestisce fine mese e anni bisestili", () => {
    expect(addMonths("2024-02-29", 12)).toBe("2025-02-28");
    expect(addMonths("2025-01-31", 1)).toBe("2025-02-28");
    expect(addMonths("2024-12-14", 36)).toBe("2027-12-14");
  });
});
