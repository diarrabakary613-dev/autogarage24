import { ActionForm } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form";
import { respondOffer } from "@/lib/actions/valuation";
import { formatPrice } from "@/lib/format";
import { formatDate, formatDateTime } from "@/lib/utils";

type Offer = { id: string; kind: string; from_side: string; amount_cents: number; conditions: string | null; requires_inspection: boolean; valid_until: string; status: string; created_at: string; profile_id: string };

/** Proposte e controproposte di una trattativa, con azioni per la parte che deve rispondere. */
export function OfferChain({ offers, side, back, today }: { offers: Offer[]; side: "utente" | "professionista"; back: string; today: string }) {
  if (!offers.length) return <p className="text-sm text-muted">Nessuna proposta ancora.</p>;
  return (
    <ol className="flex flex-col gap-2">{offers.map((o) => {
      const canAnswer = o.status === "inviata" && o.from_side !== side && o.valid_until >= today;
      return (
        <li key={o.id} className="rounded-xl border border-line p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p><strong>{o.from_side === "professionista" ? (o.kind === "valutazione" ? "Valutazione del professionista" : "Offerta di acquisto") : "Controproposta del cliente"}</strong> · {formatDateTime(o.created_at)}</p>
            <Badge tone={o.status === "accettata" ? "success" : o.status === "inviata" ? "warning" : "neutral"}>{o.status}</Badge>
          </div>
          <p className="text-xl font-extrabold tabular-nums">{formatPrice(o.amount_cents)}</p>
          {o.conditions && <p>{o.conditions}</p>}
          <p className="text-xs text-muted">{o.requires_inspection ? "Soggetta a ispezione del veicolo · " : ""}valida fino al {formatDate(o.valid_until)}</p>
          {canAnswer && (
            <div className="mt-2 flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <ActionForm action={respondOffer} submitLabel="Accetta" size="sm" hidden={{ offer_id: o.id, action: "accetta", back }} confirm="Accettare? È un accordo preliminare." />
                <ActionForm action={respondOffer} submitLabel="Rifiuta" size="sm" variant="ghost" hidden={{ offer_id: o.id, action: "rifiuta", back }} />
              </div>
              <ActionForm action={respondOffer} submitLabel="Invia controproposta" size="sm" variant="outline" hidden={{ offer_id: o.id, action: "controproposta", back }}>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field id={`c-${o.id}`} label="Importo (€)"><Input id={`c-${o.id}`} name="counter" type="number" min={100} step="100" required /></Field>
                  <Field id={`n-${o.id}`} label="Nota" optional><Input id={`n-${o.id}`} name="note" maxLength={1000} /></Field>
                </div>
              </ActionForm>
            </div>
          )}
        </li>
      );
    })}</ol>
  );
}
