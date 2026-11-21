import { CalendarClock, LogIn } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { BookingForm } from "./booking-form";

/** Prenotazione di visione / test drive sulla scheda auto (Fase 27). */
export async function BookingBox({ listingId, ownerId, slug }: { listingId: string; ownerId: string; slug: string }) {
  const user = await getCurrentUser();
  if (user?.id === ownerId) return null;
  const supabase = await createClient();
  const [{ data: settings }, { data: slots }] = await Promise.all([
    supabase.rpc("booking_public_settings", { listing_id: listingId }),
    supabase.rpc("booking_slots", { listing_id: listingId, days: 14 }),
  ]);
  const s = settings?.[0];
  if (!s?.enabled) return null; // il venditore non ha configurato le disponibilità: resta la richiesta di appuntamento classica
  const here = `/auto/${slug}`;
  return (
    <section id="prenota" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="prenota-t">
      <h2 id="prenota-t" className="flex items-center gap-2 text-lg font-bold"><CalendarClock className="size-5 text-orange-700" aria-hidden /> Prenota visione o test drive</h2>
      <p className="text-sm text-graphite">Orari indicati dal venditore (ora di Milano), appuntamenti da {s.slot_minutes} minuti. La prenotazione diventa definitiva solo quando il venditore la conferma.</p>
      {!user ? (
        <ButtonLink href={`/accedi?next=${encodeURIComponent(here + "#prenota")}`} icon={<LogIn className="size-4" aria-hidden />}>Accedi per prenotare</ButtonLink>
      ) : !slots?.length ? (
        <p className="rounded-xl bg-mist p-3 text-sm">Nessun orario libero nei prossimi 14 giorni. Puoi comunque chiedere un appuntamento al venditore con il modulo di contatto.</p>
      ) : (
        <BookingForm listingId={listingId} slug={slug} slots={slots} testDrive={{ enabled: s.test_drive_enabled, minYears: s.test_drive_min_years, conditions: s.test_drive_conditions }} />
      )}
    </section>
  );
}
