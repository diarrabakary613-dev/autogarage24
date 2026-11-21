import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Card } from "@/components/ui/feedback";
import { AdminPage } from "@/components/admin/simple";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Cruscotto di lancio", robots: { index: false } };

type N = number | null;
type K = {
  giorni: number;
  generato_il: string;
  marketplace: Record<string, N>;
  partner: Record<string, N> & { per_tipo: Record<string, number> };
  clienti: Record<string, N>;
  marketing: Record<string, N>;
  qualita: Record<string, N>;
};

const PERIODS = [7, 30, 90, 365];
const TYPES: Record<string, string> = {
  officina: "Officine", meccanico: "Meccanici", venditore_auto: "Concessionari e venditori auto", venditore_ricambi: "Venditori di ricambi",
  soccorritore: "Soccorso stradale", trasportatore: "Trasportatori", centro_revisione: "Centri revisione", intermediario_assicurativo: "Intermediari assicurativi",
};

function fmt(v: N, kind: "n" | "h" | "eur" | "voto" = "n") {
  if (v === null || v === undefined) return "—";
  if (kind === "h") return `${v} h`;
  if (kind === "eur") return formatPrice(v);
  if (kind === "voto") return `${v} / 5`;
  return new Intl.NumberFormat("it-IT").format(v);
}

function pct(a: N, b: N) {
  if (!a || !b) return "—";
  return `${Math.round((a / b) * 100)}%`;
}

