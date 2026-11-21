import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/misc";
import { RequestList } from "@/components/dashboard/request-list";

export const metadata: Metadata = { title: "Richieste a officine e meccanici", robots: { index: false } };

export default function GarageRequestsPage(props: PageProps<"/dashboard/richieste-officine">) {
  return (
    <>
      <PageHeader title="Richieste a officine e meccanici" description="Preventivi, assistenza e appuntamenti richiesti ai professionisti." />
      <Suspense fallback={<Skeleton className="h-64" />}><RequestList searchParams={props.searchParams} basePath="/dashboard/richieste-officine" fixedGroup="officine" /></Suspense>
    </>
  );
}
