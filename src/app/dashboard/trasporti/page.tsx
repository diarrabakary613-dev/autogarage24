import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader, TabLinks } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { TRANSPORT_SERVICES, TRANSPORT_STATUS } from "@/lib/services/labels";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Trasporti auto", robots: { index: false } };

export default function TransportDashboard(props: PageProps<"/dashboard/trasporti">) {
  return (
    <>
      <PageHeader title="Trasporti auto" description="Le tue richieste di trasporto e, se sei un trasportatore, le richieste aperte e i tuoi incarichi." actions={<ButtonLink href="/trasporto-auto/richiesta">Nuova richiesta</ButtonLink>} />
      <Suspense fallback={<Skeleton className="h-64" />}><List searchParams={props.searchParams} /></Suspense>
    </>
  );
}

async function List({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser("/dashboard/trasporti");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: ops } = await supabase.from("transport_operators").select("profile_id, status, regions, professional_profiles!inner(user_id)").eq("professional_profiles.user_id", user.id);
  const op = ops?.[0];
  const tab = op && (sp.vista === "aperte" || sp.vista === "incarichi") ? sp.vista : "mie";
  const sel = "id, vehicle_desc, service, status, pickup_city, delivery_city, date_from, date_to, urgency, created_at";
  let q = supabase.from("transport_requests").select(sel).order("created_at", { ascending: false }).limit(100);
  if (tab === "mie") q = q.eq("user_id", user.id);
  else if (tab === "incarichi") q = q.eq("operator_profile_id", op!.profile_id);
  else q = q.in("status", ["aperta", "preventivi_ricevuti"]).neq("user_id", user.id).or(`pickup_region.in.(${op!.regions.map((r) => `"${r}"`).join(",")}),delivery_region.in.(${op!.regions.map((r) => `"${r}"`).join(",")})`);
  const { data } = await q;
  return (
    <>
      {op && <TabLinks current={tab} items={[{ key: "mie", label: "Le mie richieste", href: "/dashboard/trasporti" }, { key: "aperte", label: "Richieste aperte nelle mie zone", href: "/dashboard/trasporti?vista=aperte" }, { key: "incarichi", label: "I miei incarichi", href: "/dashboard/trasporti?vista=incarichi" }, { key: "op", label: "Profilo trasportatore", href: "/dashboard/trasporti/operatore" }]} />}
      {op && op.status !== "attivo" && tab !== "mie" && <p className="mb-3 text-sm text-warning">Il tuo servizio è in verifica: vedrai le richieste aperte dopo l&apos;attivazione.</p>}
      {!data?.length ? <EmptyState title="Nessun trasporto" description={tab === "aperte" ? "Nessuna richiesta aperta nelle regioni che servi." : "Le richieste compariranno qui."} /> : (
        <ul className="flex flex-col gap-2">{data.map((r) => (
          <li key={r.id}><Card className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div><p className="font-bold"><Link className="hover:underline" href={`/dashboard/trasporti/${r.id}`}>{r.pickup_city} → {r.delivery_city} · {r.vehicle_desc}</Link></p>
              <p className="text-sm text-muted">{TRANSPORT_SERVICES[r.service]} · {formatDate(r.date_from)}–{formatDate(r.date_to)}{r.urgency === "urgente" ? " · urgente" : ""}</p></div>
            <Badge tone={TRANSPORT_STATUS[r.status].tone}>{TRANSPORT_STATUS[r.status].label}</Badge>
          </Card></li>))}</ul>
      )}
    </>
  );
}
