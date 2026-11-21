import { OnboardingChecklist } from "./onboarding-checklist";
import Link from "next/link";
import { CalendarCheck, Eye, FileText, Inbox, Star } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card, EmptyState } from "@/components/ui/feedback";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { decideAffiliation } from "@/lib/actions/professional";
import { APPOINTMENT_STATUS_LABELS, REQUEST_STATUS_LABELS, REVIEW_STATUS_LABELS, SLOT_LABELS } from "@/lib/labels";
import { relativeTime } from "@/lib/format";
import { daysAgoIso, formatDate } from "@/lib/utils";

type Kind = "officina" | "meccanico" | "venditore_ricambi";
const BASE: Record<Kind, string> = { officina: "/garages", meccanico: "/meccanici", venditore_ricambi: "/venditori-ricambi" };

/** Dashboard professionale: solo dati propri e statistiche realmente registrate. */
export async function ProDashboard({ kind, path }: { kind: Kind; path: string }) {
  const user = await requireUser(path);
  const supabase = await createClient();
  const { data: p } = await supabase.from("professional_profiles").select("id, slug, display_name, review_status, view_count").eq("user_id", user.id).eq("professional_type", kind).is("deleted_at", null).maybeSingle();
  if (!p) {
    const reg = kind === "officina" ? "garage" : kind === "meccanico" ? "meccanico" : "ricambi";
    return <EmptyState title="Profilo professionale non attivo" description="Attiva il profilo per ricevere richieste dai clienti." action={<ButtonLink href={`/professionisti/registrazione-${reg}`}>Attiva il profilo</ButtonLink>} />;
  }
  const since = daysAgoIso(30);
  const today = new Date().toISOString().slice(0, 10);
  const [reqOpen, reqMonth, quotesSent, apptsConfirmed, completed, latest, appts, affs, reviewsCount] = await Promise.all([
    supabase.from("requests").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).eq("professional_profile_id", p.id).not("status", "in", "(completata,annullata,rifiutata)"),
    supabase.from("requests").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).eq("professional_profile_id", p.id).gte("created_at", since),
    supabase.from("quotes").select("id, requests!inner(professional_profile_id)", { count: "exact", head: true }).eq("sender_id", user.id).eq("requests.professional_profile_id", p.id),
    supabase.from("appointments").select("id, requests!inner(professional_profile_id)", { count: "exact", head: true }).eq("status", "confermato").eq("requests.professional_profile_id", p.id),
    supabase.from("requests").select("id", { count: "exact", head: true }).eq("professional_profile_id", p.id).eq("status", "completata"),
    supabase.from("requests").select("id, subject, status, created_at").eq("recipient_id", user.id).eq("professional_profile_id", p.id).order("created_at", { ascending: false }).limit(6),
    supabase.from("appointments").select("id, proposed_date, slot, status, request_id, requests!inner(subject, professional_profile_id)").eq("requests.professional_profile_id", p.id).in("status", ["in_attesa", "confermato"]).gte("proposed_date", today).order("proposed_date").limit(5),
    kind === "officina" ? supabase.from("professional_affiliations").select("id, message, mechanic:professional_profiles!professional_affiliations_mechanic_profile_id_fkey(display_name, slug)").eq("garage_profile_id", p.id).eq("status", "in_attesa") : Promise.resolve({ data: [] }),
    supabase.from("reviews").select("id", { count: "exact", head: true }).eq("profile_id", p.id).eq("status", "pubblicata"),
  ]);
  const stats = [
    { label: "Visite al profilo", value: p.view_count, icon: Eye },
    { label: "Richieste aperte", value: reqOpen.count ?? 0, icon: Inbox, href: "/dashboard/richieste?tab=ricevute" },
    { label: "Richieste ultimi 30 giorni", value: reqMonth.count ?? 0, icon: Inbox },
    { label: "Preventivi inviati", value: quotesSent.count ?? 0, icon: FileText },
    { label: "Appuntamenti confermati", value: apptsConfirmed.count ?? 0, icon: CalendarCheck, href: "/dashboard/appuntamenti" },
    { label: kind === "venditore_ricambi" ? "Richieste concluse" : "Interventi completati", value: completed.count ?? 0, icon: Star },
  ];
  return (
    <div className="flex flex-col gap-6">
      {p.review_status !== "approvato" && <Alert tone="warning" title={`Profilo ${REVIEW_STATUS_LABELS[p.review_status].toLowerCase()}`}>Il profilo non è ancora visibile ai clienti. <Link className="font-semibold underline" href={`/dashboard/profilo-professionale?profilo=${p.id}`}>Completa e invia il profilo</Link>.</Alert>}
      <OnboardingChecklist profileId={p.id} kind={kind} userId={user.id} />
      <div className="flex flex-wrap gap-2">
        <ButtonLink href={`/dashboard/profilo-professionale?profilo=${p.id}`} size="sm" variant="outline">Profilo pubblico</ButtonLink>
        {kind !== "venditore_ricambi" && <ButtonLink href={`/dashboard/servizi?profilo=${p.id}`} size="sm" variant="outline">Servizi</ButtonLink>}
        {kind === "venditore_ricambi" && <ButtonLink href="/dashboard/ricambi" size="sm" variant="outline">I miei ricambi</ButtonLink>}
        {kind === "venditore_ricambi" && <ButtonLink href="/dashboard/ricambi/nuovo" size="sm">Nuovo ricambio</ButtonLink>}
        {kind === "officina" && <ButtonLink href="/dashboard/annunci" size="sm" variant="outline">Automobili in vendita</ButtonLink>}
        <ButtonLink href="/dashboard/recensioni" size="sm" variant="outline">Recensioni ({reviewsCount.count ?? 0})</ButtonLink>
        {p.review_status === "approvato" && <ButtonLink href={`${BASE[kind]}/${p.slug}`} size="sm" variant="ghost">Anteprima pagina</ButtonLink>}
      </div>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {stats.map((s) => {
          const inner = <><s.icon className="size-5 text-orange-700" aria-hidden /><span className="text-2xl font-extrabold tabular-nums">{s.value}</span><span className="text-sm text-muted">{s.label}</span></>;
          return <li key={s.label}>{s.href ? <Link href={s.href} className="flex flex-col gap-1 rounded-2xl border border-line bg-white p-4 shadow-card hover:border-ink">{inner}</Link> : <div className="flex flex-col gap-1 rounded-2xl border border-line bg-white p-4 shadow-card">{inner}</div>}</li>;
        })}
      </ul>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-bold">Ultime richieste ricevute</h2>
          {!latest.data?.length ? <p className="text-sm text-muted">Nessuna richiesta ancora.</p> : (
            <ul className="divide-y divide-line">{latest.data.map((r) => <li key={r.id}><Link href={`/dashboard/richieste/${r.id}`} className="flex items-center justify-between gap-2 py-2.5 hover:underline"><span className="truncate">{r.subject}<span className="block text-xs text-muted">{relativeTime(r.created_at)}</span></span><Badge tone={r.status === "nuova" ? "orange" : "neutral"}>{REQUEST_STATUS_LABELS[r.status]}</Badge></Link></li>)}</ul>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-bold">Prossimi appuntamenti</h2>
          {!appts.data?.length ? <p className="text-sm text-muted">Nessun appuntamento in programma.</p> : (
            <ul className="divide-y divide-line">{appts.data.map((a) => <li key={a.id}><Link href={`/dashboard/richieste/${a.request_id}`} className="flex items-center justify-between gap-2 py-2.5 hover:underline"><span>{formatDate(a.proposed_date)} · {SLOT_LABELS[a.slot]}<span className="block text-xs text-muted">{(a.requests as unknown as { subject: string }).subject}</span></span><Badge tone={a.status === "confermato" ? "success" : "warning"}>{APPOINTMENT_STATUS_LABELS[a.status]}</Badge></Link></li>)}</ul>
          )}
        </Card>
      </div>
      {(affs.data?.length ?? 0) > 0 && (
        <Card className="p-5">
          <h2 className="mb-3 font-bold">Meccanici che chiedono di collaborare</h2>
          <ul className="flex flex-col gap-3">{affs.data!.map((a) => { const m = a.mechanic as unknown as { display_name: string; slug: string }; return (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-mist p-3">
              <span><Link className="font-semibold underline" href={`/meccanici/${m.slug}`}>{m.display_name}</Link>{a.message && <span className="block text-sm text-muted">{a.message}</span>}</span>
              <span className="flex gap-2"><ActionForm action={decideAffiliation} submitLabel="Accetta" size="sm" hidden={{ affiliation_id: a.id, accept: "1" }} /><ActionForm action={decideAffiliation} submitLabel="Rifiuta" size="sm" variant="outline" hidden={{ affiliation_id: a.id, accept: "0" }} /></span>
            </li>); })}</ul>
          <p className="mt-2 text-xs text-muted">Accettare mostra il collegamento sui due profili; non concede al meccanico permessi sulla tua officina.</p>
        </Card>
      )}
    </div>
  );
}
