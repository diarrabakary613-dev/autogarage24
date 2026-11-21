import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card, EmptyState } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form";
import { AdminPage } from "@/components/admin/simple";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { adminCancelBooking } from "@/lib/actions/bookings";
import { BOOKING_KINDS, BOOKING_STATUS, formatSlot } from "@/lib/bookings/time";

export const metadata: Metadata = { title: "Prenotazioni auto", robots: { index: false } };

export default function AdminBookingsPage(props: PageProps<"/admin/prenotazioni">) {
  return <AdminPage title="Prenotazioni di visione e test drive" description="Controllo delle prenotazioni e annullamento in caso di segnalazioni o abusi. Ogni annullamento è registrato."><Content searchParams={props.searchParams} /></AdminPage>;
}

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("bookings.manage", "/admin/prenotazioni");
  const sp = await searchParams;
  const status = typeof sp.stato === "string" && sp.stato in BOOKING_STATUS ? sp.stato : undefined;
  const supabase = await createClient();
  let q = supabase.from("vehicle_bookings").select("id, kind, status, starts_at, created_at, buyer_id, seller_id, vehicle_listings(title, slug)").order("starts_at", { ascending: false }).limit(150);
  if (status) q = q.eq("status", status);
  const [{ data }, { data: all }] = await Promise.all([q, supabase.from("vehicle_bookings").select("status")]);
  const counts = Object.fromEntries(Object.keys(BOOKING_STATUS).map((k) => [k, (all ?? []).filter((b) => b.status === k).length]));
  const ids = [...new Set((data ?? []).flatMap((b) => [b.buyer_id, b.seller_id]))];
  const { data: names } = ids.length ? await supabase.rpc("counterpart_names", { user_ids: ids }) : { data: [] };
  const name = (id: string) => names?.find((n) => n.user_id === id)?.display_name ?? "Utente";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/admin/prenotazioni" className={`rounded-full border px-3 py-1 ${!status ? "border-ink bg-ink text-white" : "border-line"}`}>Tutte ({all?.length ?? 0})</Link>
        {Object.entries(BOOKING_STATUS).map(([k, v]) => <Link key={k} href={`/admin/prenotazioni?stato=${k}`} className={`rounded-full border px-3 py-1 ${k === status ? "border-ink bg-ink text-white" : "border-line"}`}>{v.label} ({counts[k]})</Link>)}
      </div>
      {!data?.length ? <EmptyState title="Nessuna prenotazione" /> : data.map((b) => {
        const l = b.vehicle_listings as unknown as { title: string; slug: string } | null;
        return (
          <Card key={b.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold">{l ? <Link className="hover:underline" href={`/auto/${l.slug}`}>{l.title}</Link> : "Annuncio"}</p>
              <Badge tone={BOOKING_STATUS[b.status].tone}>{BOOKING_STATUS[b.status].label}</Badge>
            </div>
            <p className="text-sm text-graphite">{BOOKING_KINDS[b.kind]} · <span className="capitalize">{formatSlot(b.starts_at)}</span> · acquirente {name(b.buyer_id)} · venditore {name(b.seller_id)}</p>
            {["in_attesa", "confermato", "modifica_proposta"].includes(b.status) && (
              <ActionForm action={adminCancelBooking} submitLabel="Annulla prenotazione" size="sm" variant="danger" hidden={{ id: b.id }} confirm="Annullare e avvisare le parti?" className="mt-2">
                <Field id={`r-${b.id}`} label="Motivo (visibile alle parti)"><Input id={`r-${b.id}`} name="reason" required maxLength={500} /></Field>
              </ActionForm>
            )}
          </Card>
        );
      })}
    </div>
  );
}
