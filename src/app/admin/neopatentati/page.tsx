import type { Metadata } from "next";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { AdminPage } from "@/components/admin/simple";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { adminArchiveRule, adminPublishRule, adminSaveRuleDraft, adminTestRule } from "@/lib/actions/admin";
import { evaluateVehicle, type RuleParams } from "@/lib/neopatentati/engine";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { Tables } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Regole neopatentati", robots: { index: false } };

export default function NeoRulesPage(props: PageProps<"/admin/neopatentati">) {
  return <AdminPage title="Regole neopatentati" description="Le versioni pubblicate non si modificano: per un cambio normativo crea una nuova versione, testala e pubblicala con fonte, data di consultazione e motivazione."><Content searchParams={props.searchParams} /></AdminPage>;
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/neopatentati">["searchParams"] }) {
  await requirePermission("neo_rules.manage", "/admin/neopatentati");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: versions } = await supabase.from("legal_rule_versions").select("*").order("effective_from", { ascending: false });
  const list = versions ?? [];
  const editing = list.find((v) => v.id === sp.modifica && v.status === "bozza");
  const base = editing ?? list.find((v) => v.status === "pubblicata");
  // Prova rapida su un veicolo di esempio (stesso motore del calcolatore pubblico).
  const sample = typeof sp.prova_versione === "string" ? list.find((v) => v.id === sp.prova_versione) : undefined;
  const sampleResult = sample ? evaluateVehicle({ power_kw: Number(sp.kw) || null, tare_kg: Number(sp.tara) || null, power_to_tare_documented: Number(sp.rapporto) || null, fuel: typeof sp.alim === "string" ? sp.alim : "benzina", vehicle_category: "M1" }, sample.params as RuleParams) : null;
  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-3">
        {list.map((v) => <Version key={v.id} v={v} />)}
      </ul>
      <Card className="p-5">
        <h2 className="mb-2 font-bold">Prova su un veicolo di esempio</h2>
        <form method="get" className="grid gap-3 sm:grid-cols-5">
          <Field id="pv" label="Versione"><Select id="pv" name="prova_versione" defaultValue={sample?.id ?? base?.id}>{list.map((v) => <option key={v.id} value={v.id}>{v.version_label} ({v.status})</option>)}</Select></Field>
          <Field id="pk" label="Potenza kW"><Input id="pk" name="kw" defaultValue={typeof sp.kw === "string" ? sp.kw : ""} /></Field>
          <Field id="pt" label="Tara kg"><Input id="pt" name="tara" defaultValue={typeof sp.tara === "string" ? sp.tara : ""} /></Field>
          <Field id="pr" label="Rapporto doc."><Input id="pr" name="rapporto" defaultValue={typeof sp.rapporto === "string" ? sp.rapporto : ""} /></Field>
          <Field id="pa" label="Alimentazione"><Select id="pa" name="alim" defaultValue={typeof sp.alim === "string" ? sp.alim : "benzina"}><option value="benzina">Benzina</option><option value="diesel">Diesel</option><option value="elettrica">Elettrica</option><option value="ibrida_plugin">Ibrida plug-in</option><option value="ibrida">Ibrida</option></Select></Field>
          <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white sm:col-span-5 sm:w-fit">Calcola</button>
        </form>
        {sampleResult && <Alert tone={sampleResult.result === "compatibile" ? "success" : sampleResult.result === "non_compatibile" ? "error" : "warning"} className="mt-3"><strong>{sampleResult.result.replace("_", " ")}</strong> — {sampleResult.reasons.join("; ")}{sampleResult.missing.length ? ` · mancano: ${sampleResult.missing.join(", ")}` : ""}</Alert>}
      </Card>
      <Card className="p-5">
        <h2 className="mb-1 font-bold">{editing ? `Modifica bozza «${editing.version_label}»` : "Nuova versione (bozza)"}</h2>
        <p className="mb-4 text-sm text-muted">{editing ? "Ogni modifica annulla il test precedente." : `Parametri precompilati da «${base?.version_label ?? "—"}». Le eccezioni vengono copiate dalla versione di partenza.`}</p>
        <ActionForm action={adminSaveRuleDraft} submitLabel="Salva bozza" hidden={{ id: editing?.id, copy_from: editing ? undefined : base?.id }}>
          {(s) => { const p = (base?.params ?? {}) as RuleParams; const fe = s.fieldErrors ?? {}; return (
            <div className="grid gap-3 sm:grid-cols-3">
              <Field id="rv-l" label="Nome versione" error={fe.version_label}><Input id="rv-l" name="version_label" defaultValue={editing?.version_label ?? ""} /></Field>
              <Field id="rv-ef" label="In vigore dal" error={fe.effective_from}><Input id="rv-ef" name="effective_from" type="date" defaultValue={editing?.effective_from ?? ""} /></Field>
              <Field id="rv-et" label="In vigore fino al" optional><Input id="rv-et" name="effective_to" type="date" defaultValue={editing?.effective_to ?? ""} /></Field>
              <Field id="rv-lf" label="Patenti conseguite dal" optional><Input id="rv-lf" name="license_obtained_from" type="date" defaultValue={base?.license_obtained_from ?? ""} /></Field>
              <Field id="rv-lt" label="Patenti conseguite fino al" optional><Input id="rv-lt" name="license_obtained_to" type="date" defaultValue={base?.license_obtained_to ?? ""} /></Field>
              <Field id="rv-d" label="Durata limiti (mesi)" error={fe.duration_months}><Input id="rv-d" name="duration_months" inputMode="numeric" defaultValue={p.duration_months ?? ""} /></Field>
              <Field id="rv-r" label="Max rapporto potenza/tara (kW/t)"><Input id="rv-r" name="max_power_to_tare_kw_t" inputMode="decimal" defaultValue={p.max_power_to_tare_kw_t ?? ""} /></Field>
              <Field id="rv-p" label="Max potenza autovetture M1 (kW)" optional><Input id="rv-p" name="max_power_kw" inputMode="decimal" defaultValue={p.max_power_kw ?? ""} /></Field>
              <Field id="rv-m" label="Margine di prudenza (%)"><Input id="rv-m" name="borderline_margin_pct" inputMode="decimal" defaultValue={p.borderline_margin_pct ?? 2} /></Field>
              <Field id="rv-s" label="Fonti ufficiali (una per riga: Titolo | https://…)" className="sm:col-span-3"><Textarea id="rv-s" name="sources" rows={3} defaultValue={((base?.sources ?? []) as { title: string; url: string }[]).map((x) => `${x.title} | ${x.url}`).join("\n")} /></Field>
              <Field id="rv-c" label="Data di consultazione delle fonti"><Input id="rv-c" name="consulted_on" type="date" defaultValue={editing?.consulted_on ?? ""} /></Field>
              <Field id="rv-re" label="Motivazione del cambiamento" className="sm:col-span-2"><Input id="rv-re" name="reason" defaultValue={editing?.reason ?? ""} /></Field>
            </div>
          ); }}
        </ActionForm>
      </Card>
    </div>
  );
}

