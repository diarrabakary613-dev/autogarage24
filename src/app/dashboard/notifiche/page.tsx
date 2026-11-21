import type { Metadata } from "next";
import { Suspense } from "react";
import { Bell } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, EmptyState, Skeleton } from "@/components/ui/feedback";
import { PageHeader, Pagination } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { markNotifications, openNotification } from "@/lib/actions/messaging";
import { NOTIFICATION_CATEGORY_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/utils";
import type { Enums } from "@/lib/supabase/database.types";
import Link from "next/link";

export const metadata: Metadata = { title: "Notifiche", robots: { index: false } };
const PAGE = 25;

export default function NotificationsPage(props: PageProps<"/dashboard/notifiche">) {
  return (
    <>
      <PageHeader title="Notifiche" description={<>Tutti gli aggiornamenti in un unico posto. <Link className="underline" href="/dashboard/impostazioni/notifiche">Scegli quali ricevere</Link>.</>}
        actions={<ActionForm action={markNotifications} submitLabel="Segna tutte come lette" size="sm" variant="outline" hidden={{ action: "tutte_lette" }} />} />
      <Suspense fallback={<Skeleton className="h-96" />}><List searchParams={props.searchParams} /></Suspense>
    </>
  );
}

async function List({ searchParams }: { searchParams: PageProps<"/dashboard/notifiche">["searchParams"] }) {
  await requireUser("/dashboard/notifiche");
  const sp = await searchParams;
  const cat = typeof sp.categoria === "string" && sp.categoria in NOTIFICATION_CATEGORY_LABELS ? (sp.categoria as Enums<"notification_category">) : null;
  const unreadOnly = sp.solo === "non_lette";
  const page = Math.max(1, Number(sp.pagina) || 1);
  const supabase = await createClient();
  let q = supabase.from("notifications").select("*", { count: "exact" }).is("archived_at", null).order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  if (cat) q = q.eq("category", cat);
  if (unreadOnly) q = q.is("read_at", null);
  const { data, count } = await q;
  const href = (o: Record<string, string>) => `/dashboard/notifiche?${new URLSearchParams({ ...(cat ? { categoria: cat } : {}), ...(unreadOnly ? { solo: "non_lette" } : {}), ...o })}`;
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        <a href="/dashboard/notifiche" className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${!cat && !unreadOnly ? "border-ink bg-ink text-white" : "border-line-strong bg-white"}`}>Tutte</a>
        <a href={href({ solo: "non_lette" })} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${unreadOnly ? "border-ink bg-ink text-white" : "border-line-strong bg-white"}`}>Non lette</a>
        {Object.entries(NOTIFICATION_CATEGORY_LABELS).map(([k, l]) => <a key={k} href={href({ categoria: k })} className={`rounded-full border px-3 py-1.5 text-sm ${cat === k ? "border-ink bg-ink text-white" : "border-line-strong bg-white"}`}>{l}</a>)}
      </div>
      {!data?.length ? <EmptyState icon={<Bell className="size-6" aria-hidden />} title="Nessuna notifica" description="Qui troverai messaggi, richieste, preventivi, appuntamenti e promemoria." /> : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          {data.map((n) => (
            <li key={n.id} className={`flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between ${n.read_at ? "" : "bg-orange-50/50"}`}>
              <form action={openNotification} className="min-w-0 flex-1">
                <input type="hidden" name="notification_id" value={n.id} />
                <button type="submit" className="w-full text-left">
                  <span className="flex flex-wrap items-center gap-2"><span className={n.read_at ? "font-semibold" : "font-extrabold"}>{n.title}</span><Badge tone="neutral">{NOTIFICATION_CATEGORY_LABELS[n.category]}</Badge>{!n.read_at && <span className="sr-only">non letta</span>}</span>
                  {n.body && <span className="block text-sm text-graphite">{n.body}</span>}
                  <span className="text-xs text-muted">{formatDateTime(n.created_at)}</span>
                </button>
              </form>
              <div className="flex shrink-0 gap-2">
                {!n.read_at && <ActionForm action={markNotifications} submitLabel="Letta" size="sm" variant="outline" hidden={{ notification_id: n.id, action: "letta" }} />}
                <ActionForm action={markNotifications} submitLabel="Archivia" size="sm" variant="ghost" hidden={{ notification_id: n.id, action: "archivia" }} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pageSize={PAGE} total={count ?? 0} hrefFor={(p) => href({ pagina: String(p) })} />
    </>
  );
}
