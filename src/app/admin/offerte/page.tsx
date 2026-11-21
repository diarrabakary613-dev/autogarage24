import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card, EmptyState } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/form";
import { TabLinks } from "@/components/ui/misc";
import { AdminPage } from "@/components/admin/simple";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { adminModerateOffer } from "@/lib/actions/offers";
import { OFFER_CATEGORIES, OFFER_STATUS } from "@/lib/offers/labels";
import { formatPrice } from "@/lib/format";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Offerte e coupon", robots: { index: false } };

export default function AdminOffersPage(props: PageProps<"/admin/offerte">) {
  return <AdminPage title="Offerte e coupon" description="Approvazione, sospensione e controllo dei coupon. Verifica che il prezzo originale sia credibile (listino o sito del partner) prima di approvare: lo sconto mostrato deriva dai due prezzi."><Content searchParams={props.searchParams} /></AdminPage>;
}

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("offers.moderate", "/admin/offerte");
  const sp = await searchParams;
  const tab = sp.tab === "coupon" ? "coupon" : sp.tab === "statistiche" ? "statistiche" : "offerte";
  const status = typeof sp.stato === "string" && sp.stato in OFFER_STATUS ? sp.stato : "in_revisione";
  const supabase = await createClient();
  return (
    <>
      <TabLinks current={tab} items={[{ key: "offerte", label: "Offerte", href: "/admin/offerte" }, { key: "coupon", label: "Coupon", href: "/admin/offerte?tab=coupon" }, { key: "statistiche", label: "Statistiche", href: "/admin/offerte?tab=statistiche" }]} />
      {tab === "offerte" && <Offers status={status} supabase={supabase} />}
      {tab === "coupon" && <Coupons supabase={supabase} />}
      {tab === "statistiche" && <Stats supabase={supabase} />}
    </>
  );
}
type SB = Awaited<ReturnType<typeof createClient>>;

async function Offers({ status, supabase }: { status: string; supabase: SB }) {
  const { data } = await supabase.from("promotional_offers").select("*, professional_profiles(display_name, slug, review_status)").eq("status", status).order("updated_at").limit(100);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2 text-sm">{Object.entries(OFFER_STATUS).map(([k, l]) => <Link key={k} href={`/admin/offerte?stato=${k}`} className={`rounded-full border px-3 py-1 ${k === status ? "border-ink bg-ink text-white" : "border-line"}`}>{l}</Link>)}</div>
      {!data?.length ? <EmptyState title="Nessuna offerta in questo stato" /> : data.map((o) => {
        const p = o.professional_profiles as unknown as { display_name: string; review_status: string };
        return (
          <Card key={o.id} className="p-4">
            <p className="font-bold">{o.title} <Badge tone="neutral">{OFFER_CATEGORIES[o.category as keyof typeof OFFER_CATEGORIES]}</Badge>{o.neo_dedicated && <Badge tone="dark" className="ml-1">Neopatentati</Badge>}</p>
            <p className="text-sm text-muted">{p.display_name} (profilo {p.review_status}) · {formatPrice(o.promo_price_cents)} invece di {formatPrice(o.original_price_cents)} (−{o.discount_pct}%) · {formatDate(o.starts_on)} → {formatDate(o.ends_on)}</p>
            <p className="mt-1 line-clamp-3 text-sm">{o.description}</p>
            <p className="text-sm"><strong>Condizioni:</strong> {o.conditions}</p>
            {(o.discount_pct ?? 0) >= 60 && <p className="text-sm text-danger">Sconto elevato: verifica il prezzo originale con una fonte del partner.</p>}
            <ActionForm action={adminModerateOffer} submitLabel="Applica" size="sm" hidden={{ id: o.id }} className="mt-2">
              <div className="grid gap-2 sm:grid-cols-[200px_1fr]">
                <Field id={`d-${o.id}`} label="Decisione"><Select id={`d-${o.id}`} name="decision" defaultValue={o.status === "pubblicata" ? "sospesa" : "pubblicata"}><option value="pubblicata">Approva e pubblica</option><option value="rifiutata">Rifiuta</option><option value="sospesa">Sospendi</option><option value="in_revisione">Rimetti in revisione</option></Select></Field>
                <Field id={`n-${o.id}`} label="Motivazione (visibile al partner)"><Input id={`n-${o.id}`} name="note" /></Field>
              </div>
            </ActionForm>
          </Card>
        );
      })}
    </div>
  );
}

async function Coupons({ supabase }: { supabase: SB }) {
  const { data } = await supabase.from("promotional_coupons").select("*, professional_profiles(display_name)").order("created_at", { ascending: false }).limit(200);
  if (!data?.length) return <EmptyState title="Nessun coupon" />;
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white"><table className="w-full min-w-[640px] text-sm">
      <thead className="bg-mist text-left"><tr><th className="p-3">Codice</th><th className="p-3">Partner</th><th className="p-3">Sconto</th><th className="p-3">Usi</th><th className="p-3">Scadenza</th><th className="p-3">Stato</th></tr></thead>
      <tbody className="divide-y divide-line">{data.map((c) => (
        <tr key={c.id}><td className="p-3 font-mono">{c.code}</td><td className="p-3">{(c.professional_profiles as unknown as { display_name: string }).display_name}</td>
          <td className="p-3">{c.discount_type === "percentuale" ? `${c.discount_value}%` : formatPrice(c.discount_value * 100)}</td><td className="p-3">{c.uses_count}{c.max_uses ? `/${c.max_uses}` : ""}</td>
          <td className="p-3">{formatDate(c.valid_until)}</td><td className="p-3">{c.active ? "Attivo" : "Disattivato"}</td></tr>
      ))}</tbody></table></div>
  );
}

async function Stats({ supabase }: { supabase: SB }) {
  const [{ data: offers }, { count: claims }, { count: used }] = await Promise.all([
    supabase.from("promotional_offers").select("status, view_count, click_count"),
    supabase.from("offer_claims").select("id", { count: "exact", head: true }),
    supabase.from("offer_claims").select("id", { count: "exact", head: true }).eq("status", "utilizzato"),
  ]);
  const by = (s: string) => (offers ?? []).filter((o) => o.status === s).length;
  const views = (offers ?? []).reduce((a, o) => a + o.view_count, 0);
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {([["Pubblicate", by("pubblicata")], ["In revisione", by("in_revisione")], ["Sospese", by("sospesa")], ["Visualizzazioni", views], ["Richieste", claims ?? 0], ["Utilizzi verificati dal partner", used ?? 0]] as [string, number][])
        .map(([l, v]) => <Card key={l} className="p-4"><p className="text-sm text-muted">{l}</p><p className="text-2xl font-extrabold tabular-nums">{v}</p></Card>)}
    </div>
  );
}
