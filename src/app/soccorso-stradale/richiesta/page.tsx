import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, Card, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { EmergencyNotice } from "@/components/services/emergency-notice";
import { RoadsideForm } from "@/components/services/roadside-form";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Richiedi assistenza stradale", robots: { index: false } };

export default function RoadsideRequestPage() {
  return (
    <Container className="flex max-w-3xl flex-col gap-5 py-6 sm:py-10">
      <h1 className="text-3xl font-extrabold">Ho bisogno di assistenza</h1>
      <EmergencyNotice compact />
      <Suspense fallback={<Skeleton className="h-96" />}><Body /></Suspense>
    </Container>
  );
}

async function Body() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Card className="flex flex-col gap-3 p-6 text-center">
        <p className="text-lg font-bold">Accedi per inviare la richiesta</p>
        <p className="text-muted">L&apos;account serve per ricevere i preventivi, scrivere all&apos;operatore e seguire l&apos;intervento. La registrazione richiede un minuto.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <ButtonLink href="/accedi?next=%2Fsoccorso-stradale%2Frichiesta">Accedi</ButtonLink>
          <ButtonLink href="/registrati" variant="outline">Registrati gratis</ButtonLink>
        </div>
      </Card>
    );
  }
  const supabase = await createClient();
  const [{ data: vehicles }, { data: profile }, { data: open }] = await Promise.all([
    supabase.from("user_vehicles").select("id, make, model, year, plate").eq("owner_id", user.id).is("deleted_at", null).order("is_primary", { ascending: false }),
    supabase.from("profiles").select("phone").eq("id", user.id).maybeSingle(),
    supabase.from("roadside_requests").select("id").eq("user_id", user.id).not("status", "in", "(completata,annullata,nessun_operatore,consegnato)").maybeSingle(),
  ]);
  if (open) {
    return <Card className="flex flex-col gap-3 p-6"><p className="font-bold">Hai già una richiesta di soccorso aperta.</p><ButtonLink href={`/dashboard/soccorso/${open.id}`}>Vai alla richiesta</ButtonLink></Card>;
  }
  return <Card className="p-4 sm:p-6"><RoadsideForm userId={user.id} vehicles={vehicles ?? []} phone={profile?.phone ?? null} /></Card>;
}
