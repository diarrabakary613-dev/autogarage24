import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Package, Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Input } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { partOwnerAction, updatePartStock } from "@/lib/actions/parts";
import { formatPrice } from "@/lib/format";
import { PART_STATUS_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "I miei ricambi", robots: { index: false } };

export default function MyPartsPage() {
  return (
    <>
      <PageHeader title="I miei ricambi" description="Pubblica e gestisci i tuoi ricambi: prezzo e disponibilità si aggiornano subito." actions={<ButtonLink href="/dashboard/ricambi/nuovo" icon={<Plus className="size-4" aria-hidden />}>Nuovo ricambio</ButtonLink>} />
      <Suspense fallback={<Skeleton className="h-96" />}><List /></Suspense>
    </>
  );
}

async function List() {
  const user = await requireUser("/dashboard/ricambi");
  const supabase = await createClient();
  const { data } = await supabase.from("part_listings").select("id, slug, title, status, status_note, price_cents, quantity, view_count, created_at, published_at").eq("owner_id", user.id).order("created_at", { ascending: false });
  if (!data?.length) return <EmptyState icon={<Package className="size-6" aria-hidden />} title="Nessun ricambio" description="Crea il primo annuncio: puoi salvarlo come bozza e completarlo più tardi." action={<ButtonLink href="/dashboard/ricambi/nuovo">Nuovo ricambio</ButtonLink>} />;
  return (
    <ul className="flex flex-col gap-3">
      {data.map((p) => {
        const actions: [string, string, "primary" | "outline" | "danger"][] = [];
        if (p.status === "approvato") actions.push(["pubblica", "Pubblica", "primary"]);
        if (p.status === "pubblicato") actions.push(["esaurito", "Segna esaurito", "outline"], ["venduto", "Segna venduto", "outline"], ["sospendi", "Sospendi", "outline"]);
        if (p.status === "esaurito") actions.push(["disponibile", "Di nuovo disponibile", "primary"]);
        if (p.status === "sospeso" && !p.status_note) actions.push(["riattiva", "Riattiva", "primary"]);
        if (p.status === "scaduto") actions.push(["rinnova", "Rinnova", "primary"]);
        if (p.status === "bozza" || p.status === "rifiutato") actions.push(["elimina", "Elimina", "danger"]);
        return (
          <li key={p.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-card lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1">
              <Badge tone={p.status === "pubblicato" ? "success" : p.status === "rifiutato" ? "danger" : "neutral"}>{PART_STATUS_LABELS[p.status]}</Badge>
              <p className="mt-1 truncate font-bold"><Link href={`/dashboard/ricambi/${p.id}`} className="hover:underline">{p.title}</Link></p>
              <p className="text-sm text-muted">{formatPrice(p.price_cents)} · {p.quantity !== null ? `${p.quantity} pz` : "quantità non gestita"} · {p.view_count} visualizzazioni · {p.published_at ? `pubblicato il ${formatDate(p.published_at)}` : `creato il ${formatDate(p.created_at)}`}</p>
              {p.status_note && <p className="text-sm text-[#6e4000]">Nota: {p.status_note}</p>}
            </div>
            <div className="flex flex-wrap items-start gap-2">
              <ButtonLink href={`/dashboard/ricambi/${p.id}`} size="sm" variant="outline">Modifica</ButtonLink>
              {actions.map(([a, l, v]) => <ActionForm key={a} action={partOwnerAction} submitLabel={l} size="sm" variant={v} hidden={{ part_id: p.id, action: a }} confirm={a === "elimina" || a === "venduto" ? "Confermi?" : undefined} />)}
              {["bozza", "in_revisione", "approvato", "pubblicato", "esaurito"].includes(p.status) && (
                <ActionForm action={updatePartStock} submitLabel="Aggiorna" size="sm" variant="outline" hidden={{ part_id: p.id }} className="flex-row! items-end gap-2">
                  <label className="sr-only" htmlFor={`pp-${p.id}`}>Prezzo</label><Input id={`pp-${p.id}`} name="price" placeholder="€" className="w-24" inputMode="decimal" />
                  <label className="sr-only" htmlFor={`pq-${p.id}`}>Quantità</label><Input id={`pq-${p.id}`} name="quantity" placeholder="Pz" className="w-20" inputMode="numeric" />
                </ActionForm>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
