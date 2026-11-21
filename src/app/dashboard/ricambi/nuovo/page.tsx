import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, Skeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/misc";
import { PartForm } from "@/components/parts/part-form";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Nuovo ricambio", robots: { index: false } };

export default function NewPartPage() {
  return (
    <>
      <PageHeader title="Pubblica un ricambio" description="1. Dati del prodotto → 2. Foto e compatibilità → 3. Invio in revisione. Puoi salvare la bozza e completarla più tardi." />
      <Suspense fallback={<Skeleton className="h-[500px]" />}><Form /></Suspense>
    </>
  );
}

async function Form() {
  const user = await requireUser("/dashboard/ricambi/nuovo");
  const supabase = await createClient();
  const [{ data: cats }, { data: pro }] = await Promise.all([
    supabase.from("part_categories").select("id, name, parent_id").eq("active", true).order("position"),
    supabase.from("professional_profiles").select("city, province, postal_code").eq("user_id", user.id).eq("professional_type", "venditore_ricambi").maybeSingle(),
  ]);
  return <Card className="p-6"><PartForm categories={cats ?? []} defaults={pro ?? undefined} /></Card>;
}