function Group({ title, rows, note }: { title: string; rows: [string, string][]; note?: string }) {
  return (
    <Card className="p-5">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {rows.map(([l, v]) => (
          <div key={l} className="flex items-baseline justify-between gap-3 border-b border-line py-1.5 last:border-0">
            <dt className="text-sm text-muted">{l}</dt>
            <dd className="font-bold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      {note && <p className="mt-3 text-xs text-muted">{note}</p>}
    </Card>
  );
}

export default function LaunchPage(props: PageProps<"/admin/lancio">) {
  return (
    <AdminPage
      title="Cruscotto di lancio"
      description="Le metriche chiave del lancio a Milano, calcolate solo da dati ed eventi reali della piattaforma. Un trattino indica un dato non ancora disponibile, mai una stima."
    >
      <Content searchParams={props.searchParams} />
    </AdminPage>
  );
}

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("analytics.view", "/admin/lancio");
  const sp = await searchParams;
  const days = PERIODS.includes(Number(sp.giorni)) ? Number(sp.giorni) : 30;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_launch_kpis", { days });
  if (error || !data) return <Alert tone="error">Dati non disponibili. Se la migrazione 0030 non è ancora applicata al database, questo cruscotto non può funzionare.</Alert>;
  const k = data as unknown as K;
  const m = k.marketplace, p = k.partner, c = k.clienti, mk = k.marketing, q = k.qualita;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        Periodo:
        {PERIODS.map((d) => (
          <Link key={d} href={`/admin/lancio?giorni=${d}`} className={`rounded-full border px-3 py-1 ${d === days ? "border-ink bg-ink text-white" : "border-line"}`}>
            {d === 365 ? "1 anno" : `${d} giorni`}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {([
          ["Auto pubblicate", fmt(m.auto_pubblicate_totale)],
          ["di cui per neopatentati", fmt(m.auto_neopatentati_compatibili)],
          ["Partner pubblicati", fmt(p.pubblicati)],
          ["Contatti generati", fmt(m.contatti_generati)],
        ] as const).map(([l, v]) => (
          <Card key={l} className="p-4"><p className="text-sm text-muted">{l}</p><p className="text-2xl font-extrabold tabular-nums">{v}</p></Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Group title="Marketplace" rows={[
          ["Auto pubblicate (oggi)", fmt(m.auto_pubblicate_totale)],
          ["Auto pubblicate nel periodo", fmt(m.auto_pubblicate_periodo)],
          ["Compatibili per neopatentati", fmt(m.auto_neopatentati_compatibili)],
          ["In attesa di approvazione", fmt(m.auto_in_revisione)],
          ["Vendute nel periodo", fmt(m.auto_vendute_periodo)],
          ["Ricambi pubblicati", fmt(m.ricambi_pubblicati)],
          ["Visualizzazioni annunci", fmt(m.visualizzazioni_annunci)],
          ["Richieste su auto", fmt(m.richieste_su_auto)],
          ["Prenotazioni di visite e test drive", fmt(m.prenotazioni_visite)],
          ["Contatti generati (richieste, visite, offerte)", fmt(m.contatti_generati)],
        ]} />

        <Group title="Partner" rows={[
          ["Attività registrate", fmt(p.registrati)],
          ["Registrate nel periodo", fmt(p.registrati_periodo)],
          ["Profili da approvare", fmt(p.da_approvare)],
          ["Profili verificati", fmt(p.verificati)],
          ["Con badge attività verificata", fmt(p.con_badge_attivita)],
          ["Partner pubblicati", fmt(p.pubblicati)],
          ["Partner attivi nel periodo (hanno risposto)", fmt(p.attivi_periodo)],
          ["Richieste ricevute", fmt(p.richieste_ricevute)],
          ["Richieste con risposta", `${fmt(p.richieste_con_risposta)} (${pct(p.richieste_con_risposta, p.richieste_ricevute)})`],
          ["Tempo medio della prima risposta", fmt(p.tempo_medio_risposta_ore, "h")],
          ["Preventivi inviati", fmt(p.preventivi_inviati)],
          ["Preventivi accettati", fmt(p.preventivi_accettati)],
        ]} note={Object.keys(p.per_tipo ?? {}).length ? `Pubblicati per tipo: ${Object.entries(p.per_tipo).map(([t, n]) => `${TYPES[t] ?? t} ${n}`).join(" · ")}` : "Nessun partner pubblicato."} />

        <Group title="Clienti" rows={[
          ["Registrazioni nel periodo", fmt(c.registrazioni)],
          ["Utenti attivi (account)", fmt(c.utenti_totali)],
          ["Utenti attivi nel periodo", fmt(c.utenti_attivi)],
          ["Ricerche effettuate", fmt(c.ricerche)],
          ["Calcoli neopatentati", fmt(c.calcoli_neopatentati)],
          ["Richieste di preventivo", fmt(c.richieste_preventivo)],
          ["Appuntamenti richiesti", fmt(c.appuntamenti)],
          ["Appuntamenti confermati", fmt(c.appuntamenti_confermati)],
        ]} note="«Utenti attivi nel periodo» conta chi ha inviato richieste o messaggi, prenotato, salvato preferiti o svolto attività registrate." />

        <Group title="Marketing" rows={[
          ["Ingressi sul sito", fmt(mk.ingressi)],
          ["Traffico organico (motori di ricerca)", fmt(mk.traffico_organico)],
          ["Traffico social", fmt(mk.traffico_social)],
          ["Traffico da campagne (UTM)", fmt(mk.traffico_campagne)],
          ["Traffico diretto", fmt(mk.traffico_diretto)],
          ["Conversioni", fmt(mk.conversioni)],
          ["Registrazioni da campagne", fmt(mk.registrazioni_da_campagne)],
          ["Spesa pubblicitaria registrata", fmt(mk.spesa_pubblicitaria_cents, "eur")],
          ["Costo per registrazione (campagne a pagamento)", fmt(mk.costo_acquisizione_cents, "eur")],
          ["Inviti registrati / qualificati", `${fmt(mk.referral_registrati)} / ${fmt(mk.referral_qualificati)}`],
          ["Campagne attive", fmt(mk.campagne_attive)],
        ]} note="Il traffico è misurato senza cookie e senza identificativi personali. Il costo per registrazione compare solo se nel Centro marketing è registrata una spesa effettiva." />

        <Group title="Qualità e assistenza" rows={[
          ["Segnalazioni aperte", fmt(q.segnalazioni_aperte)],
          ["Richieste di assistenza aperte", fmt(q.assistenza_aperta)],
          ["Reclami aperti", fmt(q.reclami_aperti)],
          ["Recensioni nel periodo", fmt(q.recensioni_periodo)],
          ["Voto medio nel periodo", fmt(q.voto_medio_periodo, "voto")],
          ["Errori dell'app nel periodo", fmt(q.errori_app_periodo)],
        ]} />
      </div>

      <p className="text-sm">
        Approfondimenti: <Link className="underline" href="/admin/analytics">Analytics e risultati</Link> ·{" "}
        <Link className="underline" href="/admin/growth">Growth Center</Link> ·{" "}
        <Link className="underline" href="/admin/acquisizione">Acquisizione partner</Link> ·{" "}
        <Link className="underline" href="/admin/supporto">Assistenza</Link>
      </p>
      <p className="text-xs text-muted">Aggiornato al {new Date(k.generato_il).toLocaleString("it-IT", { timeZone: "Europe/Rome" })}.</p>
    </div>
  );
}
