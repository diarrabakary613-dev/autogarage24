import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Activity } from "lucide-react";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import { PageHeader, Pagination } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Attività", robots: { index: false } };
const PAGE = 40;

export default function ActivityPage(props: PageProps<"/dashboard/attivita">) {
  return (
    <>
      <PageHeader title="Centro attività" description="La cronologia degli eventi importanti: richieste, preventivi, appuntamenti, annunci e profilo." />
      <Suspense fallback={<Skeleton className="h-96" />}><List searchParams={props.searchParams} /></Suspense>
    </>
  );
}

async function List({ searchParams }: { searchParams: PageProps<"/dashboard/attivita">["searchParams"] }) {
  await requireUser("/dashboard/attivita");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.pagina) || 1);
  const supabase = await createClient();
  const { data, count } = await supabase.from("activity_events").select("*", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  if (!data?.length) return <EmptyState icon={<Activity className="size-6" aria-hidden />} title="Nessuna attività ancora" />;
  const days = new Map<string, typeof data>();
  for (const e of data) { const d = e.created_at.slice(0, 10); days.set(d, [...(days.get(d) ?? []), e]); }
  return (
    <>
      <ol className="flex flex-col gap-6">
        {[...days].map(([d, list]) => (
          <li key={d}>
            <h2 className="mb-2 text-sm font-bold tracking-wide text-muted uppercase">{formatDate(d)}</h2>
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-card">
              {list.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                  {e.link && e.link.startsWith("/") ? <Link href={e.link} className="font-medium hover:underline">{e.title}</Link> : <span className="font-medium">{e.title}</span>}
                  <span className="shrink-0 text-xs text-muted">{formatDateTime(e.created_at).split(" ").pop()}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <Pagination page={page} pageSize={PAGE} total={count ?? 0} hrefFor={(p) => `/dashboard/attivita?pagina=${p}`} />
    </>
  );
}
