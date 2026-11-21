import type { Metadata } from "next";
import { Suspense } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { acceptInvite } from "@/lib/actions/business";

export const metadata: Metadata = { title: "Benvenuto" };

export default function WelcomePage() {
  return <Suspense fallback={<Skeleton className="h-64" />}><Body /></Suspense>;
}

async function Body() {
  await requireUser("/business/benvenuto");
  const supabase = await createClient();
  const { data: invites } = await supabase.from("business_members").select("id, role, professional_profiles(display_name)").eq("status", "invitato");
  if (invites?.length) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-extrabold">Inviti ricevuti</h1>
        {invites.map((i) => (
          <Card key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p><strong>{(i.professional_profiles as unknown as { display_name: string }).display_name}</strong> ti invita come {i.role}.</p>
            <ActionForm action={acceptInvite} submitLabel="Accetta l'invito" size="sm" hidden={{ id: i.id }} />
          </Card>
        ))}
      </div>
    );
  }
  return <EmptyState title="Il Business Center è per le aziende partner" description="Registra la tua attività come professionista oppure chiedi al titolare di invitarti nel suo team con la tua email." action={<ButtonLink href="/professionisti">Registra la tua attività</ButtonLink>} />;
}
