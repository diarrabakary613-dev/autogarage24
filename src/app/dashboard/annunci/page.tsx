import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Car, Eye, Inbox, Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Input } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ownerListingAction, updateListingPrice } from "@/lib/actions/listings";
import { formatPrice } from "@/lib/format";
import { LISTING_STATUS_LABELS } from "@/lib/labels";
import { publicFileUrl } from "@/lib/storage";
import { formatDate } from "@/lib/utils";
import type { Enums } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "I miei annunci", robots: { index: false } };

const TONE: Partial<Record<Enums<"listing_status">, "success" | "warning" | "danger" | "neutral" | "dark" | "orange">> = {
  pubblicato: "success", in_revisione: "warning", approvato: "orange", rifiutato: "danger", sospeso: "neutral", venduto: "dark", scaduto: "neutral", bozza: "neutral",
};

export default function MyListingsPage() {
  return (
    <>
      <PageHeader title="I miei annunci" description="Crea, modifica e gestisci le automobili che hai messo in vendita." actions={<ButtonLink href="/dashboard/annunci/nuovo" icon={<Plus className="size-4" aria-hidden />}>Nuovo annuncio</ButtonLink>} />
      <Suspense fallback={<Skeleton className="h-96" />}><List /></Suspense>
    </>
  );
}

async function List() {
  const user = await requireUser("/dashboard/annunci");
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("vehicle_listings")
    .select("id, slug, title, price_cents, status, status_note, published_at, created_at, view_count, expires_at, owner_suspended, admin_suspended, vehicle_images(storage_path, is_cover, position)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  const ids = (rows ?? []).map((r) => r.id);
  // Conteggio richieste per annuncio in una sola query.
  const { data: reqs } = ids.length ? await supabase.from("requests").select("listing_id").in("listing_id", ids).eq("recipient_id", user.id) : { data: [] };
  const { data: dealer } = user.roles.includes("venditore_auto") ? await supabase.from("professional_profiles").select("id").eq("user_id", user.id).eq("professional_type", "venditore_auto").is("deleted_at", null).maybeSingle() : { data: null };
  const checklist = dealer ? <OnboardingChecklist profileId={dealer.id} kind="venditore_auto" userId={user.id} /> : null;
  const reqCount = new Map<string, number>();
  for (const r of reqs ?? []) reqCount.set(r.listing_id!, (reqCount.get(r.listing_id!) ?? 0) + 1);

  if (!rows?.length) {
    return <div className="flex flex-col gap-6">{checklist}<EmptyState icon={<Car className="size-6" aria-hidden />} title="Non hai ancora pubblicato annunci" description="Crea il tuo primo annuncio: potrai salvarlo come bozza e completarlo quando vuoi." action={<ButtonLink href="/dashboard/annunci/nuovo">Crea un annuncio</ButtonLink>} /></div>;
  }
  return (
    <>{checklist}
    <ul className="mt-6 flex flex-col gap-4">
      {rows.map((l) => {
        const imgs = [...(l.vehicle_images ?? [])].sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.position - b.position);
        const img = publicFileUrl("listing-images", imgs[0]?.storage_path);
        const actions: { action: string; label: string; variant?: "outline" | "danger"; confirm?: string }[] = [];
        if (l.status === "approvato") actions.push({ action: "pubblica", label: "Pubblica ora" });
        if (l.status === "pubblicato") actions.push({ action: "sospendi", label: "Sospendi", variant: "outline" }, { action: "venduto", label: "Segna come venduto", variant: "outline", confirm: "Confermi la vendita?" });
        if (l.status === "sospeso" && l.owner_suspended && !l.admin_suspended) actions.push({ action: "riattiva", label: "Riattiva" }, { action: "venduto", label: "Segna come venduto", variant: "outline", confirm: "Confermi la vendita?" });
        if (l.status === "scaduto") actions.push({ action: "rinnova", label: "Rinnova (nuova revisione)" });
        if (l.status === "bozza" || l.status === "rifiutato") actions.push({ action: "elimina", label: "Elimina", variant: "danger", confirm: "Eliminare definitivamente?" });
        return (
          <li key={l.id} className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-4 shadow-card sm:flex-row">
            <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-mist sm:w-44">
              {img ? <Image src={img} alt="" fill sizes="176px" className="object-cover" /> : <div className="grid h-full place-items-center text-muted"><Car className="size-8" aria-hidden /></div>}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={TONE[l.status] ?? "neutral"}>{LISTING_STATUS_LABELS[l.status]}</Badge>
                {l.admin_suspended && <Badge tone="danger">Sospeso dall&apos;amministrazione</Badge>}
              </div>
              <h2 className="truncate text-lg font-bold">{l.title}</h2>
              <p className="text-sm text-muted">
                {l.published_at ? `Pubblicato il ${formatDate(l.published_at)}` : `Creato il ${formatDate(l.created_at)}`}
                {l.expires_at && l.status === "pubblicato" && ` · scade il ${formatDate(l.expires_at)}`}
              </p>
              {l.status_note && (l.status === "rifiutato" || l.status === "bozza" || l.admin_suspended) && <p className="rounded-lg bg-warning-50 p-2 text-sm text-[#6e4000]"><strong>Nota della revisione:</strong> {l.status_note}</p>}
              <p className="flex flex-wrap gap-4 text-sm text-graphite">
                <span className="inline-flex items-center gap-1"><Eye className="size-4" aria-hidden /> {l.view_count} visualizzazioni</span>
                <span className="inline-flex items-center gap-1"><Inbox className="size-4" aria-hidden /> {reqCount.get(l.id) ?? 0} richieste</span>
              </p>
              <div className="mt-1 flex flex-wrap items-start gap-2">
                <ButtonLink href={`/dashboard/annunci/${l.id}`} size="sm" variant="outline">Modifica</ButtonLink>
                {(l.status === "pubblicato" || l.status === "venduto") && <ButtonLink href={`/auto/${l.slug}`} size="sm" variant="ghost">Vedi annuncio</ButtonLink>}
                {actions.map((a) => (
                  <ActionForm key={a.action} action={ownerListingAction} submitLabel={a.label} variant={a.variant ?? "primary"} size="sm" hidden={{ listing_id: l.id, action: a.action }} confirm={a.confirm} />
                ))}
              </div>
            </div>
            <div className="sm:w-56">
              <p className="text-sm text-muted">Prezzo</p>
              <p className="text-xl font-extrabold">{formatPrice(l.price_cents)}</p>
              {["bozza", "in_revisione", "approvato", "pubblicato", "sospeso"].includes(l.status) && (
                <ActionForm action={updateListingPrice} submitLabel="Aggiorna prezzo" size="sm" variant="outline" hidden={{ listing_id: l.id }} className="mt-2 gap-2">
                  <label className="sr-only" htmlFor={`p-${l.id}`}>Nuovo prezzo in euro</label>
                  <Input id={`p-${l.id}`} name="price" inputMode="decimal" placeholder="Nuovo prezzo €" />
                </ActionForm>
              )}
            </div>
          </li>
        );
      })}
      <li className="text-sm text-muted">Le richieste ricevute sulle tue automobili sono in <Link href="/dashboard/richieste?tab=ricevute" className="font-semibold text-orange-700 hover:underline">Richieste sulle mie automobili</Link>.</li>
    </ul></>
  );
}
