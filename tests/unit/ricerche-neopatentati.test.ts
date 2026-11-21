import { describe, expect, it } from "vitest";
import { describeSearch, isSaved, normalizeQuery, parseLast, parseSaved } from "@/lib/marketplace/saved-searches";

describe("Ricerca rapida neopatentati", () => {
  it("tiene solo i parametri della ricerca rapida, in ordine stabile", () => {
    const q = normalizeQuery(new URLSearchParams("citta=Milano&pagina=3&marca=fiat&neo=compatibili&ordina=prezzo_asc&modello=%20"));
    expect(q).toBe("neo=compatibili&marca=fiat&citta=Milano");
  });

  it("descrive la ricerca in modo leggibile", () => {
    expect(describeSearch("neo=compatibili&marca=fiat&modello=Panda&citta=Milano&prezzo_max=8000")).toBe("Fiat Panda · Milano · Fino a 8000 € · Solo compatibili");
    expect(describeSearch("cap=20121")).toBe("CAP 20121 · Compatibili e da verificare");
  });

  it("ignora dati locali non validi senza errori", () => {
    expect(parseLast("non json")).toBeNull();
    expect(parseSaved("{\"a\":1}")).toEqual([]);
    expect(parseSaved(JSON.stringify([{ id: "1", query: "neo=compatibili", label: "x", savedAt: "2026-11-21" }, { id: 2 }]))).toHaveLength(1);
  });

  it("riconosce una ricerca già salvata", () => {
    const saved = [{ id: "1", query: "neo=compatibili&marca=fiat", label: "", savedAt: "" }];
    expect(isSaved("neo=compatibili&marca=fiat", saved)).toBe(true);
    expect(isSaved("neo=compatibili", saved)).toBe(false);
  });
});
