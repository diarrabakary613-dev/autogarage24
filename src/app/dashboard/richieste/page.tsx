import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/misc";
import { RequestList } from "@/components/dashboard/request-list";

export const metadata: Metadata = { title: "Richieste", robots: { index: false } };

export default function RequestsPage(props: PageProps<"/dashboard/richieste">) {
  return (
    <>
      <PageHeader title="Richieste" description="Le richieste che hai inviato e quelle ricevute su annunci, servizi e ricambi." />
      <Suspense fallback={<Skeleton className="h-96" />}><RequestList searchParams={props.searchParams} /></Suspense>
    </>
  );
}
