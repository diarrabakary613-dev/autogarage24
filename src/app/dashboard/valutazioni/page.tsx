import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader, TabLinks } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";
import { TRADE_STATUS } from "@/lib/valuation/labels";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Le mie valutazioni", robots: { index: false } };

export default function MyValuationsPage(props: PageProps<"/dashboard/valutazioni">) {
  return (
    <>
      <PageHeader title="Le mie valutazioni" description="Stime, richieste ai professionisti, offerte ricevute e permute." actions={<ButtonLink href="/valuta-la-tua-auto">Nuova valutazione</ButtonLink>} />
      <Suspense fallback={<Skeleton className="h-64" />}><List searchParams={props.searchParams} /></Suspense>
    </>
  );
}

async function List({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser("/dashboard/valutazioni");
  const sp = await searchParams;
  const tab = sp.vista === "richieste" ? "richieste" : sp.vista === "permute" ? "permute" : "stime";
  const supabase = await createClient();
  const { count: pro } = await supabase.from("professional_profiles").select("id", { count: "exact", head: true }).eq("user_id", user.id).in("professional_type", ["venditore_auto", "officina"]);
  const tabs = [{ key: "stime", label: "Stime", href: "/dashboard/valutazioni" }, { key: "richieste", label: "Richieste e offerte", href: "/dashboard/valutazioni?vista=richieste" }, { key: "permute", label: "Permute", href: "/dashboard/valutazioni?vista=permute" }];
  if (pro) tabs.push({ key: "pro", label: "Richieste ricevute (professionista)", href: "/dashboard/valutazioni/professionista" });
  let body: React.ReactNode;
  if (tab === "stime") {
    const { data } = await supabase.from("vehicle_valuations").select("id, make, model, year, mileage_km, status, estimate_min_cents, estimate_max_cents, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
    body = !data?.length ? <EmptyState title="Nessuna valutazione" action={<ButtonLink href="/valuta-la-tua-auto">Valuta la tua auto</ButtonLink>} /> : (
      <ul className="flex flex-col gap-2">{data.map((v) => (
        <li key={v.id}><Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div><p className="font-bold"><Link className="hover:underline" href={`/dashboard/valutazioni/${v.id}`}>{v.make} {v.model} {v.year}</Link></p><p className="text-sm text-muted">{v.mileage_km.toLocaleString("it-IT")} km · {formatDateTime(v.created_at)}</p></div>
          {v.status === "stimata" ? <Badge tone="success">{formatPrice(v.estimate_min_cents!)} – {formatPrice(v.estimate_max_cents!)}</Badge> : <Badge tone="warning">Dati insufficienti</Badge>}
        </Card></li>))}</ul>
    );
  } else if (tab === "richieste") {
    const { data } = await supabase.from("valuation_requests").select("id, status, intent, created_at, vehicle_valuations(make, model, year), valuation_offers(status, from_side)").eq("user_id", user.id).order("created_at", { ascending: false });
    body = !data?.length ? <EmptyState title="Nessuna richiesta ai professionisti" /> : (
      <ul className="flex flex-col gap-2">{data.map((r) => {
        const v = r.vehicle_valuations as unknown as { make: string; model: string; year: number };
        const offers = (r.valuation_offers as unknown as { status: string; from_side: string }[]).filter((o) => o.from_side === "professionista");
        return (<li key={r.id}><Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div><p className="font-bold"><Link className="hover:underline" href={`/dashboard/valutazioni/richiesta/${r.id}`}>{v.make} {v.model} {v.year}</Link></p><p className="text-sm text-muted">{r.intent === "vendita" ? "Valutazione e offerta" : "Valutazione"} · {formatDateTime(r.created_at)}</p></div>
          <Badge tone={r.status === "aperta" ? "warning" : "neutral"}>{r.status === "aperta" ? `${offers.length} proposte` : r.status}</Badge>
        </Card></li>);
      })}</ul>
    );
  } else {
    const { data } = await supabase.from("trade_in_proposals").select("id, status, proposed_value_cents, difference_cents, buyer_id, created_at, vehicle_listings(title)").or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`).order("created_at", { ascending: false });
    body = !data?.length ? <EmptyState title="Nessuna permuta" description="Apri un'auto in vendita e scegli «Proponi una permuta con la tua auto»." action={<ButtonLink href="/auto-usate">Trova la tua auto</ButtonLink>} /> : (
      <ul className="flex flex-col gap-2">{data.map((t) => (
        <li key={t.id}><Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div><p className="font-bold"><Link className="hover:underline" href={`/dashboard/permute/${t.id}`}>{(t.vehicle_listings as unknown as { title: string }).title}</Link></p>
            <p className="text-sm text-muted">{t.buyer_id === user.id ? "Proposta da te" : "Ricevuta sul tuo annuncio"} · valore proposto {formatPrice(t.proposed_value_cents)} · differenza indicativa {formatPrice(t.difference_cents ?? 0)}</p></div>
          <Badge tone={TRADE_STATUS[t.status].tone}>{TRADE_STATUS[t.status].label}</Badge>
        </Card></li>))}</ul>
    );
  }
  return <><TabLinks current={tab} items={tabs} />{body}</>;
}
