import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { respondTradeIn } from "@/lib/actions/valuation";
import { formatPrice } from "@/lib/format";
import { ACCIDENTS, CONDITIONS, TRADE_STATUS } from "@/lib/valuation/labels";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Permuta", robots: { index: false } };

export default function TradeInPage(props: PageProps<"/dashboard/permute/[id]">) {
  return <Suspense fallback={<Skeleton className="h-96" />}><Detail params={props.params} /></Suspense>;
}

function Act({ id, action, label, variant = "outline", note }: { id: string; action: string; label: string; variant?: "primary" | "outline" | "danger" | "ghost"; note?: boolean }) {
  return (
    <ActionForm action={respondTradeIn} submitLabel={label} size="sm" variant={variant} hidden={{ id, action }}>
      {note && <Field id={`n-${action}`} label="Nota" optional><Input id={`n-${action}`} name="note" maxLength={1000} /></Field>}
    </ActionForm>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/permute/${id}`);
  const supabase = await createClient();
  const { data: t } = await supabase.from("trade_in_proposals").select("*, vehicle_listings(title, slug), vehicle_valuations(make, model, version, year, mileage_km, condition, accidents, estimate_min_cents, estimate_max_cents, status)").eq("id", id).maybeSingle();
  if (!t) notFound();
  const { data: events } = await supabase.from("negotiation_events").select("*").eq("context", "permuta").eq("context_id", id).order("created_at");
  const seller = t.seller_id === user.id;
  const l = t.vehicle_listings as unknown as { title: string; slug: string };
  const v = t.vehicle_valuations as unknown as { make: string; model: string; version: string | null; year: number; mileage_km: number; condition: string; accidents: string; estimate_min_cents: number | null; estimate_max_cents: number | null; status: string };
  const open = !["accettata", "rifiutata", "ritirata"].includes(t.status);
  const value = t.counter_value_cents ?? t.proposed_value_cents;
  return (
    <>
      <PageHeader title={`Permuta · ${l.title}`} description={seller ? "Proposta ricevuta sul tuo annuncio" : "Proposta inviata da te"} actions={<Badge tone={TRADE_STATUS[t.status].tone}>{TRADE_STATUS[t.status].label}</Badge>} />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <Card className="grid gap-3 p-5 sm:grid-cols-3">
            <div className="rounded-xl bg-mist p-3"><p className="text-xs text-muted">Prezzo dell&apos;auto in vendita</p><p className="text-xl font-extrabold">{formatPrice(t.listing_price_cents)}</p></div>
            <div className="rounded-xl bg-mist p-3"><p className="text-xs text-muted">{t.counter_value_cents ? "Valore controproposto dal venditore" : "Valore proposto per l'auto in permuta"}</p><p className="text-xl font-extrabold">{formatPrice(value)}</p></div>
            <div className="rounded-xl bg-ink p-3 text-white"><p className="text-xs opacity-80">Differenza indicativa</p><p className="text-xl font-extrabold">{formatPrice(t.listing_price_cents - value)}</p></div>
            <p className="text-xs text-muted sm:col-span-3">Calcolo preliminare: non è un accordo concluso. Prezzi, passaggio di proprietà e condizioni si definiscono tra le parti dopo l&apos;eventuale ispezione.</p>
          </Card>
          <Card className="p-5 text-sm">
            <h2 className="mb-2 font-bold">Auto proposta in permuta</h2>
            <p>{v.make} {v.model} {v.version ?? ""} · {v.year} · {v.mileage_km.toLocaleString("it-IT")} km · condizioni {CONDITIONS[v.condition].toLowerCase()} · {ACCIDENTS[v.accidents].toLowerCase()}</p>
            {v.status === "stimata" && <p className="text-muted">Stima preliminare AutoGarage24: {formatPrice(v.estimate_min_cents!)} – {formatPrice(v.estimate_max_cents!)}</p>}
            {t.message && <p className="mt-2"><strong>Messaggio:</strong> {t.message}</p>}
          </Card>
          {open && (
            <Card className="flex flex-col gap-3 p-5">
              <h2 className="font-bold">Azioni</h2>
              <div className="flex flex-wrap gap-2">
                {seller && t.status === "inviata" && <Act id={id} action="valuta" label="Accetto di valutarla" variant="primary" />}
                {seller && <Act id={id} action="ispezione" label="Richiedi un'ispezione" />}
                {seller && t.status !== "controproposta" && <Act id={id} action="accetta" label="Accetta la proposta" variant="primary" />}
                {seller && <Act id={id} action="rifiuta" label="Rifiuta" variant="ghost" note />}
                {!seller && t.status === "controproposta" && <><Act id={id} action="accetta" label="Accetta la controproposta" variant="primary" /><Act id={id} action="rifiuta" label="Rifiuta" variant="ghost" /></>}
                {!seller && <Act id={id} action="ritira" label="Ritira la proposta" variant="danger" />}
              </div>
              {seller && (
                <ActionForm action={respondTradeIn} submitLabel="Invia controproposta" size="sm" variant="outline" hidden={{ id, action: "controproposta" }}>
                  <div className="grid gap-2 sm:grid-cols-2"><Field id="cv" label="Valore che riconosci per l'auto (€)"><Input id="cv" name="counter" type="number" min={100} step="100" required /></Field><Field id="cn" label="Nota" optional><Input id="cn" name="note" maxLength={1000} /></Field></div>
                </ActionForm>
              )}
            </Card>
          )}
        </div>
        <aside className="flex flex-col gap-3">
          {t.conversation_id && <ButtonLink href={`/dashboard/messaggi/${t.conversation_id}`} variant="outline">Apri la conversazione</ButtonLink>}
          <Link className="text-sm font-semibold text-orange-700 underline" href={`/auto/${l.slug}`}>Vai all&apos;annuncio</Link>
          <Card className="p-4"><h2 className="mb-2 font-bold">Storico</h2>
            <ol className="flex flex-col gap-1 text-sm">{(events ?? []).map((e) => <li key={e.id}><span className="text-muted">{formatDateTime(e.created_at)}</span> · {e.event}{e.amount_cents ? ` · ${formatPrice(e.amount_cents)}` : ""}{e.note ? ` — ${e.note}` : ""}</li>)}</ol></Card>
        </aside>
      </div>
    </>
  );
}
