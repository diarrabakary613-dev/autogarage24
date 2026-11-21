import { describe, expect, it } from "vitest";
import { checkPartCompatibility, normalizeCode, type PartCompatibilityRow } from "@/lib/parts/compatibility";

const panda: PartCompatibilityRow = { make_slug: "fiat", model: "Panda", year_from: 2012, year_to: 2023, engine_code: "312A2000", basis: "codice_oem" };
describe("compatibilità ricambi", () => {
  it("verificata con base tecnica, anni e codice motore", () => {
    expect(checkPartCompatibility([panda], { make_slug: "fiat", model: "Panda", year: 2018, engine_code: "312a2000" }).result).toBe("verificata");
  });
  it("solo potenziale se manca il codice motore del veicolo", () => {
    expect(checkPartCompatibility([panda], { make_slug: "fiat", model: "Panda", year: 2018 }).result).toBe("potenziale");
  });
  it("solo potenziale se la base è la dichiarazione del venditore", () => {
    expect(checkPartCompatibility([{ ...panda, basis: "dichiarazione_venditore" }], { make_slug: "fiat", model: "Panda", year: 2018, engine_code: "312A2000" }).result).toBe("potenziale");
  });
  it("da verificare se il motore è diverso", () => {
    expect(checkPartCompatibility([panda], { make_slug: "fiat", model: "Panda", year: 2018, engine_code: "169A4000" }).result).toBe("da_verificare");
  });
  it("da verificare fuori dagli anni o con modello diverso", () => {
    expect(checkPartCompatibility([panda], { make_slug: "fiat", model: "Panda", year: 2008 }).result).toBe("da_verificare");
    expect(checkPartCompatibility([panda], { make_slug: "fiat", model: "Punto", year: 2018 }).result).toBe("da_verificare");
  });
  it("marca e modello da soli non bastano mai per «verificata»", () => {
    const loose: PartCompatibilityRow = { make_slug: "fiat", model: "Panda", basis: "catalogo_produttore" };
    expect(checkPartCompatibility([loose], { make_slug: "fiat", model: "Panda", year: 2018, engine_code: "X" }).result).toBe("potenziale");
  });
  it("nessun dato di compatibilità → da verificare", () => {
    expect(checkPartCompatibility([], { make_slug: "fiat", model: "Panda", year: 2018 }).result).toBe("da_verificare");
    expect(checkPartCompatibility([panda], { make_slug: "fiat", model: "Panda" }).result).toBe("da_verificare");
  });
  it("normalizza i codici OEM", () => {
    expect(normalizeCode(" 77-36.4 56 ab ")).toBe("7736456AB");
  });
});
