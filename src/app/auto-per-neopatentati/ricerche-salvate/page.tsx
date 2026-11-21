import type { Metadata } from "next";
import { Container } from "@/components/ui/feedback";
import { Breadcrumbs } from "@/components/marketing/page-hero";
import { NeoBottomNav } from "@/components/neopatentati/bottom-nav";
import { SavedSearchesList } from "@/components/neopatentati/saved-searches-list";

export const metadata: Metadata = {
  title: "Ricerche salvate — Auto per neopatentati",
  description: "Le ricerche di auto per neopatentati che hai salvato su questo dispositivo.",
  robots: { index: false, follow: true },
};

export default function SavedSearchesPage() {
  return (
    <div className="bg-ink text-white">
      <Container className="flex max-w-3xl flex-col gap-6 py-10 sm:py-14">
        <Breadcrumbs items={[{ name: "Auto per neopatentati", href: "/auto-per-neopatentati" }, { name: "Ricerche salvate", href: "/auto-per-neopatentati/ricerche-salvate" }]} inverted />
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-extrabold text-white">Ricerche salvate</h1>
          <p className="text-white/70">Le ricerche restano su questo dispositivo e in questo browser: non servono account e non inviamo nulla ai nostri server.</p>
        </div>
        <SavedSearchesList />
      </Container>
      <NeoBottomNav active="ricerche" />
    </div>
  );
}
