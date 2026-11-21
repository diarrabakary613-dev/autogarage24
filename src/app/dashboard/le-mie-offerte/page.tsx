import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { updateClaim } from "@/lib/actions/offers";
import { CLAIM_STATUS } from "@/lib/offers/labels";
import { formatPrice } from "@/lib/format";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Le mie offerte", robots: { index: false } };

export default function MyOffersPage() {
  return (<><PageHeader title="Le mie offerte" description="Offerte richieste, codici personali e stato. Nessun pagamento avviene su AutoGarage24." actions={<ButtonLink href="/offerte">Cerca offerte</ButtonLink>} /><Suspense fallback={<Skeleton className="h-64" />}><List /></Suspense></>);
}

async function List() {
  const user = await requireUser("/dashboard/le-mie-offerte");
  const supabase = await createClient();
  const { data } = await supabase.from("offer_claims").select("*, promotional_offers(title, slug, ends_on)").eq("user_id", user.id).order("created_at", { ascending: false });
  if (!data?.length) return <EmptyState title="Nessuna offerta richiesta" action={<ButtonLink href="/offerte">Scopri le offerte</ButtonLink>} />;
  return (
    <ul className="flex flex-col gap-3">{data.map((c) => {
      const o = c.promotional_offers as unknown as { title: string; slug: string; ends_on: string } | null;
      return (
        <li key={c.id}><Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div><p className="font-bold">{o ? <Link className="underline" href={`/offerte/${o.slug}`}>{o.title}</Link> : "Offerta"}</p>
            <p className="text-sm">Codice <span className="font-mono text-lg font-extrabold">{c.claim_code}</span> · stima {formatPrice(c.estimated_cents)}</p>
            <p className="text-xs text-muted">Richiesta il {formatDateTime(c.created_at)}</p></div>
          <div className="flex flex-wrap items-center gap-2"><Badge tone={c.status === "utilizzato" ? "success" : c.status === "annullato" ? "neutral" : "orange"}>{CLAIM_STATUS[c.status as keyof typeof CLAIM_STATUS]}</Badge>
            {c.conversation_id && <ButtonLink href={`/dashboard/messaggi/${c.conversation_id}`} size="sm" variant="outline">Contatta il partner</ButtonLink>}
            {["richiesto", "confermato"].includes(c.status) && <ActionForm action={updateClaim} submitLabel="Annulla" size="sm" variant="ghost" hidden={{ id: c.id, status: "annullato" }} confirm="Annullare la richiesta?" />}</div>
        </Card></li>
      );
    })}</ul>
  );
}
