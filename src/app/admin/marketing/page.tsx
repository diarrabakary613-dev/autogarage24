import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Card, EmptyState } from "@/components/ui/feedback";
import { AdminPage } from "@/components/admin/simple";
import { MarketingTabs, StatusBadge, KINDS } from "@/components/marketing-admin/shared";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { MARKETING_STATUSES } from "@/lib/marketing/brief";
import { formatDateTime } from "@/lib/utils";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Centro marketing", robots: { index: false } };

export default function MarketingHome() {
  return <AdminPage title="Centro marketing" description="Campagne, creatività, calendario editoriale, esperimenti e budget. Nulla viene pubblicato o speso dalla piattaforma: ogni stato «pubblicato» richiede data e link reali."><MarketingTabs current="panoramica" /><Content /></AdminPage>;
}

async function Content() {
  await requirePermission("marketing.manage", "/admin/marketing");
  const supabase = await createClient();
  const now = new Date().toISOString();
  const [{ data: camps }, { data: items }, { data: upcoming }, { data: budget }] = await Promise.all([
    supabase.from("marketing_campaigns").select("status"),
    supabase.from("marketing_items").select("id, title, kind, status, updated_at").order("updated_at", { ascending: false }).limit(200),
    supabase.from("marketing_items").select("id, title, channel, planned_at, status").gte("planned_at", now).order("planned_at").limit(8),
    supabase.from("ad_budget_entries").select("planned_cents, actual_cents, founder_approved"),
  ]);
  const count = (rows: { status: string }[] | null, s: string) => (rows ?? []).filter((r) => r.status === s).length;
  const toApprove = (items ?? []).filter((i) => i.status === "da_approvare");
  const planned = (budget ?? []).reduce((a, b) => a + Number(b.planned_cents), 0);
  const spent = (budget ?? []).reduce((a, b) => a + Number(b.actual_cents ?? 0), 0);
  return (
    <div className="flex flex-col gap-6">
      <Alert tone="info" title="Higgsfield">Il connettore Higgsfield collegato può leggere crediti e generazioni, ma <strong>non può generare</strong> immagini o video. I prompt preparati qui vanno usati nell&apos;app Higgsfield; poi registra l&apos;asset con origine e diritti d&apos;uso.</Alert>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(["bozza", "da_approvare", "approvato", "pubblicato"] as const).map((s) => (
          <Card key={s} className="p-4"><p className="text-sm text-muted">{MARKETING_STATUSES[s]}</p><p className="text-2xl font-extrabold tabular-nums">{count(items, s)}</p><p className="text-xs text-muted">contenuti · {count(camps, s)} campagne</p></Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5"><h2 className="mb-3 font-bold">Da approvare</h2>
          {!toApprove.length ? <p className="text-sm text-muted">Nessun contenuto in attesa di approvazione.</p> : <ul className="flex flex-col gap-2 text-sm">{toApprove.map((i) => <li key={i.id}><Link className="font-semibold hover:underline" href={`/admin/marketing/contenuti?id=${i.id}`}>{i.title}</Link> · {KINDS[i.kind as keyof typeof KINDS]}</li>)}</ul>}
        </Card>
        <Card className="p-5"><h2 className="mb-3 font-bold">Prossime uscite in calendario</h2>
          {!upcoming?.length ? <EmptyState title="Calendario vuoto" description="Pianifica i contenuti dal calendario editoriale." /> : <ul className="flex flex-col gap-2 text-sm">{upcoming.map((i) => <li key={i.id} className="flex flex-wrap items-center gap-2"><span className="tabular-nums text-muted">{formatDateTime(i.planned_at)}</span><Link className="font-semibold hover:underline" href={`/admin/marketing/contenuti?id=${i.id}`}>{i.title}</Link><StatusBadge status={i.status} /></li>)}</ul>}
        </Card>
      </div>
      <Card className="p-5"><h2 className="mb-1 font-bold">Budget</h2><p className="text-sm text-muted">Previsto {formatPrice(planned)} · speso (inserito a mano) {formatPrice(spent)} · voci approvate dal fondatore {(budget ?? []).filter((b) => b.founder_approved).length}/{budget?.length ?? 0}. <Link className="underline" href="/admin/marketing/budget">Apri il budget</Link></p></Card>
    </div>
  );
}
