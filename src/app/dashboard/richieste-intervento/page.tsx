import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Wrench } from "lucide-react";
import { Badge, EmptyState, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PROBLEM_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Le mie richieste di intervento", robots: { index: false } };
const REPAIR_STATUS: Record<string, string> = { aperta: "Aperta", assegnata: "Preventivo scelto", chiusa: "Chiusa", annullata: "Annullata" };

export default function RepairListPage() {
  return (
    <>
      <PageHeader eyebrow="Officine" title="Le mie richieste di intervento" description="Richieste inviate a più officine e preventivi da confrontare." actions={<ButtonLink href="/richiedi-intervento">Richiedi un intervento</ButtonLink>} />
      <Suspense fallback={<Skeleton className="h-64" />}><List /></Suspense>
    </>
  );
}

async function List() {
  const user = await requireUser("/dashboard/richieste-intervento");
  const supabase = await createClient();
  const { data } = await supabase.from("repair_requests").select("id, vehicle_make, vehicle_model, category, status, created_at, requests(id, status, quotes(id, status))").eq("owner_id", user.id).order("created_at", { ascending: false });
  if (!data?.length) return <EmptyState icon={<Wrench className="size-6" aria-hidden />} title="Nessuna richiesta di intervento" description="Descrivi il problema della tua auto e ricevi preventivi dalle officine compatibili." action={<ButtonLink href="/richiedi-intervento">Richiedi un intervento</ButtonLink>} />;
  return (
    <ul className="flex flex-col gap-3">
      {data.map((r) => {
        const reqs = (r.requests ?? []) as { id: string; status: string; quotes: { id: string; status: string }[] }[];
        const quotes = reqs.flatMap((q) => q.quotes ?? []).filter((q) => q.status !== "sostituito").length;
        return (
          <li key={r.id}><Link href={`/dashboard/richieste-intervento/${r.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-white p-4 shadow-card hover:border-ink">
            <span><span className="block font-semibold">{PROBLEM_LABELS[r.category]} · {r.vehicle_make} {r.vehicle_model}</span><span className="text-sm text-muted">Creata il {formatDate(r.created_at)} · inviata a {reqs.length} {reqs.length === 1 ? "officina" : "officine"} · {quotes} preventivi</span></span>
            <Badge tone={r.status === "aperta" ? "orange" : r.status === "assegnata" ? "success" : "neutral"}>{REPAIR_STATUS[r.status]}</Badge>
          </Link></li>
        );
      })}
    </ul>
  );
}
