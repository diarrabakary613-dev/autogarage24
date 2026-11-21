import Link from "next/link";
import type { Metadata } from "next";
import { VideoManager } from "@/components/marketplace/video-manager";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Alert, Skeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/misc";
import { ListingWizard } from "@/components/listings/listing-wizard";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/actions/helpers";
import { findBrand } from "@/config/brands";
import { LISTING_STATUS_LABELS } from "@/lib/labels";
import type { Tables } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Modifica annuncio", robots: { index: false } };

export default function EditListingPage(props: PageProps<"/dashboard/annunci/[id]">) {
  return (
    <>
      <PageHeader title="Modifica annuncio" description="Prezzo e disponibilità si aggiornano subito; le modifiche ai dati o alla descrizione di un annuncio pubblicato lo rimandano in revisione." />
      <Suspense fallback={<Skeleton className="h-[600px]" />}><Editor params={props.params} /></Suspense>
    </>
  );
}

async function Editor({ params }: { params: PageProps<"/dashboard/annunci/[id]">["params"] }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/annunci/${id}`);
  if (!isUuid(id)) notFound();
  const supabase = await createClient();
  const { data: l } = await supabase.from("vehicle_listings").select("*, vehicles(*), vehicle_images(id, storage_path, is_cover, position)").eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (!l) notFound();
  const v = l.vehicles as unknown as Tables<"vehicles">;
  const imgs = [...(l.vehicle_images ?? [])].sort((a, b) => a.position - b.position);
  const { data: videos } = await supabase.from("vehicle_videos").select("id, storage_path").eq("listing_id", l.id).order("position");
  const { data: pro } = l.professional_profile_id ? await supabase.from("professional_profiles").select("display_name").eq("id", l.professional_profile_id).maybeSingle() : { data: null };
  return (
    <div className="flex flex-col gap-4">
      <Alert tone="info">Stato attuale: <strong>{LISTING_STATUS_LABELS[l.status]}</strong>{l.status_note ? ` — ${l.status_note}` : ""}</Alert>
      <ListingWizard
        userId={user.id}
        listingId={l.id}
        status={l.status}
        sellerLabel={pro ? `${pro.display_name} (professionista)` : "privato"}
        images={imgs.map((i) => ({ id: i.id, storage_path: i.storage_path, is_cover: i.is_cover }))}
        defaults={{
          ...v, equipment: (v.equipment ?? []).join("\n"),
          make_slug: findBrand(v.make_slug) ? v.make_slug : "altra", make_other: findBrand(v.make_slug) ? undefined : v.make_name,
          title: l.title, price: l.price_cents !== null ? (l.price_cents / 100).toString().replace(".", ",") : undefined, negotiable: l.negotiable,
          description: l.description, condition_notes: l.condition_notes, maintenance_notes: l.maintenance_notes, interventions_notes: l.interventions_notes,
          known_defects: l.known_defects, extra_info: l.extra_info, city: l.city, postal_code: l.postal_code, province: l.province, region: l.region,
        }}
      />
      <VideoManager listingId={l.id} userId={user.id} videos={videos ?? []} />
      {l.status === "pubblicato" && <Link href={`/auto/${l.slug}`} className="text-sm font-semibold text-orange-700 hover:underline">Vedi l&apos;annuncio come lo vedono gli acquirenti →</Link>}
    </div>
  );
}
