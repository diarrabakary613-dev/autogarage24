import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState } from "@/components/ui/feedback";
import { AdminPage } from "@/components/admin/simple";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Valutazioni e permute", robots: { index: false } };

export default function AdminValuationsPage() {
  return <AdminPage title="Valutazioni e permute" description="Statistiche, controllo delle proposte anomale e regole della stima interna (modificabili in Impostazioni, con registro delle modifiche)."><Content /></AdminPage>;
}

async function Content() {
  await requirePermission("valuations.manage", "/admin/valutazioni");
  const supabase = await createClient();
  const [{ data: stats }, { data: offers }, { data: recent }] = await Promise.all([
    supabase.rpc("admin_valuation_stats"),
    supabase.from("valuation_offers").select("id, amount_cents, created_at, from_side, professional_profiles(display_name), valuation_requests(vehicle_valuations(make, model, year, estimate_mid_cents))").eq("from_side", "professionista").order("created_at", { ascending: false }).limit(200),
    supabase.from("vehicle_valuations").select("id, make, model, year, status, comparables_count, reliability, created_at").order("created_at", { ascending: false }).limit(30),
  ]);
  const s = (stats ?? {}) as Record<string, number>;
  const anomalous = (offers ?? []).flatMap((o) => {
    const v = (o.valuation_requests as unknown as { vehicle_valuations: { make: string; model: string; year: number; estimate_mid_cents: number | null } | null } | null)?.vehicle_valuations;
    if (!v?.estimate_mid_cents) return [];
    const dev = (o.amount_cents - v.estimate_mid_cents) / v.estimate_mid_cents;
    return Math.abs(dev) >= 0.4 ? [{ o, v, dev }] : [];
  });
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{([["Valutazioni", s.valutazioni], ["Con stima", s.stimate], ["Dati insufficienti", s.dati_insufficienti], ["Richieste ai professionisti", s.richieste_professionali], ["Proposte dei professionisti", s.proposte], ["Proposte accettate", s.proposte_accettate], ["Permute proposte", s.permute], ["Permute accettate", s.permute_accettate]] as [string, number][])
        .map(([l, v]) => <Card key={l} className="p-4"><p className="text-sm text-muted">{l}</p><p className="text-2xl font-extrabold tabular-nums">{v ?? 0}</p></Card>)}</div>
      <Card className="p-5">
        <h2 className="mb-2 font-bold">Proposte anomale (scostamento ≥ 40% dalla stima)</h2>
        {!anomalous.length ? <p className="text-sm text-muted">Nessuna proposta anomala.</p> : (
          <ul className="flex flex-col gap-1 text-sm">{anomalous.map(({ o, v, dev }) => <li key={o.id}>{formatDateTime(o.created_at)} · {(o.professional_profiles as unknown as { display_name: string }).display_name} · {v.make} {v.model} {v.year}: {formatPrice(o.amount_cents)} contro stima {formatPrice(v.estimate_mid_cents!)} ({Math.round(dev * 100)}%)</li>)}</ul>
        )}
        <p className="mt-2 text-xs text-muted">Per segnalazioni sui professionisti usa <Link className="underline" href="/admin/segnalazioni">Segnalazioni</Link>; per sospendere un profilo <Link className="underline" href="/admin/professionisti">Professionisti</Link>.</p>
      </Card>
      <Card className="p-5">
        <h2 className="mb-2 font-bold">Ultime valutazioni</h2>
        {!recent?.length ? <EmptyState title="Nessuna valutazione" /> : <ul className="flex flex-col gap-1 text-sm">{recent.map((v) => <li key={v.id}>{formatDateTime(v.created_at)} · {v.make} {v.model} {v.year} · {v.status} · {v.comparables_count ?? 0} comparabili{v.reliability ? ` · affidabilità ${v.reliability}` : ""}</li>)}</ul>}
        <p className="mt-2 text-sm"><Link className="font-semibold underline" href="/admin/impostazioni">Regole della stima interna</Link></p>
      </Card>
    </div>
  );
}
