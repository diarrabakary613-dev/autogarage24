import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Bell, Building2, CalendarClock, Car, FileText, Heart, Inbox, MessagesSquare, Plus, ShieldCheck, Warehouse } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { REMINDER_CATEGORY_LABELS, REVIEW_STATUS_LABELS } from "@/lib/labels";
import { relativeTime } from "@/lib/format";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "La mia area", robots: { index: false } };

export default function DashboardPage(props: PageProps<"/dashboard">) {
  return (
    <Suspense fallback={<Skeleton className="h-[480px]" />}>
      <Overview searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Overview({ searchParams }: { searchParams: PageProps<"/dashboard">["searchParams"] }) {
  const user = await requireUser("/dashboard");
  const params = await searchParams;
  const supabase = await createClient();

  // Conteggi reali, in parallelo (nessuna query per singolo elemento).
  const [vehicles, favorites, openSent, openReceived, quotesToAnswer, appts, notifs, reminders, pro] = await Promise.all([
    supabase.from("user_vehicles").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("favorites").select("id", { count: "exact", head: true }),
    supabase.from("requests").select("id", { count: "exact", head: true }).eq("requester_id", user.id).not("status", "in", "(completata,annullata,rifiutata)"),
    supabase.from("requests").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).not("status", "in", "(completata,annullata,rifiutata)"),
    supabase.from("quotes").select("id, requests!inner(requester_id)", { count: "exact", head: true }).eq("status", "inviato").eq("requests.requester_id", user.id),
    supabase.from("appointments").select("id, proposed_date, slot, status, request_id", { count: "exact" }).in("status", ["in_attesa", "confermato"]).gte("proposed_date", new Date().toISOString().slice(0, 10)).order("proposed_date").limit(3),
    supabase.from("notifications").select("id, title, link, created_at, read_at").is("archived_at", null).order("created_at", { ascending: false }).limit(5),
    supabase.from("maintenance_reminders").select("id, title, category, due_date, status").in("status", ["attivo", "in_scadenza", "scaduto"]).order("due_date", { ascending: true, nullsFirst: false }).limit(4),
    user.isProfessional
      ? supabase.from("professional_profiles").select("id, display_name, review_status, view_count").eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const reviewNote = pro.data && pro.data.review_status !== "approvato"
    ? (await supabase.rpc("professional_private_details", { profile_id: pro.data.id })).data?.[0]?.review_note ?? null
    : null;

  const stats = [
    { label: "Auto nel garage", value: vehicles.count ?? 0, href: "/dashboard/garage-auto", icon: Warehouse },
    { label: "Preferiti", value: favorites.count ?? 0, href: "/dashboard/preferiti", icon: Heart },
    { label: "Richieste inviate aperte", value: openSent.count ?? 0, href: "/dashboard/richieste?tab=inviate", icon: Inbox },
    { label: "Preventivi da valutare", value: quotesToAnswer.count ?? 0, href: "/dashboard/richieste?tab=inviate", icon: FileText },
    ...(user.isProfessional
      ? [{ label: "Richieste ricevute aperte", value: openReceived.count ?? 0, href: "/dashboard/richieste?tab=ricevute", icon: Building2 }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="La mia area"
        title={`Ciao${user.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}`}
        description={
          <span className="flex flex-wrap gap-1.5 pt-1">
            {user.roles.map((r) => (
              <Badge key={r} tone={["admin", "super_admin"].includes(r) ? "dark" : "neutral"}>{ROLE_LABELS[r]}</Badge>
            ))}
          </span>
        }
        actions={
          <>
            <ButtonLink href="/dashboard/annunci/nuovo" size="sm" icon={<Plus className="size-4" aria-hidden />}>Pubblica un&apos;auto</ButtonLink>
            {user.isStaff && (
              <ButtonLink href="/admin" variant="secondary" size="sm" icon={<ShieldCheck className="size-4" aria-hidden />}>Pannello</ButtonLink>
            )}
          </>
        }
      />

      {params.password === "aggiornata" && <Alert tone="success">La password è stata aggiornata.</Alert>}

      {pro.data && (
        <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted">Profilo professionale</p>
            <p className="font-display text-lg font-bold">{pro.data.display_name}</p>
            <p className="text-sm">
              Stato: <strong>{REVIEW_STATUS_LABELS[pro.data.review_status]}</strong>
              {pro.data.review_status === "approvato" && <> · {pro.data.view_count} visualizzazioni del profilo</>}
            </p>
            {reviewNote && <p className="mt-1 text-sm text-warning">{reviewNote}</p>}
          </div>
          <ButtonLink href="/dashboard/profilo-professionale" variant="outline" size="sm">Gestisci profilo</ButtonLink>
        </Card>
      )}

      <section aria-label="Riepilogo" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map(({ label, value, href, icon: Icon }) => (
          <Link key={label} href={href} className="rounded-xl border border-line bg-white p-4 shadow-card transition-shadow hover:shadow-lift">
            <Icon className="mb-2 size-5 text-orange-700" aria-hidden />
            <p className="font-display text-2xl font-extrabold text-ink">{value}</p>
            <p className="text-sm text-muted">{label}</p>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Bell className="size-5 text-orange-700" aria-hidden /> Notifiche recenti</h2>
          {notifs.data && notifs.data.length > 0 ? (
            <ul className="divide-y divide-line">
              {notifs.data.map((n) => (
                <li key={n.id} className="py-2.5">
                  <Link href={n.link ?? "/dashboard/notifiche"} className="flex justify-between gap-3 text-sm hover:text-orange-700">
                    <span className={n.read_at ? "text-graphite" : "font-semibold text-ink"}>{n.title}</span>
                    <span className="shrink-0 text-xs text-muted">{relativeTime(n.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nessuna notifica" description="Qui vedrai richieste, risposte, appuntamenti e promemoria." />
          )}
        </Card>

        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><CalendarClock className="size-5 text-orange-700" aria-hidden /> Prossimi appuntamenti</h2>
          {appts.data && appts.data.length > 0 ? (
            <ul className="divide-y divide-line">
              {appts.data.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                  <Link href={`/dashboard/richieste/${a.request_id}`} className="font-semibold hover:text-orange-700">{formatDate(a.proposed_date)}</Link>
                  <Badge tone={a.status === "confermato" ? "success" : "warning"}>{a.status === "confermato" ? "Confermato" : "Da confermare"}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nessun appuntamento in programma" />
          )}
        </Card>

        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Car className="size-5 text-orange-700" aria-hidden /> Promemoria manutenzione</h2>
          {reminders.data && reminders.data.length > 0 ? (
            <ul className="divide-y divide-line">
              {reminders.data.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span>{r.title} <span className="text-muted">· {REMINDER_CATEGORY_LABELS[r.category] ?? r.category}</span></span>
                  <span className={r.status === "scaduto" ? "font-semibold text-danger" : "text-muted"}>{r.due_date ? formatDate(r.due_date) : "a chilometraggio"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nessun promemoria attivo" action={<ButtonLink href="/dashboard/manutenzione" variant="outline" size="sm">Aggiungi un promemoria</ButtonLink>} />
          )}
        </Card>

        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><MessagesSquare className="size-5 text-orange-700" aria-hidden /> Accesso rapido</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ["/auto-usate", "Cerca un'auto"], ["/auto-per-neopatentati", "Auto per neopatentati"], ["/garages", "Trova un'officina"],
              ["/meccanici", "Trova un meccanico"], ["/ricambi", "Cerca ricambi"], ["/dashboard/assistenza-auto", "Descrivi un problema"],
            ].map(([href, label]) => (
              <ButtonLink key={href} href={href} variant="outline" size="sm" className="justify-start">{label}</ButtonLink>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
