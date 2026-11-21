import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/feedback";
import { AdminPage } from "@/components/admin/simple";
import { MarketingTabs } from "@/components/marketing-admin/shared";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Landing page", robots: { index: false } };
const LANDING_PAGES = [
  { path: "/milano", audience: "Generale", form: "Iscrizione Beta" },
  { path: "/prima-auto", audience: "Neopatentati", form: "Ricerca auto compatibili + Beta" },
  { path: "/trova-officina", audience: "Proprietari", form: "Ricerca officine" },
  { path: "/trova-ricambi", audience: "Proprietari", form: "Ricerca ricambi" },
  { path: "/diventa-officina-partner", audience: "Officine", form: "Candidatura partner" },
  { path: "/diventa-concessionario-partner", audience: "Concessionari", form: "Candidatura partner" },
  { path: "/diventa-partner", audience: "Professionisti", form: "Candidatura partner" },
  { path: "/partner", audience: "Concessionari", form: "Candidatura partner" },
];
type Row = { landing: string; entries: number; cta_clicks: number; conversions: number };

export default function LandingsPage() {
  return <AdminPage title="Landing page" description="Pagine di destinazione delle campagne e risultati degli ultimi 30 giorni (ingressi, clic sulle CTA, conversioni), senza dati personali."><MarketingTabs current="landing" /><Content /></AdminPage>;
}

async function Content() {
  await requirePermission("marketing.manage", "/admin/marketing/landing");
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_growth_stats", { days: 30 });
  const rows = ((data as { traffic?: { by_landing?: Row[] } } | null)?.traffic?.by_landing ?? []);
  const get = (p: string) => rows.find((r) => r.landing === p);
  return (
    <div className="flex flex-col gap-4">
      <Alert tone="info">Le conversioni contano registrazioni, candidature e iscrizioni alla Beta arrivate da chi è entrato da quella pagina. Con pochi dati i numeri non sono significativi.</Alert>
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-mist text-left"><tr><th className="p-3">Pagina</th><th className="p-3">Pubblico</th><th className="p-3">Modulo</th><th className="p-3 text-right">Ingressi</th><th className="p-3 text-right">Clic CTA</th><th className="p-3 text-right">Conversioni</th></tr></thead>
          <tbody className="divide-y divide-line">{LANDING_PAGES.map((l) => { const r = get(l.path); return (
            <tr key={l.path}><td className="p-3"><Link className="font-semibold underline" href={l.path}>{l.path}</Link></td><td className="p-3">{l.audience}</td><td className="p-3">{l.form}</td><td className="p-3 text-right tabular-nums">{r?.entries ?? 0}</td><td className="p-3 text-right tabular-nums">{r?.cta_clicks ?? 0}</td><td className="p-3 text-right tabular-nums">{r?.conversions ?? 0}</td></tr>
          ); })}</tbody>
        </table>
      </div>
    </div>
  );
}
