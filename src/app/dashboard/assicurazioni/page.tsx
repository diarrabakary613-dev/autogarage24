import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Alert, Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { COVERAGES } from "@/lib/insurance/labels";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Le mie richieste assicurative", robots: { index: false } };

export default function MyInsurancePage(props: PageProps<"/dashboard/assicurazioni">) {
  return (
    <>
      <PageHeader title="Le mie richieste assicurative" description="Richieste di preventivo inviate ai partner verificati, stato e preventivi ricevuti." actions={<ButtonLink href="/assicurazione-auto/richiesta">Nuova richiesta</ButtonLink>} />
      <Suspense fallback={<Skeleton className="h-64" />}><List searchParams={props.searchParams} /></Suspense>
    </>
  );
}

async function List({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser("/dashboard/assicurazioni");
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data }, { count: partnerOf }] = await Promise.all([
    supabase.from("insurance_quote_requests").select("id, vehicle_make, vehicle_model, coverages, status, created_at, insurance_request_partners(status)").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("insurance_partner_users").select("partner_id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);
  return (
    <>
      {sp.eliminata && <Alert tone="success" className="mb-3">Richiesta e dati eliminati dalla piattaforma.</Alert>}
      {Boolean(partnerOf) && <Alert tone="info" className="mb-3">Sei referente di un partner assicurativo: <Link className="underline" href="/dashboard/assicurazioni/partner">gestisci le richieste ricevute</Link>.</Alert>}
      {!data?.length ? <EmptyState title="Nessuna richiesta" action={<ButtonLink href="/assicurazione-auto">Scopri le coperture</ButtonLink>} /> : (
        <ul className="flex flex-col gap-2">{data.map((r) => {
          const parts = r.insurance_request_partners as unknown as { status: string }[];
          const quotes = parts.filter((p) => p.status === "preventivo_disponibile").length;
          return (
            <li key={r.id}><Card className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div><p className="font-bold"><Link className="hover:underline" href={`/dashboard/assicurazioni/${r.id}`}>{r.vehicle_make} {r.vehicle_model}</Link></p>
                <p className="text-sm text-muted">{r.coverages.map((c) => COVERAGES[c]?.label).join(", ")} · {formatDateTime(r.created_at)}</p></div>
              <Badge tone={r.status === "ritirata" ? "neutral" : quotes ? "success" : "warning"}>{r.status === "ritirata" ? "Ritirata" : quotes ? `${quotes} preventivi` : `Inviata a ${parts.length} partner`}</Badge>
            </Card></li>
          );
        })}</ul>
      )}
    </>
  );
}
