import { LogIn, MessageSquare, Wrench } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Textarea } from "@/components/ui/form";
import { FavoriteButton } from "@/components/marketplace/favorite-button";
import { RequestForm } from "@/components/requests/request-form";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { startConversation } from "@/lib/actions/requests";
import { WORK_MODE_LABELS } from "@/lib/labels";
import type { Enums } from "@/lib/supabase/database.types";

/** Azioni sul profilo di un professionista: preventivo/appuntamento/assistenza, messaggio, preferiti. */
export async function ProfileContact({ profileId, ownerId, type, name, returnTo, services, workModes }: {
  profileId: string; ownerId: string; type: string; name: string; returnTo: string;
  services: { id: string; name: string }[]; workModes: Enums<"work_mode">[] | null;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 shadow-card">
        <h2 className="text-lg font-bold">Contatta {name}</h2>
        <p className="text-sm text-graphite">Accedi per richiedere un preventivo o un appuntamento, scrivere un messaggio e salvare il profilo. Tornerai qui subito dopo.</p>
        <ButtonLink href={`/accedi?next=${encodeURIComponent(returnTo)}`} icon={<LogIn className="size-4" aria-hidden />}>Accedi per continuare</ButtonLink>
        <ButtonLink href={`/registrati?next=${encodeURIComponent(returnTo)}`} variant="outline">Crea un account gratuito</ButtonLink>
      </section>
    );
  }
  if (user.id === ownerId) {
    return (
      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 shadow-card">
        <h2 className="text-lg font-bold">Questa è l&apos;anteprima del tuo profilo pubblico</h2>
        <ButtonLink href="/dashboard/profilo-professionale" variant="outline">Modifica il profilo</ButtonLink>
      </section>
    );
  }
  const supabase = await createClient();
  const [{ data: fav }, { data: vehicles }] = await Promise.all([
    supabase.from("favorites").select("id").eq("professional_profile_id", profileId).maybeSingle(),
    supabase.from("user_vehicles").select("id, make, model, version, year, is_primary").is("deleted_at", null).order("is_primary", { ascending: false }),
  ]);
  const isWorkshop = type === "officina" || type === "meccanico";
  const kinds: { value: Enums<"request_kind">; label: string }[] = type === "meccanico"
    ? [{ value: "assistenza", label: "Richiedi assistenza" }, { value: "preventivo", label: "Richiedi preventivo" }, { value: "appuntamento", label: "Proponi un appuntamento" }]
    : [{ value: "preventivo", label: "Richiedi preventivo" }, { value: "appuntamento", label: "Richiedi appuntamento" }];
  return (
    <section id="contatta" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Contatta {name}</h2>
        <FavoriteButton kind="profile" id={profileId} initial={Boolean(fav)} label={name} />
      </div>
      {isWorkshop && (
        <details className="rounded-xl border border-line" open>
          <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 font-semibold"><Wrench className="size-4 text-orange-700" aria-hidden /> {type === "meccanico" ? "Richiedi assistenza o preventivo" : "Richiedi preventivo o appuntamento"}</summary>
          <div className="border-t border-line p-4">
            <RequestForm
              kinds={kinds}
              target={{ professional_profile_id: profileId }}
              services={services}
              showVehicle
              vehicles={(vehicles ?? []).map((v) => ({ id: v.id, label: [v.make, v.model, v.version, v.year].filter(Boolean).join(" ") }))}
              workModes={type === "meccanico" ? (workModes ?? []).map((m) => ({ value: m, label: WORK_MODE_LABELS[m] })) : undefined}
              defaultSubject={type === "meccanico" ? "Richiesta di assistenza" : "Richiesta di preventivo"}
              defaultMessage={type === "meccanico" ? "Buongiorno, la mia automobile ha questo problema: " : "Buongiorno, vorrei un preventivo per: "}
              returnTo={returnTo}
            />
          </div>
        </details>
      )}
      <details className="rounded-xl border border-line" open={!isWorkshop}>
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 font-semibold"><MessageSquare className="size-4 text-orange-700" aria-hidden /> Scrivi un messaggio</summary>
        <div className="border-t border-line p-4">
          <ActionForm action={startConversation} submitLabel="Invia messaggio" pendingLabel="Invio…" hidden={{ professional_profile_id: profileId, return_to: returnTo }}>
            <Field id="pc-msg" label="Messaggio"><Textarea id="pc-msg" name="message" rows={4} maxLength={4000} /></Field>
          </ActionForm>
        </div>
      </details>
    </section>
  );
}
