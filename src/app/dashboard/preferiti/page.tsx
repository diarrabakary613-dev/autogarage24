import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/misc";
import { Favorites } from "@/components/dashboard/favorites";

export const metadata: Metadata = { title: "Preferiti", robots: { index: false } };

export default function FavoritesPage(props: PageProps<"/dashboard/preferiti">) {
  return (
    <>
      <PageHeader title="Preferiti" description="Automobili, professionisti e ricambi che hai salvato." />
      <Suspense fallback={<Skeleton className="h-96" />}><Favorites searchParams={props.searchParams} /></Suspense>
    </>
  );
}
