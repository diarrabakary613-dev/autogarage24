import { describe, expect, it } from "vitest";
import { AUDIENCES, BY_AUDIENCE, generateBrief } from "@/lib/marketing/brief";
import { significance } from "@/lib/marketing/stats";
import { CRM_STATUS_KEYS, PIPELINE, neighbours, statusTone } from "@/lib/crm";
import { validateFile } from "@/lib/storage";
import { PROBLEM_LABELS, INQUIRY_LABELS } from "@/lib/labels";

describe("Generatore di brief (regole, non IA)", () => {
  it("produce tutti i campi richiesti per un video neopatentati", () => {
    const b = generateBrief({ audience: "neopatentati", service: "neopatentati", objective: "traffico", channel: "instagram", format: "reel", tone: "rassicurante" });
    for (const k of ["idea", "hook", "script", "body", "headline", "cta", "visual_brief", "generation_prompt"] as const) expect(b[k].length).toBeGreaterThan(10);
    expect(b.duration_seconds).toBe(15);
    expect(b.variants).toHaveLength(3);
    expect(b.headline).toBe("La tua prima auto merita una scelta intelligente.");
  });
  it("non promette risultati garantiti né sicurezza assoluta", () => {
    for (const a of Object.keys(AUDIENCES) as (keyof typeof AUDIENCES)[]) {
      const b = generateBrief({ audience: a, service: "piattaforma", objective: "notorieta", channel: "facebook", format: "post", tone: "diretto" });
      const all = `${b.body} ${b.headline} ${b.hook}`.toLowerCase();
      expect(all).not.toMatch(/garantit|sicurezza assoluta|100%|clienti assicurati/);
    }
  });
  it("i prompt visivi escludono loghi, targhe e watermark", () => {
    const b = generateBrief({ audience: "officine", service: "officine", objective: "candidature", channel: "linkedin", format: "post", tone: "professionale" });
    expect(b.generation_prompt).toMatch(/no visible car brand logos/);
    expect(b.generation_prompt).toMatch(/no readable license plates/);
    expect(b.generation_prompt).toMatch(/no watermark/);
    expect(b.duration_seconds).toBeNull();
  });
  it("ogni pubblico ha una landing esistente", () => {
    const pages = ["/prima-auto", "/auto-usate", "/trova-officina", "/diventa-officina-partner", "/diventa-partner", "/diventa-concessionario-partner", "/milano"];
    for (const s of Object.values(BY_AUDIENCE)) expect(pages).toContain(s.landing);
  });
});

describe("Esperimenti: significatività", () => {
  it("rifiuta conclusioni con meno di 100 osservazioni", () => {
    expect(significance(50, 10, 60, 20).verdict).toBe("dati_insufficienti");
    expect(significance(null, null, 200, 10).verdict).toBe("dati_insufficienti");
  });
  it("non dichiara vincente una differenza piccola", () => {
    expect(significance(1000, 50, 1000, 55).verdict).toBe("non_significativa");
  });
  it("riconosce una differenza netta e la variante migliore", () => {
    const r = significance(1000, 50, 1000, 100);
    expect(r.verdict).toBe("significativa");
    expect(r.text).toMatch(/a favore di B/);
  });
  it("segnala dati incoerenti", () => {
    expect(significance(100, 150, 100, 10).verdict).toBe("dati_insufficienti");
  });
});

describe("CRM unico", () => {
  it("pipeline con gli 8 stati richiesti più «in trattativa»", () => {
    expect(CRM_STATUS_KEYS).toEqual(["nuovo", "da_contattare", "contattato", "interessato", "in_trattativa", "in_attesa_registrazione", "registrato", "partner_attivo", "non_interessato"]);
    expect(PIPELINE).not.toContain("non_interessato");
  });
  it("spostamenti avanti e indietro", () => {
    expect(neighbours("nuovo")).toEqual({ prev: null, next: "da_contattare" });
    expect(neighbours("partner_attivo")).toEqual({ prev: "registrato", next: null });
    expect(neighbours("non_interessato")).toEqual({ prev: null, next: "da_contattare" });
    expect(statusTone("partner_attivo")).toBe("success");
  });
});

describe("Allegati delle richieste di intervento", () => {
  it("accetta video brevi solo come allegati multimediali", () => {
    expect(validateFile({ type: "video/mp4", size: 20 * 1024 * 1024 }, "media")).toBeNull();
    expect(validateFile({ type: "video/mp4", size: 60 * 1024 * 1024 }, "media")).toMatch(/50 MB/);
    expect(validateFile({ type: "video/mp4", size: 1000 }, "document")).toMatch(/Formato/);
    expect(validateFile({ type: "image/jpeg", size: 1000 }, "media")).toBeNull();
  });
  it("categorie di intervento e tipi di richiesta ricambi coincidono con il database", () => {
    expect(Object.keys(PROBLEM_LABELS)).toEqual(["meccanica_generale", "tagliando", "freni", "pneumatici", "elettronica", "diagnosi", "carrozzeria", "batteria", "climatizzazione", "revisione", "altro"]);
    expect(Object.keys(INQUIRY_LABELS)).toEqual(["informazioni", "disponibilita", "spedizione", "ritiro"]);
  });
});
