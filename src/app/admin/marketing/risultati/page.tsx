import type { Metadata } from "next";
import Link from "next/link";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { AdminPage } from "@/components/admin/simple";
import { MarketingTabs } from "@/components/marketing-admin/shared";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Risultati marketing", robots: { index: false } };
type Row = { campaign: string; entries: number; cta_clicks: number; conversions: number };

export default function ResultsPage() {
  return <AdminPage title="Risultati per campagna" description="Dati misurati dalla piattaforma tramite il codice UTM (ultimi 90 giorni) e spesa inserita a mano. Nessun dato è importato dalle piattaforme pubblicitarie."><MarketingTabs current="risultati" /><Content /></AdminPage>;
}

async function Content() {
  await requirePermission("marketing.manage", "/admin/marketing/risultati");
  const supabase = await createClient();
  const [{ data }, { data: camps }, { data: budget }] = await Promise.all([
    supabase.rpc("admin_growth_stats", { days: 90 }),
    supabase.from("marketing_campaigns").select("id, name, utm_campaign"),
    supabase.from("ad_budget_entries").select("campaign_id, actual_cents, leads"),
  ]);
  const rows = ((data as { traffic?: { by_campaign?: Row[] } } | null)?.traffic?.by_campaign ?? []);
  return (
    <div className="flex flex-col gap-4">
      <Alert tone="warning">Un tasso di conversione con meno di 100 ingressi non è affidabile: usalo come indicazione, non come prova. Per dettagli su sorgenti e dispositivi vedi <Link className="underline" href="/admin/analytics">Analytics</Link>.</Alert>
      {!rows.length ? <EmptyState title="Nessun dato di campagna" description="Compariranno quando arriveranno visite con utm_campaign." /> : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-mist text-left"><tr><th className="p-3">Campagna (UTM)</th><th className="p-3 text-right">Ingressi</th><th className="p-3 text-right">Clic CTA</th><th className="p-3 text-right">Conversioni</th><th className="p-3 text-right">Tasso</th><th className="p-3 text-right">Spesa inserita</th><th className="p-3 text-right">Costo per conversione</th></tr></thead>
            <tbody className="divide-y divide-line">{rows.map((r) => {
              const c = (camps ?? []).find((x) => x.utm_campaign === r.campaign);
              const spent = (budget ?? []).filter((b) => c && b.campaign_id === c.id).reduce((a, b) => a + Number(b.actual_cents ?? 0), 0);
              return (
                <tr key={r.campaign}><td className="p-3">{c ? <Link className="font-semibold underline" href={`/admin/marketing/campagne?id=${c.id}`}>{c.name}</Link> : r.campaign}<span className="block text-xs text-muted">{r.campaign}</span></td>
                  <td className="p-3 text-right tabular-nums">{r.entries}</td><td className="p-3 text-right tabular-nums">{r.cta_clicks}</td><td className="p-3 text-right tabular-nums">{r.conversions}</td>
                  <td className="p-3 text-right tabular-nums">{r.entries ? `${((r.conversions / r.entries) * 100).toFixed(1)}%${r.entries < 100 ? " *" : ""}` : "—"}</td>
                  <td className="p-3 text-right tabular-nums">{spent ? formatPrice(spent) : "—"}</td><td className="p-3 text-right tabular-nums">{spent && r.conversions ? formatPrice(Math.round(spent / r.conversions)) : "—"}</td></tr>
              );
            })}</tbody>
          </table>
          <p className="p-3 text-xs text-muted">* meno di 100 ingressi: dato non significativo.</p>
        </div>
      )}
    </div>
  );
}
