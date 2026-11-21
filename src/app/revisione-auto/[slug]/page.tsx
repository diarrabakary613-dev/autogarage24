import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { InspectionBookingForm } from "@/components/services/inspection-booking-form";
import { Badge, Card, Container, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { INSPECTION_CATEGORIES, INSPECTION_SERVICES } from "@/lib/inspection/labels";
import { nowMs } from "@/lib/bookings/time";

export const metadata: Metadata = { title: "Centro revisione" };

export default function CenterPage(props: PageProps<"/revisione-auto/[slug]">) {
  return <Container className="py-8"><Suspense fallback={<Skeleton className="h-96" />}><Body params={props.params} /></Suspense></Container>;
}

async function Body({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: list } = await supabase.rpc("search_inspection_centers", {});
  const c = (list ?? []).find((x) => x.slug === slug);
  if (!c) notFound();
  const user = await getCurrentUser();
  const [{ data: slots }, { data: vehicles }] = await Promise.all([
    supabase.rpc("inspection_slots", { profile_id: c.profile_id, days: 21 }),
    user ? supabase.from("user_vehicles").select("id, make, model, plate, inspection_category").eq("owner_id", user.id).is("deleted_at", null) : Promise.resolve({ data: [] }),
  ]);
  const today = new Date(nowMs()).toISOString().slice(0, 10);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <div className="flex flex-col gap-3">
        <p className="text-sm"><Link className="underline" href="/revisione-auto">← Revisione auto</Link></p>
        <h1 className="text-3xl font-extrabold">{c.display_name}</h1>
        <div className="flex flex-wrap gap-1">{c.authorized ? <Badge tone="success">Autorizzazione verificata dallo staff</Badge> : <Badge tone="warning">Autorizzazione in verifica</Badge>}{c.review_count > 0 && <Badge tone="neutral">★ {String(c.rating_avg).replace(".", ",")} · {c.review_count} recensioni</Badge>}</div>
        <p className="text-graphite">{[c.address, c.city].filter(Boolean).join(", ")}</p>
        {c.phone && <p><a className="font-semibold underline" href={`tel:${c.phone.replace(/[^0-9+]/g, "")}`}>{c.phone}</a></p>}
        <Card className="flex flex-col gap-1 p-4 text-sm">
          <p><strong>Veicoli:</strong> {c.vehicle_categories.map((x) => INSPECTION_CATEGORIES[x]).join(", ")}</p>
          <p><strong>Servizi:</strong> {c.services.map((x) => INSPECTION_SERVICES[x]).join(", ")}</p>
          {c.hours_text && <p><strong>Orari dichiarati:</strong> {c.hours_text}</p>}
          {c.price_notes && <p><strong>Tariffe dichiarate:</strong> {c.price_notes}</p>}
        </Card>
        <Link className="text-sm font-semibold text-orange-700 underline" href={`/professionisti/${c.slug}`}>Profilo completo e recensioni</Link>
      </div>
      <Card className="p-5">
        <h2 className="mb-3 text-lg font-bold">Richiedi un appuntamento</h2>
        {user ? <InspectionBookingForm centerId={c.profile_id} slug={slug} slots={slots ?? []} vehicles={vehicles ?? []} categories={c.vehicle_categories} today={today} />
          : <ButtonLink href={`/accedi?next=${encodeURIComponent(`/revisione-auto/${slug}`)}`}>Accedi per prenotare</ButtonLink>}
        <p className="mt-3 text-xs text-muted">La richiesta diventa un appuntamento solo quando il centro la conferma.</p>
      </Card>
    </div>
  );
}
