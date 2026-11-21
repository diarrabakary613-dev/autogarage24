import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, Skeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/misc";
import { getBusinessContext } from "@/lib/business/context";

export const metadata: Metadata = { title: "Migliora la tua presenza" };

export default function PresencePage() {
  return (
    <>
      <PageHeader title="Migliora la tua presenza su AutoGarage24" description="Suggerimenti calcolati dai dati reali del tuo profilo, delle richieste e delle recensioni." />
      <Suspense fallback={<Skeleton className="h-64" />}><Content /></Suspense>
    </>
  );
}

async function Content() {
  const { supabase, current } = await getBusinessContext("/business/presenza");
  const { data } = await supabase.rpc("business_profile_completeness", { profile_id: current.profile_id });
  const c = data as { score: number; items: { key: string; ok: boolean; tip: string; href: string; weight: number }[] };
  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <p className="text-sm text-muted">Completezza del profilo</p>
        <p className="text-4xl font-extrabold">{c.score}<span className="text-xl text-muted">/100</span></p>
        <div className="mt-2 h-3 rounded-full bg-mist"><div className="h-3 rounded-full bg-orange" style={{ width: `${c.score}%` }} /></div>
        <p className="mt-2 text-xs text-muted">Il punteggio indica quanto sono completi i dati che pubblichi. Non è una garanzia di posizionamento nelle ricerche né di nuovi clienti.</p>
      </Card>
      <ul className="flex flex-col gap-2">{c.items.map((i) => (
        <li key={i.key}><Card className={`flex items-center justify-between gap-3 p-4 ${i.ok ? "opacity-70" : ""}`}>
          <p className="text-sm">{i.ok ? "✓ " : "○ "}{i.ok ? "Fatto" : i.tip}</p>
          {!i.ok && <Link className="shrink-0 text-sm font-semibold text-orange-700 underline" href={i.href}>Sistema</Link>}
        </Card></li>))}</ul>
    </div>
  );
}
