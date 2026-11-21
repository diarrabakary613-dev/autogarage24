import type { Metadata } from "next";
import { Suspense } from "react";
import { Alert, Skeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/misc";
import { ListingWizard } from "@/components/listings/listing-wizard";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Nuovo annuncio", robots: { index: false } };

export default function NewListingPage(props: PageProps<"/dashboard/annunci/nuovo">) {
  return (
    <>
      <PageHeader title="Pubblica un'automobile" description="Sei passaggi: puoi salvare la bozza in qualsiasi momento e completarla più tardi." />
      <Suspense fallback={<Skeleton className="h-[600px]" />}><Wizard searchParams={props.searchParams} /></Suspense>
    </>
  );
}

async function Wizard({ searchParams }: { searchParams: PageProps<"/dashboard/annunci/nuovo">["searchParams"] }) {
  const user = await requireUser("/dashboard/annunci/nuovo");
  const sp = await searchParams;
  const contactId = typeof sp.contatto === "string" && /^[0-9a-f-]{36}$/.test(sp.contatto) && user.permissions.includes("field.manage") ? sp.contatto : undefined;
  if (user.accountStatus !== "attivo") return <Alert tone="error">Il tuo account non è attivo: non puoi pubblicare annunci.</Alert>;
  const supabase = await createClient();
  const { data: pro } = await supabase.from("professional_profiles").select("display_name, professional_type, city, province, postal_code").eq("user_id", user.id).in("professional_type", ["venditore_auto", "officina"]).maybeSingle();
  const { data: profile } = await supabase.from("profiles").select("city").eq("id", user.id).maybeSingle();
  if (contactId) {
    const { data: c } = await supabase.from("field_contacts").select("business_name, city").eq("id", contactId).maybeSingle();
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="info">Annuncio raccolto con il Field Manager presso <strong>{c?.business_name ?? "contatto"}</strong>. Non sarà pubblicabile senza l&apos;autorizzazione documentata del venditore.</Alert>
        <ListingWizard userId={user.id} fieldContactId={contactId} sellerLabel={`${c?.business_name ?? "Venditore"} (raccolto da AutoGarage24)`} defaults={{ city: c?.city ?? undefined }} />
      </div>
    );
  }
  return (
    <ListingWizard
      userId={user.id}
      sellerLabel={pro ? `${pro.display_name} (professionista)` : "privato (massimo 3 annunci attivi)"}
      defaults={{ city: pro?.city ?? profile?.city ?? undefined, province: pro?.province ?? undefined, postal_code: pro?.postal_code ?? undefined }}
    />
  );
}
