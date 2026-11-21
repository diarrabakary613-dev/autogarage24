import { describe, expect, it } from "vitest";
import { benefitText, fmtPoints, tierProgress, type Tier } from "@/lib/rewards/labels";

const t = (code: string, min: number, sort: number): Tier => ({ code, name: code, min_points: min, bonus_pct: 0, benefits: [], sort });

describe("Rewards", () => {
  it("avanzamento livello", () => {
    expect(tierProgress({ tier: t("bronze", 0, 1), next_tier: t("silver", 500, 2), tier_points: 250 })).toBe(50);
    expect(tierProgress({ tier: t("bronze", 0, 1), next_tier: t("silver", 500, 2), tier_points: 900 })).toBe(100);
    expect(tierProgress({ tier: t("platinum", 4000, 4), next_tier: null, tier_points: 10 })).toBe(100);
    expect(tierProgress({ tier: t("silver", 500, 2), next_tier: t("gold", 1500, 3), tier_points: 400 })).toBe(0);
  });
  it("descrizione del premio", () => {
    expect(benefitText("percentuale", 10)).toBe("Sconto del 10%");
    expect(benefitText("importo", 20)).toBe("Sconto di 20 €");
    expect(benefitText("servizio", null)).toBe("Servizio o omaggio");
  });
  it("punti formattati senza simboli monetari", () => {
    expect(fmtPoints(15000)).toMatch(/15\.000 punti/);
    expect(fmtPoints(null)).toBe("0 punti");
    expect(fmtPoints(1500)).not.toMatch(/€/);
  });
});
