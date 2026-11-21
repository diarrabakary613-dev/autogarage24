import type { ReactNode } from "react";
import { Suspense } from "react";
import { Container, Skeleton } from "@/components/ui/feedback";
import { AdminNav } from "@/components/admin/admin-nav";

/** Pannello amministrativo: menu filtrato in base ai permessi del ruolo (RBAC). */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 bg-mist">
      <Container className="grid gap-6 py-6 sm:py-10 lg:grid-cols-[240px_1fr] lg:gap-10">
        <Suspense fallback={<Skeleton className="h-12 lg:h-96" />}><AdminNav /></Suspense>
        <div className="min-w-0">{children}</div>
      </Container>
    </div>
  );
}
