"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, HelpCircle, Info, XCircle } from "lucide-react";
import { Field, Input, Select } from "@/components/ui/form";
import { driverSituation, evaluateVehicle, NEO_DISCLAIMER, type RuleVersion } from "@/lib/neopatentati/engine";
import { FUEL_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

const toNum = (s: string) => { const n = Number(s.replace(",", ".")); return s.trim() && Number.isFinite(n) && n > 0 ? n : null; };

/**
 * Calcolatore: data di conseguimento + categoria + dati tecnici del veicolo.
 * Usa le regole pubblicate dal database; i valori mancanti non vengono mai stimati.
 */
export function NeoCalculator({ versions, today }: { versions: RuleVersion[]; today: string }) {
  const [license, setLicense] = useState("");
  const [category, setCategory] = useState("B");
  const [power, setPower] = useState("");
  const [unit, setUnit] = useState<"kw" | "cv">("kw");
  const [tare, setTare] = useState("");
  const [ratio, setRatio] = useState("");
  const [fuel, setFuel] = useState("benzina");

  const situation = useMemo(() => (license ? driverSituation(versions, license, category, today) : null), [versions, license, category, today]);
  const powerKw = toNum(power) !== null ? (unit === "cv" ? Math.round((toNum(power)! / 1.35962) * 100) / 100 : toNum(power)) : null;
  const evaluation = situation?.kind === "limited"
    ? evaluateVehicle({ power_kw: powerKw, tare_kg: toNum(tare), power_to_tare_documented: toNum(ratio), fuel, vehicle_category: "M1" }, situation.rule.params)
    : null;

  const resultBox = evaluation && {
    compatibile: { t: "Compatibile con i limiti applicabili", c: "border-success/30 bg-success-50", i: <CheckCircle2 className="size-6 text-success" aria-hidden /> },
    non_compatibile: { t: "Non compatibile", c: "border-danger/30 bg-danger-50", i: <XCircle className="size-6 text-danger" aria-hidden /> },
    da_verificare: { t: "Compatibilità da verificare", c: "border-warning/30 bg-warning-50", i: <HelpCircle className="size-6 text-warning" aria-hidden /> },
  }[evaluation.result];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-6 shadow-card" onSubmit={(e) => e.preventDefault()} aria-label="Calcolatore di compatibilità">
        <h3 className="text-lg font-bold">La tua patente</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="nc-date" label="Data di conseguimento"><Input id="nc-date" type="date" max={today} value={license} onChange={(e) => setLicense(e.target.value)} /></Field>
          <Field id="nc-cat" label="Categoria"><Select id="nc-cat" value={category} onChange={(e) => setCategory(e.target.value)}><option value="B">B</option><option value="A2">A2 / altra</option></Select></Field>
        </div>
        <h3 className="mt-2 text-lg font-bold">L&apos;automobile</h3>
        <p className="-mt-2 text-sm text-muted">Usa i dati della carta di circolazione: potenza (P.2) e tara/massa. Versioni diverse dello stesso modello possono avere valori diversi.</p>
        <div className="grid grid-cols-[1fr_110px] gap-3">
          <Field id="nc-p" label="Potenza"><Input id="nc-p" inputMode="decimal" value={power} onChange={(e) => setPower(e.target.value)} /></Field>
          <Field id="nc-u" label="Unità"><Select id="nc-u" value={unit} onChange={(e) => setUnit(e.target.value as "kw" | "cv")}><option value="kw">kW</option><option value="cv">CV</option></Select></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="nc-t" label="Tara (kg)" optional><Input id="nc-t" inputMode="numeric" value={tare} onChange={(e) => setTare(e.target.value)} /></Field>
          <Field id="nc-r" label="Rapporto potenza/tara documentato (kW/t)" optional><Input id="nc-r" inputMode="decimal" value={ratio} onChange={(e) => setRatio(e.target.value)} /></Field>
        </div>
        <Field id="nc-f" label="Alimentazione"><Select id="nc-f" value={fuel} onChange={(e) => setFuel(e.target.value)}>{Object.entries(FUEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
        {unit === "cv" && powerKw !== null && <p className="text-xs text-muted">Conversione: {powerKw} kW (1 kW = 1,35962 CV). Per l&apos;esito fa fede il valore in kW del libretto.</p>}
      </form>

      <div className="flex flex-col gap-4" aria-live="polite">
        {versions.length === 0 && <div className="rounded-2xl border border-warning/30 bg-warning-50 p-5 text-sm">Le regole non sono al momento disponibili: la compatibilità va verificata.</div>}
        {!situation && versions.length > 0 && <div className="rounded-2xl border border-line bg-mist p-5 text-sm text-graphite">Inserisci la data di conseguimento della patente per scoprire quali limiti si applicano a te.</div>}
        {situation && situation.kind !== "limited" && (
          <div className={cn("rounded-2xl border p-5", situation.kind === "expired" ? "border-success/30 bg-success-50" : "border-warning/30 bg-warning-50")}>
            <p className="font-bold">{situation.kind === "expired" ? "Il periodo di limitazione risulta concluso" : "Verifica necessaria"}</p>
            <p className="mt-1 text-sm">{situation.message}</p>
            {situation.kind === "expired" && <p className="mt-2 text-sm text-graphite">I limiti per neopatentati considerati qui non si applicano più; restano valide tutte le altre regole della tua patente.</p>}
          </div>
        )}
        {situation?.kind === "limited" && (
          <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <p className="text-sm text-muted">{situation.message}</p>
            <p className="mt-1 text-sm">Limiti: <strong>{situation.rule.params.max_power_kw} kW</strong> di potenza (autovetture) e <strong>{situation.rule.params.max_power_to_tare_kw_t} kW/t</strong> di rapporto potenza/tara.</p>
          </div>
        )}
        {evaluation && resultBox && (
          <div className={cn("flex flex-col gap-3 rounded-2xl border p-5", resultBox.c)}>
            <p className="flex items-center gap-2 text-lg font-bold">{resultBox.i}{resultBox.t}</p>
            <dl className="grid gap-1 text-sm">
              <div className="flex justify-between"><dt>Potenza rilevata</dt><dd className="font-semibold">{evaluation.power_kw !== null ? `${evaluation.power_kw} kW` : "non inserita"}</dd></div>
              <div className="flex justify-between"><dt>Rapporto potenza/tara</dt><dd className="font-semibold">{evaluation.ratio !== null ? `${evaluation.ratio} kW/t (${evaluation.ratio_source})` : "non calcolabile"}</dd></div>
            </dl>
            <ul className="list-disc space-y-1 pl-5 text-sm">{evaluation.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
            {evaluation.missing.length > 0 && <p className="text-sm"><strong>Dati mancanti:</strong> {evaluation.missing.join("; ")}.</p>}
          </div>
        )}
        {situation?.kind === "limited" && (situation.rule.exceptions?.length ?? 0) > 0 && (
          <details className="rounded-2xl border border-line bg-white p-4 text-sm">
            <summary className="cursor-pointer font-semibold">Eccezioni previste dalla legge</summary>
            <ul className="mt-2 flex flex-col gap-2">{situation.rule.exceptions!.map((e) => <li key={e.code}><strong>{e.title}:</strong> {e.description}</li>)}</ul>
          </details>
        )}
        <p className="flex gap-2 text-xs text-muted"><Info className="size-4 shrink-0" aria-hidden />{NEO_DISCLAIMER} Il calcolo non costituisce consulenza legale.</p>
      </div>
    </div>
  );
}
