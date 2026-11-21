import { Card } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/form";
import { createPublicClient } from "@/lib/supabase/public";
import { INSPECTION_CATEGORIES, OUTCOMES, USAGE_TYPES } from "@/lib/inspection/labels";
import { formatDate } from "@/lib/utils";

/** Calcolatore della scadenza (GET, nessun dato salvato): usa la stessa funzione del database di «Il mio Garage». */
export async function DueCalculator({ params }: { params: Record<string, string | string[] | undefined> }) {
  const g = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : "");
  const cat = g("categoria") in INSPECTION_CATEGORIES ? g("categoria") : "autovettura";
  const use = g("uso") in USAGE_TYPES ? g("uso") : "privato";
  const reg = /^\d{4}-\d{2}-\d{2}$/.test(g("immatricolazione")) ? g("immatricolazione") : "";
  const last = /^\d{4}-\d{2}-\d{2}$/.test(g("ultima")) ? g("ultima") : "";
  const outcome = g("esito") in OUTCOMES ? g("esito") : "regolare";
  const supabase = createPublicClient();
  const { data } = reg && supabase ? await supabase.rpc("inspection_due_date", { p_category: cat, p_usage: use, p_registration_date: reg, p_last_date: last || undefined, p_last_outcome: last ? outcome : undefined }) : { data: null };
  const r = data?.[0];
  return (
    <Card className="flex flex-col gap-4 p-5">
      <form className="grid gap-3 sm:grid-cols-2" action="/revisione-auto#calcolo">
        <Field id="dc-c" label="Categoria del veicolo"><Select id="dc-c" name="categoria" defaultValue={cat}>{Object.entries(INSPECTION_CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
        <Field id="dc-u" label="Uso"><Select id="dc-u" name="uso" defaultValue={use}>{Object.entries(USAGE_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
        <Field id="dc-r" label="Data di prima immatricolazione"><Input id="dc-r" name="immatricolazione" type="date" required defaultValue={reg} /></Field>
        <Field id="dc-l" label="Ultima revisione" optional><Input id="dc-l" name="ultima" type="date" defaultValue={last} /></Field>
        <Field id="dc-o" label="Esito dell'ultima revisione" optional><Select id="dc-o" name="esito" defaultValue={outcome}>{Object.entries(OUTCOMES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field>
        <div className="flex items-end"><button className="rounded-full bg-ink px-5 py-2.5 font-semibold text-white" type="submit">Calcola la scadenza</button></div>
      </form>
      {r && (
        <div className="rounded-xl bg-orange-50 p-4" role="status">
          <p className="text-sm text-graphite">{r.rule}</p>
          <p className="text-2xl font-extrabold">Entro il {formatDate(r.due_date!)}</p>
          <p className="mt-1 text-xs text-muted">Fonte: {r.source} · regole aggiornate al {formatDate(r.checked_on!)}. Fa fede la data riportata sulla carta di circolazione: verifica sempre lì o sul Portale dell&apos;Automobilista.</p>
        </div>
      )}
    </Card>
  );
}
