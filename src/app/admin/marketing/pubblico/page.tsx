import type { Metadata } from "next";
import { Card } from "@/components/ui/feedback";
import { AdminPage } from "@/components/admin/simple";
import { MarketingTabs } from "@/components/marketing-admin/shared";
import { requirePermission } from "@/lib/auth/session";
import { AUDIENCES, BY_AUDIENCE } from "@/lib/marketing/brief";

export const metadata: Metadata = { title: "Pubblico", robots: { index: false } };

export default function AudiencePage() {
  return <AdminPage title="Pubblico e messaggi" description="Segmenti e messaggi di riferimento (dettagli in docs/MARKETING_STRATEGY.md). Le inserzioni non usano dati personali degli utenti della piattaforma."><MarketingTabs current="pubblico" /><Content /></AdminPage>;
}

async function Content() {
  await requirePermission("marketing.manage", "/admin/marketing/pubblico");
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {(Object.keys(AUDIENCES) as (keyof typeof AUDIENCES)[]).map((a) => {
        const s = BY_AUDIENCE[a];
        return (
          <li key={a}><Card className="flex h-full flex-col gap-2 p-5 text-sm">
            <h2 className="text-base font-bold">{AUDIENCES[a]}</h2>
            <p><span className="font-semibold">Problema:</span> {s.pain}</p>
            <p><span className="font-semibold">Messaggio:</span> {s.promise}</p>
            <p><span className="font-semibold">Prova:</span> {s.proof}</p>
            <p><span className="font-semibold">CTA:</span> {s.cta} → <code>{s.landing}</code></p>
          </Card></li>
        );
      })}
    </ul>
  );
}
