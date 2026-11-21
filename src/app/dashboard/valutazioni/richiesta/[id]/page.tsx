import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OfferChain } from "@/components/services/offer-chain";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { withdrawRequest } from "@/lib/actions/valuation";
import { formatPrice } from "@/lib/format";
import { TARGET_STATUS } from "@/lib/valuation/labels";
import { nowMs } from "@/lib/bookings/time";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Richiesta di valutazione", robots: { index: false } };

export default function RequestPage(props: PageProps<"/dashboard/valutazioni/richiesta/[id]">) {
  return <Suspense fallback={<Skeleton className="h-96" />}><Detail params={props.params} /></Suspense>;
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/valutazioni/richiesta/${id}`);
  const supabase = await createClient();
  const { data: r } = await supabase.from("valuation_requests").select("*, vehicle_valuations(id, make, model, year, mileage_km, estimate_mid_cents, status)").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!r) notFound();
  const [{ data: targets }, { data: offers }, { data: events }] = await Promise.all([
    supabase.from("valuation_request_targets").select("*, professional_profiles(display_name, slug)").eq("request_id", id),
    supabase.from("valuation_offers").select("*").eq("request_id", id).order("created_at"),
    supabase.from("negotiation_events").select("*").eq("context", "valutazione").eq("context_id", id).order("created_at"),
  ]);
  const v = r.vehicle_valuations as unknown as { id: string; make: string; model: string; year: number; mileage_km: number; estimate_mid_cents: number | null; status: string };
  const today = new Date(nowMs()).toISOString().slice(0, 10);
  const best = (offers ?? []).filter((o) => o.from_side === "professionista" && o.status === "inviata").sort((a, b) => b.amount_cents - a.amount_cents)[0];
  return (
    <>
      <PageHeader title={`Valutazione ${v.make} ${v.model} ${v.year}`} description={`${v.mileage_km.toLocaleString("it-IT")} km · inviata il ${formatDateTime(r.created_at)}`} actions={<Badge tone={r.status === "aperta" ? "warning" : "neutral"}>{r.status}</Badge>} />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          {best && <Card className="p-4 text-sm">Proposta più alta in attesa: <strong>{formatPrice(best.amount_cents)}</strong>{v.estimate_mid_cents ? ` · stima preliminare ${formatPrice(v.estimate_mid_cents)}` : ""}</Card>}
          {(targets ?? []).map((t) => {
            const p = t.professional_profiles as unknown as { display_name: string; slug: string };
            return (
              <Card key={t.profile_id} className="flex flex-col gap-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">{p.display_name}</h2><Badge tone={TARGET_STATUS[t.status].tone}>{TARGET_STATUS[t.status].label}</Badge></div>
                {t.decline_reason && <p className="text-sm">Motivo: {t.decline_reason}</p>}
                <OfferChain offers={(offers ?? []).filter((o) => o.profile_id === t.profile_id)} side="utente" back={`/dashboard/valutazioni/richiesta/${id}`} today={today} />
                {t.conversation_id && <ButtonLink href={`/dashboard/messaggi/${t.conversation_id}`} variant="outline" size="sm" className="w-fit">Scrivi al professionista</ButtonLink>}
              </Card>
            );
          })}
        </div>
        <aside className="flex flex-col gap-3">
          <ButtonLink href={`/dashboard/valutazioni/${v.id}`} variant="outline">Dati e stima dell&apos;auto</ButtonLink>
          <Card className="p-4"><h2 className="mb-2 font-bold">Storico trattativa</h2>
            <ol className="flex flex-col gap-1 text-sm">{(events ?? []).map((e) => <li key={e.id}><span className="text-muted">{formatDateTime(e.created_at)}</span> · {e.event.replace(/_/g, " ")}{e.amount_cents ? ` · ${formatPrice(e.amount_cents)}` : ""}{e.note ? ` — ${e.note}` : ""}</li>)}</ol></Card>
          {r.status === "aperta" && <ActionForm action={withdrawRequest} submitLabel="Ritira la richiesta" size="sm" variant="danger" hidden={{ id }} confirm="Ritirare? I professionisti non vedranno più i dati." />}
        </aside>
      </div>
    </>
  );
}
