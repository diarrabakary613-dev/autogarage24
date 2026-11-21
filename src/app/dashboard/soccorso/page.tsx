import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader, TabLinks } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ROADSIDE_SERVICES, ROADSIDE_STATUS } from "@/lib/services/labels";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Assistenza stradale", robots: { index: false } };

export default function RoadsideDashboard(props: PageProps<"/dashboard/soccorso">) {
  return (
    <>
      <PageHeader title="Assistenza stradale" description="Le tue richieste di soccorso e, se sei un operatore, le richieste ricevute." actions={<ButtonLink href="/soccorso-stradale/richiesta">Ho bisogno di assistenza</ButtonLink>} />
      <Suspense fallback={<Skeleton className="h-64" />}><List searchParams={props.searchParams} /></Suspense>
    </>
  );
}

async function List({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser("/dashboard/soccorso");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: profiles } = await supabase.from("professional_profiles").select("id").eq("user_id", user.id);
  const isOp = (profiles?.length ?? 0) > 0;
  const tab = isOp && sp.vista === "ricevute" ? "ricevute" : "mie";
  const ids = (profiles ?? []).map((p) => p.id);
  const { data } = tab === "mie"
    ? await supabase.from("roadside_requests").select("id, service, status, area_text, vehicle_desc, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100)
    : await supabase.from("roadside_requests").select("id, service, status, area_text, vehicle_desc, created_at, roadside_targets!inner(profile_id, status)").in("roadside_targets.profile_id", ids).order("created_at", { ascending: false }).limit(100);
  return (
    <>
      {isOp && <TabLinks current={tab} items={[{ key: "mie", label: "Le mie richieste", href: "/dashboard/soccorso" }, { key: "ricevute", label: "Richieste ricevute (operatore)", href: "/dashboard/soccorso?vista=ricevute" }, { key: "op", label: "Impostazioni operatore", href: "/dashboard/soccorso/operatore" }]} />}
      {!data?.length ? <EmptyState title={tab === "mie" ? "Nessuna richiesta di soccorso" : "Nessuna richiesta ricevuta"} description={tab === "mie" ? "Speriamo che non ti serva mai. Se succede, la richiesta richiede un minuto." : "Dichiara la tua disponibilità nelle impostazioni operatore per ricevere richieste."} /> : (
        <ul className="flex flex-col gap-2">{data.map((r) => (
          <li key={r.id}><Card className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div><p className="font-bold"><Link className="hover:underline" href={`/dashboard/soccorso/${r.id}`}>{ROADSIDE_SERVICES[r.service]} · {r.vehicle_desc}</Link></p>
              <p className="text-sm text-muted">{r.area_text} · {formatDateTime(r.created_at)}</p></div>
            <Badge tone={ROADSIDE_STATUS[r.status].tone}>{ROADSIDE_STATUS[r.status].label}</Badge>
          </Card></li>))}</ul>
      )}
    </>
  );
}
