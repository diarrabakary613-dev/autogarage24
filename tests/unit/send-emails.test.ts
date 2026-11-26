import { describe, expect, it } from "vitest";
import { MAX_ATTEMPTS, classify, headersFor, isDue, marketingIsSendable, oneClickUnsubscribeUrl, render } from "../../supabase/functions/send-emails/lib";

const SITE = "https://autogarage24.netlify.app";
const TOKEN = "a".repeat(40);

describe("Invio email: contenuto", () => {
  it("le promozionali hanno sempre il link di disiscrizione e il pulsante scelto", () => {
    const { html, text } = render({ title: "Novità", body: "Testo", link: "/offerte", cta_label: "Scopri le offerte", unsubscribe_path: `/disiscriviti/${TOKEN}` }, SITE, "marketing");
    expect(html).toContain(`${SITE}/disiscriviti/${TOKEN}`);
    expect(html).toContain("Scopri le offerte");
    expect(text).toContain(`Disiscriviti: ${SITE}/disiscriviti/${TOKEN}`);
  });

  it("le transazionali non hanno disiscrizione promozionale e usano il pulsante predefinito", () => {
    const { html } = render({ title: "Nuova richiesta", body: "x", link: "/dashboard/richieste/1" }, SITE, "nuova_richiesta");
    expect(html).not.toContain("disiscriviti");
    expect(html).toContain("Apri su AutoGarage24");
    expect(html).toContain(`${SITE}/dashboard/richieste/1`);
  });

  it("niente link esterni e testo sempre neutralizzato", () => {
    const { html } = render({ title: "<script>x</script>", body: "a", link: "//evil.example" }, SITE, "nuovo_messaggio");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("evil.example");
  });

  it("intestazioni di disiscrizione con un clic solo per le promozionali", () => {
    const p = { unsubscribe_path: `/disiscriviti/${TOKEN}` };
    expect(headersFor(p, SITE, "marketing")).toEqual({ "List-Unsubscribe": `<${SITE}/api/disiscrizione/${TOKEN}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" });
    expect(headersFor(p, SITE, "nuova_richiesta")).toEqual({});
    expect(oneClickUnsubscribeUrl({ unsubscribe_path: "/disiscriviti/../x" }, SITE)).toBeNull();
  });

  it("una promozionale senza disiscrizione valida non è inviabile", () => {
    expect(marketingIsSendable({}, SITE)).toBe(false);
    expect(marketingIsSendable({ unsubscribe_path: "/altro" }, SITE)).toBe(false);
    expect(marketingIsSendable({ unsubscribe_path: `/disiscriviti/${TOKEN}` }, SITE)).toBe(true);
  });
});

describe("Invio email: tentativi", () => {
  const created = "2026-11-26T10:00:00Z";
  it("attesa crescente tra i tentativi", () => {
    expect(isDue({ attempts: 0, created_at: created }, new Date("2026-11-26T10:00:00Z"))).toBe(true);
    expect(isDue({ attempts: 1, created_at: created }, new Date("2026-11-26T10:04:00Z"))).toBe(false);
    expect(isDue({ attempts: 1, created_at: created }, new Date("2026-11-26T10:05:00Z"))).toBe(true);
    expect(isDue({ attempts: 2, created_at: created }, new Date("2026-11-26T10:19:00Z"))).toBe(false);
    expect(isDue({ attempts: MAX_ATTEMPTS, created_at: created }, new Date("2027-01-01T00:00:00Z"))).toBe(false);
  });

  it("classifica le risposte del provider", () => {
    expect(classify(200)).toBe("ok");
    expect(classify(422)).toBe("permanent");
    expect(classify(422, "invalid_from_address")).toBe("config");
    expect(classify(403)).toBe("config");
    expect(classify(429)).toBe("rate_limited");
    expect(classify(429, "daily_quota_exceeded")).toBe("rate_limited");
    expect(classify(500)).toBe("retry");
    expect(classify(null)).toBe("retry");
  });
});
