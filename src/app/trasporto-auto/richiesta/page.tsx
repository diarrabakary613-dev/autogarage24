import type { Metadata } from "next";
import { Suspense } from "react";
import { TransportForm } from "@/components/services/transport-form";
import { Card, Container, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { nowMs } from "@/lib/bookings/time";

export const metadata: Metadata = { title: "Richiedi il trasporto di un'auto", robots: { index: false } };

export default function TransportRequestPage(props: PageProps<"/trasporto-auto/richiesta">) {
  return (
    <Container className="flex max-w-3xl flex-col gap-5 py-6 sm:py-10">
      <h1 className="text-3xl font-extrabold">Richiedi il trasporto di un&apos;auto</h1>
      <p className="text-graphite">Gratuito e senza impegno. Riceverai i preventivi nella tua area e una notifica per ognuno.</p>
      <Suspense fallback={<Skeleton className="h-96" />}><Body searchParams={props.searchParams} /></Suspense>
    </Container>
  );
}

async function Body({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const listingId = typeof sp.annuncio === "string" && /^[0-9a-f-]{36}$/.test(sp.annuncio) ? sp.annuncio : null;
  const user = await getCurrentUser();
  if (!user) {
    const next = `/trasporto-auto/richiesta${listingId ? `?annuncio=${listingId}` : ""}`;
    return (
      <Card className="flex flex-col gap-3 p-6 text-center">
        <p className="text-lg font-bold">Accedi per richiedere i preventivi</p>
        <div className="flex flex-wrap justify-center gap-2"><ButtonLink href={`/accedi?next=${encodeURIComponent(next)}`}>Accedi</ButtonLink><ButtonLink href="/registrati" variant="outline">Registrati gratis</ButtonLink></div>
      </Card>
    );
  }
  const supabase = await createClient();
  const [{ data: listing }, { data: vehicles }] = await Promise.all([
    listingId ? supabase.from("vehicle_listings").select("id, title, city").eq("id", listingId).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("user_vehicles").select("id, make, model").eq("owner_id", user.id).is("deleted_at", null),
  ]);
  const today = new Date(nowMs()).toISOString().slice(0, 10);
  return <Card className="p-4 sm:p-6"><TransportForm userId={user.id} listing={listing} vehicles={vehicles ?? []} today={today} /></Card>;
}
