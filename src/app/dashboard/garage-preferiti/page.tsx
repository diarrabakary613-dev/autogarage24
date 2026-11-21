import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/misc";
import { Favorites } from "@/components/dashboard/favorites";

export const metadata: Metadata = { title: "Officine preferite", robots: { index: false } };

export default function GarageFavoritesPage(props: PageProps<"/dashboard/garage-preferiti">) {
  return (
    <>
      <PageHeader title="Officine preferite" description="Le officine che hai salvato. Trovi tutti i preferiti in La mia area › Preferiti." />
      <Suspense fallback={<Skeleton className="h-64" />}><Favorites searchParams={props.searchParams} forced="officine" /></Suspense>
    </>
  );
}
