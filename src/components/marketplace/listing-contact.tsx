import { CalendarCheck, LogIn, MessageSquare } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Textarea } from "@/components/ui/form";
import { FavoriteButton } from "./favorite-button";
import { RequestForm } from "@/components/requests/request-form";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { startConversation } from "@/lib/actions/requests";

/** Pannello contatti della scheda annuncio: dipende dall'utente collegato. */
export async function ListingContact({ listingId, ownerId, slug, title }: { listingId: string; ownerId: string; slug: string; title: string }) {
  const user = await getCurrentUser();
  const here = `/auto/${slug}`;
  if (!user) {
    return (
      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="contatta-t">
        <h2 id="contatta-t" className="text-lg font-bold">Ti interessa questa automobile?</h2>
        <p className="text-sm text-graphite">Accedi per contattare il venditore, richiedere informazioni o un appuntamento e salvare l&apos;annuncio. Tornerai qui subito dopo.</p>
        <ButtonLink href={`/accedi?next=${encodeURIComponent(here)}`} icon={<LogIn className="size-4" aria-hidden />}>Accedi per contattare il venditore</ButtonLink>
        <ButtonLink href={`/registrati?next=${encodeURIComponent(here)}`} variant="outline">Crea un account gratuito</ButtonLink>
      </section>
    );
  }
  if (user.id === ownerId) {
    return (
      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 shadow-card">
        <h2 className="text-lg font-bold">È il tuo annuncio</h2>
        <ButtonLink href={`/dashboard/annunci`} variant="outline">Gestisci i tuoi annunci</ButtonLink>
      </section>
    );
  }
  const supabase = await createClient();
  const { data: fav } = await supabase.from("favorites").select("id").eq("listing_id", listingId).maybeSingle();
  return (
    <section id="contatta" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="contatta-t">
      <div className="flex items-center justify-between gap-3">
        <h2 id="contatta-t" className="text-lg font-bold">Contatta il venditore</h2>
        <FavoriteButton kind="listing" id={listingId} initial={Boolean(fav)} label={title} />
      </div>
      <details className="group rounded-xl border border-line" open>
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 font-semibold"><CalendarCheck className="size-4 text-orange-700" aria-hidden /> Richiedi informazioni o appuntamento</summary>
        <div className="border-t border-line p-4">
          <RequestForm
            kinds={[{ value: "info_auto", label: "Richiedi informazioni" }, { value: "appuntamento_auto", label: "Richiedi appuntamento" }]}
            target={{ listing_id: listingId }}
            defaultSubject={`Informazioni su ${title}`.slice(0, 200)}
            defaultMessage="Buongiorno, sono interessato a questa automobile. Potrei ricevere maggiori informazioni sulla disponibilità e sulle condizioni del veicolo?"
            returnTo={`/auto/${slug}`}
            allowAttachments={false}
          />
        </div>
      </details>
      <details className="group rounded-xl border border-line">
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 font-semibold"><MessageSquare className="size-4 text-orange-700" aria-hidden /> Scrivi un messaggio diretto</summary>
        <div className="border-t border-line p-4">
          <ActionForm action={startConversation} submitLabel="Invia messaggio" pendingLabel="Invio…" hidden={{ listing_id: listingId, return_to: `/auto/${slug}` }}>
            <Field id="dm-msg" label="Messaggio"><Textarea id="dm-msg" name="message" rows={4} maxLength={4000} required /></Field>
          </ActionForm>
        </div>
      </details>
    </section>
  );
}
