import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/ui/action-form";
import { Card, EmptyState } from "@/components/ui/feedback";
import { Select } from "@/components/ui/form";
import { ButtonLink } from "@/components/ui/button";
import { AdminPage } from "@/components/admin/simple";
import { MarketingItemForm, MarketingTabs, QuickStatus, StatusBadge, KINDS } from "@/components/marketing-admin/shared";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { deleteMarketingRow } from "@/lib/actions/marketing";
import { CHANNELS, MARKETING_STATUSES } from "@/lib/marketing/brief";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Creatività e contenuti", robots: { index: false } };
type SP = Record<string, string | string[] | undefined>;

export default function ItemsPage(props: PageProps<"/admin/marketing/contenuti">) {
  return <AdminPage title="Creatività, contenuti social e materiali" description="Copy, script, brief visivi, prompt di generazione e asset con i relativi diritti d'uso."><MarketingTabs current="contenuti" /><Content searchParams={props.searchParams} /></AdminPage>;
}

async function Content({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePermission("marketing.manage", "/admin/marketing/contenuti");
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const supabase = await createClient();
  const { data: campaigns } = await supabase.from("marketing_campaigns").select("id, name").order("name");
  const id = s("id");
  if (id && /^[0-9a-f-]{36}$/.test(id)) {
    const { data: item } = await supabase.from("marketing_items").select("*").eq("id", id).maybeSingle();
    if (!item) return <EmptyState title="Contenuto non trovato" />;
    const variants = Array.isArray(item.variants) ? (item.variants as { label?: string; headline?: string; cta?: string }[]) : [];
    return (
      <div className="flex flex-col gap-4">
        <Link href="/admin/marketing/contenuti" className="text-sm font-semibold text-muted hover:text-ink">← Tutti i contenuti</Link>
        <div className="flex flex-wrap items-center gap-3"><StatusBadge status={item.status} /><QuickStatus id={item.id} table="contenuto" status={item.status} />{item.published_url && <a className="text-sm underline" href={item.published_url} rel="noopener noreferrer" target="_blank">Contenuto pubblicato</a>}</div>
        {variants.length > 0 && <Card className="p-4"><h2 className="mb-2 font-bold">Varianti da testare</h2><ul className="text-sm">{variants.map((v, i) => <li key={i}><strong>{v.label}</strong>: {v.headline} — CTA «{v.cta}»</li>)}</ul></Card>}
        <Card className="p-5"><MarketingItemForm item={item} campaigns={campaigns ?? []} /></Card>
        <ActionForm action={deleteMarketingRow} submitLabel="Elimina" variant="ghost" size="sm" hidden={{ id: item.id, table: "contenuto" }} confirm="Eliminare definitivamente il contenuto?" />
      </div>
    );
  }
  if (s("nuovo")) {
    return <Card className="p-5"><h2 className="mb-3 font-bold">Nuovo contenuto</h2><MarketingItemForm campaigns={campaigns ?? []} defaults={{ campaign_id: s("campagna"), planned_on: s("data"), kind: s("tipo") }} /></Card>;
  }
  const kind = s("tipo"); const status = s("stato");
  let q = supabase.from("marketing_items").select("id, title, kind, status, channel, planned_at, asset_url, updated_at").order("updated_at", { ascending: false }).limit(300);
  if (kind && kind in KINDS) q = q.eq("kind", kind);
  if (status && status in MARKETING_STATUSES) q = q.eq("status", status as never);
  const { data } = await q;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <form method="get" className="flex flex-wrap gap-2">
          <Select name="tipo" defaultValue={kind ?? ""} aria-label="Tipo" className="w-auto"><option value="">Tutti i tipi</option>{Object.entries(KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
          <Select name="stato" defaultValue={status ?? ""} aria-label="Stato" className="w-auto"><option value="">Tutti gli stati</option>{Object.entries(MARKETING_STATUSES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
          <button className="rounded-md bg-ink px-4 text-sm font-semibold text-white">Filtra</button>
        </form>
        <span className="flex gap-2"><ButtonLink href="/admin/marketing/brief" variant="outline" size="sm">Genera un brief</ButtonLink><ButtonLink href="/admin/marketing/contenuti?nuovo=1" size="sm">Nuovo contenuto</ButtonLink></span>
      </div>
      {!data?.length ? <EmptyState title="Nessun contenuto" description="Crea un contenuto o parti dal generatore di brief." /> : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-mist text-left"><tr><th className="p-3">Titolo</th><th className="p-3">Tipo</th><th className="p-3">Canale</th><th className="p-3">Uscita prevista</th><th className="p-3">Asset</th><th className="p-3">Stato</th></tr></thead>
            <tbody className="divide-y divide-line">{data.map((i) => (
              <tr key={i.id}><td className="p-3"><Link className="font-semibold hover:underline" href={`/admin/marketing/contenuti?id=${i.id}`}>{i.title}</Link></td><td className="p-3">{KINDS[i.kind as keyof typeof KINDS]}</td><td className="p-3">{i.channel ? CHANNELS[i.channel as keyof typeof CHANNELS] : "—"}</td><td className="p-3">{i.planned_at ? formatDateTime(i.planned_at) : "—"}</td><td className="p-3">{i.asset_url ? "Sì" : "—"}</td><td className="p-3"><StatusBadge status={i.status} /></td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
