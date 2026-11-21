import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/misc";
import { ProDashboard } from "@/components/dashboard/pro-dashboard";

export const metadata: Metadata = { title: "Dashboard venditore ricambi", robots: { index: false } };

export default function Page() {
  return (
    <>
      <PageHeader title="Dashboard venditore ricambi" description="Panoramica della tua attività: richieste, preventivi, appuntamenti e statistiche registrate." />
      <Suspense fallback={<Skeleton className="h-96" />}><ProDashboard kind="venditore_ricambi" path="/dashboard/venditore-ricambi" /></Suspense>
    </>
  );
}
