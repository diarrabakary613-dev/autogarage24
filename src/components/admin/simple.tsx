import type { ReactNode } from "react";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/misc";

/** Intestazione + contenuto in Suspense per le pagine del pannello. */
export function AdminPage({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Suspense fallback={<Skeleton className="h-96" />}>{children}</Suspense>
    </>
  );
}
