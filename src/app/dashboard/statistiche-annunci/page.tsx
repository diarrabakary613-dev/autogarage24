import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge, EmptyState, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { LISTING_STATUS_LABELS } from "@/lib/labels";

export const metadata: Metadata = { title: "Statistiche dei miei annunci", robots: { index: false } };

export default function ListingStatsPage() {
  return (
    <>
      <PageHeader title="Statistiche dei miei annunci" description="Dati reali registrati dalla piattaforma: visualizzazioni della scheda, salvataggi, richieste, prenotazioni e variazioni di prezzo." actions={<ButtonLink href="/dashboard/annunci" variant="outline">I miei annunci</ButtonLink>} />
      <Suspense fallback={<Skeleton className="h-64" />}><Stats /></Suspense>
    </>
  );
}

async function Stats() {
  await requireUser("/dashboard/statistiche-annunci");
  const supabase = await createClient();
  const { data } = await supabase.rpc("seller_listing_stats");
  if (!data?.length) return <EmptyState title="Nessun annuncio" action={<ButtonLink href="/dashboard/annunci/nuovo">Pubblica un annuncio</ButtonLink>} />;
  const tot = (k: "views" | "favorites" | "requests" | "bookings") => data.reduce((a, r) => a + Number(r[k] ?? 0), 0);
  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {([["Visualizzazioni", tot("views")], ["Salvataggi", tot("favorites")], ["Richieste", tot("requests")], ["Prenotazioni", tot("bookings")]] as [string, number][]).map(([l, v]) => (
          <div key={l} className="rounded-2xl border border-line bg-white p-4"><p className="text-sm text-muted">{l}</p><p className="text-2xl font-extrabold tabular-nums">{v}</p></div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line bg-white"><table className="w-full min-w-[640px] text-sm">
        <thead className="bg-mist text-left"><tr><th className="p-3">Annuncio</th><th className="p-3">Stato</th><th className="p-3 text-right">Visite</th><th className="p-3 text-right">Salvataggi</th><th className="p-3 text-right">Richieste</th><th className="p-3 text-right">Prenotazioni</th><th className="p-3 text-right">Cambi prezzo</th></tr></thead>
        <tbody className="divide-y divide-line">{data.map((r) => (
          <tr key={r.listing_id}>
            <td className="p-3"><Link className="font-semibold hover:underline" href={`/dashboard/annunci/${r.listing_id}`}>{r.title}</Link></td>
            <td className="p-3"><Badge tone={r.status === "pubblicato" ? "success" : "neutral"}>{LISTING_STATUS_LABELS[r.status]}</Badge></td>
            <td className="p-3 text-right tabular-nums">{r.views}</td><td className="p-3 text-right tabular-nums">{r.favorites}</td><td className="p-3 text-right tabular-nums">{r.requests}</td>
            <td className="p-3 text-right tabular-nums">{r.bookings}</td><td className="p-3 text-right tabular-nums">{r.price_changes}</td>
          </tr>))}</tbody>
      </table></div>
      <p className="mt-2 text-xs text-muted">Le visualizzazioni contano le aperture della scheda (senza cookie né identificazione dei visitatori).</p>
    </>
  );
}
