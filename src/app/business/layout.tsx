import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { BusinessNav } from "@/components/business/business-nav";
import { Container, Skeleton } from "@/components/ui/feedback";

export const metadata: Metadata = { title: { default: "Business Center", template: "%s · Business Center AutoGarage24" }, robots: { index: false } };

export default function BusinessLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 bg-mist print:bg-white">
      <Container className="grid gap-6 py-6 sm:py-10 lg:grid-cols-[250px_1fr] lg:gap-10 print:block print:py-0">
        <div className="print:hidden"><Suspense fallback={<Skeleton className="h-12 lg:h-96" />}><BusinessNav /></Suspense></div>
        <div className="min-w-0">{children}</div>
      </Container>
    </div>
  );
}