function Version({ v }: { v: Tables<"legal_rule_versions"> }) {
  const p = v.params as RuleParams;
  const t = v.test_results as { total?: number; by_result?: Record<string, number>; changes?: unknown[] } | null;
  return (
    <li>
      <Card className="flex flex-col gap-2 p-4">
        <p className="flex flex-wrap items-center gap-2 font-bold">{v.version_label} <Badge tone={v.status === "pubblicata" ? "success" : v.status === "bozza" ? "warning" : "neutral"}>{v.status}</Badge></p>
        <p className="text-sm text-muted">In vigore dal {formatDate(v.effective_from)}{v.effective_to ? ` al ${formatDate(v.effective_to)}` : ""} · patenti {v.license_obtained_from ? `dal ${formatDate(v.license_obtained_from)}` : ""} {v.license_obtained_to ? `fino al ${formatDate(v.license_obtained_to)}` : ""} · {p.duration_months} mesi · {p.max_power_to_tare_kw_t} kW/t · {p.max_power_kw ?? "—"} kW (M1)</p>
        <p className="text-xs text-muted">Fonti consultate il {v.consulted_on ? formatDate(v.consulted_on) : "—"}: {((v.sources ?? []) as { title: string; url: string }[]).map((s) => s.title).join("; ") || "nessuna"}{v.published_at ? ` · pubblicata il ${formatDateTime(v.published_at)}` : ""}{v.reason ? ` · motivo: ${v.reason}` : ""}</p>
        {t && <p className="text-sm">Ultimo test ({v.tested_at ? formatDateTime(v.tested_at) : ""}): {t.total ?? 0} veicoli · {Object.entries(t.by_result ?? {}).map(([k, n]) => `${n} ${k.replace("_", " ")}`).join(", ")} · {t.changes?.length ?? 0} esiti cambierebbero</p>}
        <div className="flex flex-wrap items-end gap-2">
          {v.status === "bozza" && <>
            <a href={`/admin/neopatentati?modifica=${v.id}`} className="rounded-md border border-line-strong px-3 py-1.5 text-sm font-semibold">Modifica</a>
            <ActionForm action={adminTestRule} submitLabel="Esegui test" size="sm" variant="outline" hidden={{ id: v.id }} />
            {v.tested_at && <ActionForm action={adminPublishRule} submitLabel="Pubblica" size="sm" hidden={{ id: v.id }} confirm="La versione diventerà attiva e immodificabile." className="flex-row! items-end gap-2"><Field id={`pr-${v.id}`} label="Motivazione"><Input id={`pr-${v.id}`} name="reason" /></Field></ActionForm>}
          </>}
          {v.status === "pubblicata" && <ActionForm action={adminArchiveRule} submitLabel="Archivia" size="sm" variant="outline" hidden={{ id: v.id }} confirm="Archiviare la versione?" className="flex-row! items-end gap-2"><Field id={`ar-${v.id}`} label="Motivazione"><Input id={`ar-${v.id}`} name="reason" /></Field></ActionForm>}
        </div>
      </Card>
    </li>
  );
}
