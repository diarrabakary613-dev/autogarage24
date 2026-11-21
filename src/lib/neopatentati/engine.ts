/**
 * Motore di verifica "neopatentati" — stessa logica di private.evaluate_neo (SQL).
 *
 * Le soglie NON sono scritte qui: arrivano dai parametri della versione di regola
 * pubblicata (tabella legal_rule_versions), gestita dal pannello amministrativo.
 * Regola di prudenza: se mancano dati o il valore calcolato è troppo vicino al
 * limite, l'esito è sempre "da_verificare", mai "compatibile".
 */
export type NeoResult = "compatibile" | "non_compatibile" | "da_verificare";

export type RuleParams = {
  license_categories?: string[];
  duration_months?: number;
  max_power_to_tare_kw_t?: number | null;
  max_power_kw?: number | null;
  max_power_kw_categories?: string[];
  borderline_margin_pct?: number;
  documented_ratio_required_for_fuels?: string[];
};

export type RuleVersion = {
  id: string;
  version_label: string;
  status: string;
  license_obtained_from: string | null;
  license_obtained_to: string | null;
  effective_from: string;
  effective_to: string | null;
  params: RuleParams;
  exceptions?: { code: string; title: string; description: string }[] | null;
  sources?: { title: string; url: string }[] | null;
  consulted_on?: string | null;
};

export type VehicleData = {
  power_kw: number | null;
  tare_kg: number | null;
  power_to_tare_documented: number | null;
  fuel: string | null;
  vehicle_category?: string | null;
};

export type Evaluation = {
  result: NeoResult;
  ratio: number | null;
  ratio_source: "documentato" | "calcolato" | null;
  power_kw: number | null;
  tare_kg: number | null;
  max_power_kw: number | null;
  max_power_to_tare_kw_t: number | null;
  reasons: string[];
  missing: string[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number) => String(round2(n));

export function evaluateVehicle(v: VehicleData, p: RuleParams): Evaluation {
  const maxRatio = p.max_power_to_tare_kw_t ?? null;
  const maxPower = p.max_power_kw ?? null;
  const margin = (p.borderline_margin_pct ?? 0) / 100;
  const powerCats = p.max_power_kw_categories ?? ["M1"];
  const docFuels = p.documented_ratio_required_for_fuels ?? [];
  const missing: string[] = [];
  const reasons: string[] = [];
  let nonCompatible = false;
  let uncertain = false;

  const power = v.power_kw !== null && v.power_kw !== undefined && Number.isFinite(v.power_kw) && v.power_kw > 0 ? v.power_kw : null;
  const tare = v.tare_kg !== null && v.tare_kg !== undefined && Number.isFinite(v.tare_kg) && v.tare_kg > 0 ? v.tare_kg : null;
  const documented = v.power_to_tare_documented !== null && v.power_to_tare_documented !== undefined && v.power_to_tare_documented > 0 ? v.power_to_tare_documented : null;

  if (power === null) {
    missing.push("potenza (kW)");
  } else if (maxPower !== null && powerCats.includes(v.vehicle_category ?? "M1")) {
    if (power > maxPower) {
      nonCompatible = true;
      reasons.push(`Potenza ${fmt(power)} kW superiore al limite di ${fmt(maxPower)} kW`);
    } else {
      reasons.push(`Potenza ${fmt(power)} kW entro il limite di ${fmt(maxPower)} kW`);
    }
  }

  let ratio: number | null = null;
  let source: Evaluation["ratio_source"] = null;
  if (documented !== null) {
    ratio = documented;
    source = "documentato";
  } else if (power !== null && tare !== null) {
    ratio = round2(power / (tare / 1000));
    source = "calcolato";
  } else {
    missing.push("tara o rapporto potenza/tara");
  }

  if (v.fuel && docFuels.includes(v.fuel) && documented === null) {
    missing.push("rapporto potenza/tara documentato (richiesto per elettriche e ibride plug-in)");
  }

  if (ratio !== null && maxRatio !== null) {
    if (source === "calcolato" && ratio > maxRatio * (1 - margin) && ratio <= maxRatio * (1 + margin)) {
      uncertain = true;
      reasons.push(`Rapporto potenza/tara calcolato ${fmt(ratio)} kW/t, troppo vicino al limite di ${fmt(maxRatio)} kW/t per un esito certo`);
    } else if (ratio > maxRatio) {
      nonCompatible = true;
      reasons.push(`Rapporto potenza/tara ${fmt(ratio)} kW/t (${source}) superiore al limite di ${fmt(maxRatio)} kW/t`);
    } else {
      reasons.push(`Rapporto potenza/tara ${fmt(ratio)} kW/t (${source}) entro il limite di ${fmt(maxRatio)} kW/t`);
    }
  }

  return {
    result: nonCompatible ? "non_compatibile" : uncertain || missing.length > 0 ? "da_verificare" : "compatibile",
    ratio,
    ratio_source: source,
    power_kw: power,
    tare_kg: tare,
    max_power_kw: maxPower,
    max_power_to_tare_kw_t: maxRatio,
    reasons,
    missing,
  };
}

/** Aggiunge mesi a una data ISO (AAAA-MM-GG) restando nel calendario. */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}

