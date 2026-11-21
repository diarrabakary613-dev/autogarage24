import type { Metadata } from "next";
import { Suspense } from "react";
import { InsuranceForm } from "@/components/services/insurance-form";
import { Card, Container, EmptyState, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Richiedi un preventivo assicurativo", robots: { index: false } };

export default function InsuranceRequestPage() {
  return (
    <Container className="flex max-w-3xl flex-col gap-5 py-6 sm:py-10">
      <h1 className="text-3xl font-extrabold">Richiedi un preventivo auto</h1>
      <p className="text-graphite">La richiesta va solo ai partner verificati che selezioni. AutoGarage24 non è un intermediario assicurativo e non riceve compensi dalla polizza.</p>
      <Suspense fallback={<Skeleton className="h-96" />}><Body /></Suspense>
    </Container>
  );
}

async function Body() {
  const user = await getCurrentUser();
  if (!user) return <Card className="flex flex-col items-center gap-3 p-6"><p className="font-bold">Accedi per inviare la richiesta</p><ButtonLink href="/accedi?next=%2Fassicurazione-auto%2Frichiesta">Accedi</ButtonLink></Card>;
  const supabase = await createClient();
  const [{ data: vehicles }, { data: partners }] = await Promise.all([
    supabase.from("user_vehicles").select("id, make, model, year, fuel, power_kw, registration_date, plate").eq("owner_id", user.id).is("deleted_at", null),
    supabase.from("insurance_partners").select("id, name, partner_type, privacy_url").eq("status", "verificato").order("name"),
  ]);
  if (!partners?.length) return <EmptyState title="Nessun partner assicurativo attivo" description="Al momento non ci sono intermediari verificati a cui inoltrare la richiesta. Il servizio si attiverà con i primi partner verificati." action={<ButtonLink href="/assicurazione-auto" variant="outline">Leggi la guida alle coperture</ButtonLink>} />;
  return <Card className="p-4 sm:p-6"><InsuranceForm vehicles={(vehicles ?? []).map((v) => ({ ...v, fuel: v.fuel as string | null }))} partners={partners} /></Card>;
}
