"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { BOOKING_KINDS, romeLocalToIso } from "@/lib/bookings/time";
import type { FormState } from "@/lib/validation/form-state";
import { bool, dbErrorMessage, fail, int, isUuid, ok, str } from "./helpers";

const isIso = (s: string | null) => Boolean(s && !Number.isNaN(Date.parse(s)) && /^\d{4}-\d{2}-\d{2}T/.test(s));

export async function createBooking(_p: FormState, fd: FormData): Promise<FormState> {
  const listing = str(fd, "listing_id", 40);
  const slug = str(fd, "slug", 160) ?? "";
  await requireUser(`/auto/${slug}`);
  const kind = str(fd, "kind", 30);
  const starts = str(fd, "starts_at", 40);
  const alt = str(fd, "alt_starts_at", 40);
  const errors: Record<string, string> = {};
  if (!listing || !isUuid(listing)) return fail("Annuncio non valido.");
  if (!kind || !(kind in BOOKING_KINDS)) errors.kind = "Scegli il tipo di appuntamento.";
  if (!isIso(starts)) errors.starts_at = "Scegli uno degli orari disponibili.";
  if (alt && !isIso(alt)) errors.alt_starts_at = "Orario alternativo non valido.";
  if (alt && alt === starts) errors.alt_starts_at = "Scegli un orario diverso dal primo.";
  const testDrive = kind === "test_drive" || kind === "visione_test_drive";
  if (testDrive && !bool(fd, "license_confirmed")) errors.license_confirmed = "Per il test drive serve una patente valida.";
  if (testDrive && !bool(fd, "conditions_accepted")) errors.conditions_accepted = "Accetta le condizioni del test drive.";
  const phone = str(fd, "contact_phone", 30);
  if (phone && !/^[0-9 +().-]{6,30}$/.test(phone)) errors.contact_phone = "Numero non valido.";
  if (Object.keys(errors).length) return fail("Controlla i campi evidenziati.", errors);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_booking", {
    listing_id: listing, kind: kind!, starts_at: starts!, alt_starts_at: alt ?? undefined,
    message: str(fd, "message", 1000) ?? undefined, contact_phone: phone ?? undefined,
    license_confirmed: bool(fd, "license_confirmed"), driving_years: int(fd, "driving_years", 0, 70) ?? undefined,
    conditions_accepted: bool(fd, "conditions_accepted"),
  });
  if (error) return fail(dbErrorMessage(error));
  redirect(`/dashboard/prenotazioni/${data}?creata=1`);
}

const ACTIONS = ["conferma", "rifiuta", "proponi", "accetta_modifica", "rifiuta_modifica", "annulla", "completa", "mancata_presentazione"];

export async function respondBooking(_p: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "id", 40);
  await requireUser("/dashboard/prenotazioni");
  const action = str(fd, "action", 30);
  if (!id || !isUuid(id) || !action || !ACTIONS.includes(action)) return fail("Operazione non valida.");
  let newStart: string | undefined;
  if (action === "proponi") {
    const iso = romeLocalToIso(str(fd, "new_starts_at", 20));
    if (!iso) return fail("Indica data e ora del nuovo appuntamento.", { new_starts_at: "Data e ora obbligatorie." });
    newStart = iso;
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_booking", { booking_id: id, action, new_starts_at: newStart, note: str(fd, "note", 500) ?? undefined });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(`/dashboard/prenotazioni/${id}`);
  revalidatePath("/dashboard/prenotazioni");
  return ok("Prenotazione aggiornata. L'altra parte riceve una notifica.");
}

const D = "/dashboard/disponibilita";

export async function saveBookingSettings(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser(D);
  const slot = int(fd, "slot_minutes", 15, 120);
  if (!slot || ![15, 20, 30, 45, 60, 90, 120].includes(slot)) return fail("Durata non valida.");
  const supabase = await createClient();
  const { error } = await supabase.from("booking_settings").upsert({
    owner_id: user.id, slot_minutes: slot,
    min_notice_hours: int(fd, "min_notice_hours", 0, 168) ?? 12, max_days_ahead: int(fd, "max_days_ahead", 1, 120) ?? 30,
    test_drive_enabled: bool(fd, "test_drive_enabled"), test_drive_min_years: int(fd, "test_drive_min_years", 0, 30),
    test_drive_conditions: str(fd, "test_drive_conditions", 2000), meeting_address: str(fd, "meeting_address", 200),
  });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(D);
  return ok("Impostazioni salvate.");
}

const time = (s: string | null) => (s && /^\d{2}:\d{2}$/.test(s) ? s : null);

export async function addAvailability(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser(D);
  const days = fd.getAll("weekday").map(Number).filter((d) => d >= 1 && d <= 7);
  const start = time(str(fd, "start_time", 5)), end = time(str(fd, "end_time", 5));
  if (!days.length) return fail("Scegli almeno un giorno.");
  if (!start || !end || end <= start) return fail("L'orario di fine deve seguire quello di inizio.");
  const supabase = await createClient();
  const { error } = await supabase.from("booking_availability").insert(days.map((weekday) => ({ weekday, start_time: start, end_time: end })));
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(D);
  return ok("Fascia oraria aggiunta.");
}

export async function deleteAvailability(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser(D);
  const id = str(fd, "id", 40);
  if (!id || !isUuid(id)) return fail("Fascia non valida.");
  const supabase = await createClient();
  const { error } = await supabase.from("booking_availability").delete().eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(D);
  return ok("Fascia eliminata.");
}

export async function addBlock(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser(D);
  const s = romeLocalToIso(str(fd, "starts_at", 20)), e = romeLocalToIso(str(fd, "ends_at", 20));
  if (!s || !e || e <= s) return fail("Indica un periodo valido (fine dopo l'inizio).");
  const supabase = await createClient();
  const { error } = await supabase.from("booking_blocks").insert({ starts_at: s, ends_at: e, reason: str(fd, "reason", 200) });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(D);
  return ok("Periodo bloccato: nessuno potrà prenotare in quelle ore.");
}

export async function deleteBlock(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser(D);
  const id = str(fd, "id", 40);
  if (!id || !isUuid(id)) return fail("Blocco non valido.");
  const supabase = await createClient();
  const { error } = await supabase.from("booking_blocks").delete().eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(D);
  return ok("Blocco rimosso.");
}

export async function adminCancelBooking(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("bookings.manage", "/admin/prenotazioni");
  const id = str(fd, "id", 40), reason = str(fd, "reason", 500);
  if (!id || !isUuid(id)) return fail("Prenotazione non valida.");
  if (!reason || reason.length < 5) return fail("Indica il motivo (visibile alle parti).", { reason: "Obbligatorio." });
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_cancel_booking", { booking_id: id, reason });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/admin/prenotazioni");
  return ok("Prenotazione annullata e parti avvisate.");
}