/** Versione di regola applicabile a chi ha conseguito la patente in una certa data. */
export function ruleForLicense(versions: RuleVersion[], licenseDate: string, today: string): RuleVersion | null {
  const candidates = versions
    .filter((v) => v.status === "pubblicata")
    .filter((v) => (v.license_obtained_from === null || v.license_obtained_from <= licenseDate) && (v.license_obtained_to === null || v.license_obtained_to >= licenseDate))
    .filter((v) => v.effective_from <= today && (v.effective_to === null || v.effective_to >= today))
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from));
  return candidates[0] ?? null;
}

export type DriverSituation =
  | { kind: "invalid"; message: string }
  | { kind: "category_not_covered"; message: string }
  | { kind: "no_rule"; message: string }
  | { kind: "expired"; rule: RuleVersion; endsOn: string; message: string }
  | { kind: "limited"; rule: RuleVersion; endsOn: string; message: string };

/**
 * Situazione del conducente: limiti in corso, scaduti o regola non disponibile.
 * La fine del periodo è calcolata dalla data di conseguimento + durata della regola.
 */
export function driverSituation(versions: RuleVersion[], licenseDate: string, category: string, today: string): DriverSituation {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(licenseDate)) return { kind: "invalid", message: "Inserisci una data di conseguimento valida." };
  if (licenseDate > today) return { kind: "invalid", message: "La data di conseguimento non può essere nel futuro." };
  const rule = ruleForLicense(versions, licenseDate, today);
  if (!rule) {
    return { kind: "no_rule", message: "Non è disponibile una regola pubblicata per questa data di conseguimento: la compatibilità va verificata." };
  }
  const cats = rule.params.license_categories ?? ["B"];
  if (!cats.includes(category)) {
    return { kind: "category_not_covered", message: `Il calcolatore copre al momento le patenti di categoria ${cats.join(", ")}. Per la categoria ${category} verifica la normativa applicabile.` };
  }
  const endsOn = addMonths(licenseDate, rule.params.duration_months ?? 0);
  if (endsOn <= today) {
    return { kind: "expired", rule, endsOn, message: `Il periodo di limitazione previsto dalla regola applicata è terminato il ${endsOn.split("-").reverse().join("/")}.` };
  }
  return { kind: "limited", rule, endsOn, message: `Limiti in vigore fino al ${endsOn.split("-").reverse().join("/")} (regola: ${rule.version_label}).` };
}

export const NEO_DISCLAIMER =
  "La compatibilità dipende dai dati tecnici del veicolo e dalla normativa applicabile alla situazione del conducente. Verifica sempre i dati prima dell'acquisto e della guida.";
