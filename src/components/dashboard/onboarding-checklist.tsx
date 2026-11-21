import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { Card } from "@/components/ui/feedback";
import { createClient } from "@/lib/supabase/server";

type Kind = "officina" | "meccanico" | "venditore_ricambi" | "venditore_auto";

/** Checklist di onboarding (Fase 11): mostra solo ciò che manca davvero, calcolato dai dati del profilo. */
export async function OnboardingChecklist({ profileId, kind, userId }: { profileId: string; kind: Kind; userId: string }) {
  const supabase = await createClient();
  const [{ data: p }, services, parts, listings, verif, requests] = await Promise.all([
    supabase.from("professional_profiles").select("description, city, phone_public, email_public, logo_path, opening_hours, review_status, submitted_at").eq("id", profileId).maybeSingle(),
    supabase.from("professional_services").select("id", { count: "exact", head: true }).eq("profile_id", profileId).eq("active", true),
    kind === "venditore_ricambi" ? supabase.from("part_listings").select("id", { count: "exact", head: true }).eq("owner_id", userId).eq("status", "pubblicato") : Promise.resolve({ count: 0 }),
    kind === "venditore_auto" || kind === "officina" ? supabase.from("vehicle_listings").select("id", { count: "exact", head: true }).eq("owner_id", userId).eq("status", "pubblicato") : Promise.resolve({ count: 0 }),
    supabase.from("verification_requests").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("requests").select("id", { count: "exact", head: true }).eq("professional_profile_id", profileId),
  ]);
  if (!p) return null;
  const hours = p.opening_hours && typeof p.opening_hours === "object" && Object.keys(p.opening_hours as object).length > 0;
  const profileHref = `/dashboard/profilo-professionale?profilo=${profileId}`;
  const items: { done: boolean; label: string; href: string }[] = [
    { done: Boolean(p.description && p.description.length >= 80), label: "Scrivi una descrizione dell'attività (almeno 80 caratteri)", href: profileHref },
    { done: Boolean(p.city && (p.phone_public || p.email_public)), label: "Indica città e almeno un contatto pubblico", href: profileHref },
    { done: Boolean(p.logo_path), label: "Carica il logo o una foto", href: profileHref },
    ...(kind === "officina" || kind === "meccanico" ? [
      { done: Boolean(hours), label: "Inserisci gli orari", href: profileHref },
      { done: (services.count ?? 0) > 0, label: "Aggiungi almeno un servizio", href: `/dashboard/servizi?profilo=${profileId}` },
    ] : []),
    ...(kind === "venditore_ricambi" ? [{ done: (parts.count ?? 0) > 0, label: "Pubblica il primo ricambio", href: "/dashboard/ricambi/nuovo" }] : []),
    ...(kind === "venditore_auto" ? [{ done: (listings.count ?? 0) > 0, label: "Pubblica la prima automobile", href: "/dashboard/annunci/nuovo" }] : []),
    { done: Boolean(p.submitted_at) || p.review_status !== "bozza", label: "Invia il profilo in verifica", href: profileHref },
    { done: (verif.count ?? 0) > 0, label: "Carica i documenti per i badge di verifica", href: profileHref },
    { done: p.review_status === "approvato", label: "Profilo approvato e visibile ai clienti", href: profileHref },
    { done: (requests.count ?? 0) > 0, label: "Ricevi la prima richiesta", href: "/dashboard/richieste?tab=ricevute" },
  ];
  const done = items.filter((i) => i.done).length;
  if (done === items.length) return null;
  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">Completa l&apos;attivazione</h2>
        <span className="text-sm text-muted">{done} di {items.length} completate</span>
      </div>
      <div className="mb-4 h-2 rounded-full bg-mist" aria-hidden><div className="h-2 rounded-full bg-orange" style={{ width: `${(done / items.length) * 100}%` }} /></div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.label} className="flex items-start gap-2 text-sm">
            {i.done ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-label="Completata" /> : <Circle className="mt-0.5 size-4 shrink-0 text-muted" aria-label="Da completare" />}
            {i.done ? <span className="text-muted line-through">{i.label}</span> : <Link className="font-medium hover:underline" href={i.href}>{i.label}</Link>}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">Hai bisogno di aiuto? Scrivici da <Link className="underline" href="/dashboard/supporto">Assistenza</Link>: durante la Beta il team ti aiuta nella configurazione.</p>
    </Card>
  );
}
