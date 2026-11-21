import { describe, expect, it } from "vitest";
import { dangerSignals, suggestCategory } from "@/lib/garage/symptoms";

describe("indirizzamento assistenza (non diagnosi)", () => {
  it("riconosce segnali di pericolo", () => {
    expect(dangerSignals("Esce fumo dal cofano e sento odore di bruciato")).toEqual(["fumo", "odore di bruciato"]);
    expect(dangerSignals("Il pedale del freno va a fondo")).toContain("pedale del freno");
    expect(dangerSignals("Rumore leggero dal portellone")).toEqual([]);
  });
  it("suggerisce la categoria di professionista", () => {
    expect(suggestCategory("fischiano le pastiglie")).toBe("freni");
    expect(suggestCategory("la batteria non tiene la carica")).toBe("elettrico");
    expect(suggestCategory("qualcosa di strano")).toBe("altro");
  });
});
