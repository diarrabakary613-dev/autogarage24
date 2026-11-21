import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays } from "lucide-react";
import { Badge, EmptyState, Skeleton } from "@/components/ui/feedback";
import { PageHeader, TabLinks } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { APPOINTMENT_STATUS_LABELS, SLOT_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Appuntamenti", robots: { index: false } };

export default function AppointmentsPage(props: PageProps<"/dashboard/appuntamenti">) {
  return (
    <>
      <PageHeader title="Appuntamenti" description="Le date proposte e confermate. Un appuntamento è confermato solo dopo l'accettazione esplicita dell'altra parte." />
      <Suspense fallback={<Skeleton className="h-96" />}><List searchParams={props.searchParams} /></Suspense>
    </>
  );
}

async function List({ searchParams }: { searchParams: PageProps<"/dashboard/appuntamenti">["searchParams"] }) {
  await requireUser("/dashboard/appuntamenti");
  const sp = await searchParams;
  const past = sp.vista === "passati";
  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createClient();
  let q = supabase.from("appointments").select("id, proposed_date, slot, time_text, status, note, request_id, requests(subject)").order("proposed_date", { ascending: !past }).limit(100);
  q = past ? q.lt("proposed_date", today) : q.gte("proposed_date", today);
  const { data } = await q;
  // Raggruppamento per giorno (vista calendario a elenco, leggibile anche da smartphone).
  const days = new Map<string, NonNullable<typeof data>>();
  for (const a of data ?? []) days.set(a.proposed_date, [...(days.get(a.proposed_date) ?? []), a]);
  return (
    <>
      <TabLinks current={past ? "passati" : "prossimi"} items={[{ key: "prossimi", label: "Prossimi", href: "/dashboard/appuntamenti" }, { key: "passati", label: "Passati", href: "/dashboard/appuntamenti?vista=passati" }]} />
      {days.size === 0 ? (
        <EmptyState icon={<CalendarDays className="size-6" aria-hidden />} title="Nessun appuntamento" description="Gli appuntamenti nascono dalle richieste: proponi una data dalla pagina di una richiesta." />
      ) : (
        <ol className="flex flex-col gap-5">
          {[...days.entries()].map(([day, list]) => (
            <li key={day}>
              <h2 className="mb-2 text-sm font-bold tracking-wide text-muted uppercase">{formatDate(day)}</h2>
              <ul className="flex flex-col gap-2">
                {list.map((a) => (
                  <li key={a.id}>
                    <Link href={`/dashboard/richieste/${a.request_id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white p-4 shadow-card hover:border-ink">
                      <span><span className="font-semibold">{(a.requests as { subject: string } | null)?.subject}</span><span className="block text-sm text-muted">{SLOT_LABELS[a.slot]}{a.time_text ? ` · ${a.time_text}` : ""}</span></span>
                      <Badge tone={a.status === "confermato" ? "success" : a.status === "in_attesa" ? "warning" : "neutral"}>{APPOINTMENT_STATUS_LABELS[a.status]}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
