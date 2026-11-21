import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader, TabLinks } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { APPT_STATUS } from "@/lib/inspection/labels";
import { formatSlot } from "@/lib/bookings/time";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Revisioni", robots: { index: false } };

export default function InspectionsPage(props: PageProps<"/dashboard/revisioni">) {
  return (
    <>
      <PageHeader title="Revisioni" description="Appuntamenti di revisione, scadenze e storico delle tue auto." actions={<><ButtonLink href="/dashboard/revisioni/garage" variant="outline">Scadenze e storico</ButtonLink><ButtonLink href="/revisione-auto#centri">Trova un centro</ButtonLink></>} />
      <Suspense fallback={<Skeleton className="h-64" />}><List searchParams={props.searchParams} /></Suspense>
    </>
  );
}

async function List({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser("/dashboard/revisioni");
  const sp = await searchParams;
  const supabase = await createClient();
  const { count: isCenter } = await supabase.from("inspection_centers").select("profile_id, professional_profiles!inner(user_id)", { count: "exact", head: true }).eq("professional_profiles.user_id", user.id);
  const tab = isCenter && sp.vista === "centro" ? "centro" : "mie";
  const { data } = await supabase.from("inspection_appointments").select("id, vehicle_desc, status, starts_at, preferred_date, created_at, professional_profiles(display_name)")
    .eq(tab === "centro" ? "center_owner_id" : "user_id", user.id).order("created_at", { ascending: false }).limit(100);
  return (
    <>
      {Boolean(isCenter) && <TabLinks current={tab} items={[{ key: "mie", label: "Le mie revisioni", href: "/dashboard/revisioni" }, { key: "centro", label: "Richieste al mio centro", href: "/dashboard/revisioni?vista=centro" }, { key: "c", label: "Impostazioni centro", href: "/dashboard/revisioni/centro" }]} />}
      {!data?.length ? <EmptyState title="Nessun appuntamento" description="Trova un centro revisione e richiedi un appuntamento." /> : (
        <ul className="flex flex-col gap-2">{data.map((a) => (
          <li key={a.id}><Card className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div><p className="font-bold"><Link className="hover:underline" href={`/dashboard/revisioni/${a.id}`}>{a.vehicle_desc} · {(a.professional_profiles as unknown as { display_name: string }).display_name}</Link></p>
              <p className="text-sm text-muted capitalize">{a.starts_at ? formatSlot(a.starts_at) : `Data preferita ${formatDate(a.preferred_date!)}`}</p></div>
            <Badge tone={APPT_STATUS[a.status].tone}>{APPT_STATUS[a.status].label}</Badge>
          </Card></li>))}</ul>
      )}
    </>
  );
}
