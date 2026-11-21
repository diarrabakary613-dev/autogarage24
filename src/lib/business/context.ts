import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { romeLocalToIso } from "@/lib/bookings/time";

export const BUSINESS_COOKIE = "ag24_azienda";
export type BusinessPerm = "lead" | "prenotazioni" | "annunci" | "offerte" | "statistiche" | "esportazioni" | "team" | "profilo" | "attivita";
export type Business = { profile_id: string; display_name: string; slug: string; professional_type: string; role: string; permissions: string[] };

/** Azienda attiva nel Business Center (cookie tecnico di preferenza, nessun tracciamento). */
export async function getBusinessContext(next = "/business") {
  const ctx = await findBusinessContext(next);
  if (!ctx) redirect("/business/benvenuto");
  return ctx;
}

/** Come getBusinessContext, ma restituisce null se l'utente non ha aziende (nessun reindirizzamento). */
export async function findBusinessContext(next = "/business") {
  const user = await requireUser(next);
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_businesses");
  const list = (data ?? []) as Business[];
  if (!list.length) return null;
  const store = await cookies();
  const chosen = store.get(BUSINESS_COOKIE)?.value;
  const current = list.find((b) => b.profile_id === chosen) ?? list[0];
  const can = (p: BusinessPerm) => current.role === "proprietario" || current.permissions.includes(p);
  return { user, supabase, list, current, can, isOwner: current.role === "proprietario" };
}

export const PERIODS: Record<string, { label: string; days: number }> = {
  oggi: { label: "Oggi", days: 1 }, "7": { label: "Ultimi 7 giorni", days: 7 }, "30": { label: "Ultimi 30 giorni", days: 30 }, "90": { label: "Ultimi 90 giorni", days: 90 },
};

/** Periodo dai parametri (?periodo= o ?da=&a= personalizzato). */
export function readPeriod(sp: Record<string, string | string[] | undefined>, now: number) {
  const da = typeof sp.da === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.da) ? sp.da : null;
  const a = typeof sp.a === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.a) ? sp.a : null;
  if (da && a && da <= a) return { key: "personalizzato", from: new Date(romeLocalToIso(`${da}T00:00`)!), to: new Date(new Date(romeLocalToIso(`${a}T00:00`)!).getTime() + 864e5 - 1000), da, a };
  const key = typeof sp.periodo === "string" && sp.periodo in PERIODS ? sp.periodo : "30";
  const to = new Date(now);
  const from = key === "oggi" ? new Date(romeLocalToIso(`${new Date(now).toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" })}T00:00`)!) : new Date(now - PERIODS[key].days * 864e5);
  return { key, from, to, da: from.toISOString().slice(0, 10), a: to.toISOString().slice(0, 10) };
}

export const LEAD_STATUS: Record<string, { label: string; tone: "neutral" | "orange" | "success" | "danger" | "warning" | "dark" }> = {
  nuovo: { label: "Nuovo contatto", tone: "warning" }, da_contattare: { label: "Da contattare", tone: "orange" }, in_trattativa: { label: "In trattativa", tone: "orange" },
  preventivo_inviato: { label: "Preventivo inviato", tone: "neutral" }, appuntamento_fissato: { label: "Appuntamento fissato", tone: "success" },
  completato: { label: "Servizio completato", tone: "dark" }, non_convertito: { label: "Non convertito", tone: "danger" },
};
export const LEAD_SOURCES: Record<string, string> = {
  richiesta: "Richiesta", prenotazione: "Prenotazione auto", soccorso: "Soccorso stradale", trasporto: "Trasporto", revisione: "Revisione",
  valutazione: "Valutazione auto", permuta: "Permuta", offerta: "Offerta",
};
export const MEMBER_ROLES: Record<string, string> = { amministratore: "Amministratore aziendale", responsabile: "Responsabile", dipendente: "Dipendente", operatore: "Operatore" };
export const PERMISSIONS: Record<string, string> = {
  lead: "Contatti e note", prenotazioni: "Prenotazioni e appuntamenti", annunci: "Annunci", offerte: "Offerte", statistiche: "Statistiche",
  esportazioni: "Esportazioni", team: "Team", profilo: "Profilo aziendale", attivita: "Attività",
};
