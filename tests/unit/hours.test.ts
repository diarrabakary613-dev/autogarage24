import { describe, expect, it } from "vitest";
import { normalizeDay, parseHours } from "@/lib/professionals/hours";

describe("orari di apertura", () => {
  it("accetta fasce valide e «chiuso»", () => {
    expect(normalizeDay("08:30-12:30, 14:00 - 18:30").value).toBe("08:30-12:30, 14:00-18:30");
    expect(normalizeDay("Chiuso").value).toBe("chiuso");
    expect(normalizeDay("").value).toBeUndefined();
    expect(normalizeDay("8.30-12.30").error).toBeDefined();
    expect(normalizeDay("08.30-12.30").value).toBe("08:30-12:30");
  });
  it("rifiuta fasce invertite o malformate", () => {
    expect(normalizeDay("18:00-09:00").error).toBeDefined();
    expect(normalizeDay("tutto il giorno").error).toBeDefined();
    expect(normalizeDay("25:00-26:00").error).toBeDefined();
  });
  it("ignora chiavi sconosciute nel JSON salvato", () => {
    expect(parseHours({ lun: "08:00-12:00", xyz: "1", mar: 5 })).toEqual({ lun: "08:00-12:00" });
  });
});
