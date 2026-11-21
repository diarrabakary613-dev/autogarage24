import type { ReactNode } from "react";
import { Suspense } from "react";
import { Container, Skeleton } from "@/components/ui/feedback";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";

/** Struttura dell'area personale: menu laterale (desktop) o a scorrimento (smartphone). */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 bg-mist">
      <Container className="grid gap-6 py-6 sm:py-10 lg:grid-cols-[250px_1fr] lg:gap-10">
        <Suspense fallback={<Skeleton className="h-12 lg:h-96" />}>
          <DashboardNav />
        </Suspense>
        <div className="min-w-0">{children}</div>
      </Container>
    </div>
  );
}
