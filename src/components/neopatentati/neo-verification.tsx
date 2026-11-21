import Link from "next/link";
import { CheckCircle2, HelpCircle, Info, XCircle } from "lucide-react";
import { NEO_DISCLAIMER, type Evaluation } from "@/lib/neopatentati/engine";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Result = "compatibile" | "non_compatibile" | "da_verificare";
const STYLE: Record<Result, { title: string; box: string; icon: React.ReactNode }> = {
  compatibile: { title: "Compatibile con i limiti per neopatentati", box: "border-success/30 bg-success-50", icon: <CheckCircle2 className="size-6 text-success" aria-hidden /> },
  non_compatibile: { title: "Non compatibile con i limiti per neopatentati", box: "border-danger/30 bg-danger-50", icon: <XCircle className="size-6 text-danger" aria-hidden /> },
  da_verificare: { title: "Compatibilità da verificare", box: "border-warning/30 bg-warning-50", icon: <HelpCircle className="size-6 text-warning" aria-hidden /> },
};

/** Sezione "Verifica per neopatentati" della scheda automobile. */
export function NeoVerification({
  check,
  rule,
  listingResult,
  checkedAt,
}: {
  check: { result: Result; details: Evaluation; checked_at: string } | null;
  rule: { version_label: string; consulted_on: string | null; sources: { title: string; url: string }[] } | null;
  listingResult: Result | null;
  checkedAt: string | null;
}) {
  const result: Result = check?.result ?? listingResult ?? "da_verificare";
  const s = STYLE[result];
  const d = check?.details;
  return (
    <section id="neopatentati" className="rounded-2xl border border-line bg-white p-6 shadow-card" aria-labelledby="neo-t">
      <h2 id="neo-t" className="mb-4 text-xl font-bold">Verifica per neopatentati</h2>
      <div className={cn("flex gap-3 rounded-xl border p-4", s.box)}>
        {s.icon}
        <div className="flex flex-col gap-1">
          <p className="font-bold">{s.title}</p>
          <p className="text-sm text-graphite">
            {check || checkedAt ? `Verifica automatica del ${formatDate(check?.checked_at ?? checkedAt!)}` : "Verifica non ancora eseguita"}
            {rule && ` · Regola applicata: ${rule.version_label}`}
          </p>
        </div>
      </div>
      {d && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <dl className="flex flex-col gap-2 text-sm">
            <Row k="Potenza rilevata" v={d.power_kw !== null ? `${d.power_kw} kW` : "Non indicata"} />
            <Row k="Limite di potenza" v={d.max_power_kw !== null ? `${d.max_power_kw} kW (autovetture M1)` : "—"} />
            <Row k="Tara" v={d.tare_kg !== null ? `${d.tare_kg} kg` : "Non indicata"} />
            <Row k="Rapporto potenza/tara" v={d.ratio !== null ? `${d.ratio} kW/t (${d.ratio_source})` : "Non disponibile"} />
            <Row k="Limite rapporto" v={d.max_power_to_tare_kw_t !== null ? `${d.max_power_to_tare_kw_t} kW/t` : "—"} />
          </dl>
          <div className="flex flex-col gap-2 text-sm">
            <p className="font-semibold">Motivo della decisione</p>
            <ul className="list-disc space-y-1 pl-5 text-graphite">{d.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
            {d.missing.length > 0 && (
              <p className="text-graphite"><strong>Dati mancanti:</strong> {d.missing.join("; ")}.</p>
            )}
          </div>
        </div>
      )}
      <p className="mt-4 flex gap-2 rounded-lg bg-mist p-3 text-sm text-graphite"><Info className="mt-0.5 size-4 shrink-0" aria-hidden />{NEO_DISCLAIMER} La verifica considera la regola in vigore per chi consegue la patente oggi: chi ha la patente da più tempo può avere limiti diversi o nessun limite.</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link href="/auto-per-neopatentati#calcolatore" className="font-semibold text-orange-700 hover:underline">Verifica con la tua data di patente</Link>
        {rule?.sources?.[0] && <a href={rule.sources[0].url} target="_blank" rel="noopener noreferrer" className="text-muted underline hover:text-ink">Fonte normativa</a>}
        {rule?.consulted_on && <span className="text-muted">Fonti consultate il {formatDate(rule.consulted_on)}</span>}
      </div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3 border-b border-line pb-1.5"><dt className="text-muted">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>;
}
