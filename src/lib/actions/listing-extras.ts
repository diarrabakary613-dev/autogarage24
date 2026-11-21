"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/validation/form-state";
import { bool, dbErrorMessage, fail, isUuid, ok, str } from "./helpers";

const MIME: Record<string, string> = { mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime" };

/** Registra un video già caricato nel bucket listing-videos (cartella dell'utente). */
export async function addListingVideo(listingId: string, path: string, size: number): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser("/dashboard/annunci");
  if (!isUuid(listingId) || !path.startsWith(`${user.id}/`) || !/^[0-9a-f-]+\/[0-9a-f-]+\.(mp4|webm|mov)$/.test(path)) return { ok: false, error: "Percorso non valido." };
  const mime = MIME[path.split(".").pop()?.toLowerCase() ?? ""];
  if (!mime) return { ok: false, error: "Formato non supportato." };
  const supabase = await createClient();
  const { count } = await supabase.from("vehicle_videos").select("id", { count: "exact", head: true }).eq("listing_id", listingId);
  const { error } = await supabase.from("vehicle_videos").insert({ listing_id: listingId, storage_path: path, mime_type: mime, size_bytes: Math.max(1, Math.round(size)), position: count ?? 0 });
  if (error) {
    await supabase.storage.from("listing-videos").remove([path]);
    return { ok: false, error: dbErrorMessage(error) };
  }
  revalidatePath(`/dashboard/annunci/${listingId}`);
  return { ok: true };
}

export async function deleteListingVideo(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/dashboard/annunci");
  const id = str(fd, "id", 40), listing = str(fd, "listing_id", 40);
  if (!id || !isUuid(id) || !listing || !isUuid(listing)) return fail("Video non valido.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("vehicle_videos").delete().eq("id", id).select("storage_path").maybeSingle();
  if (error || !data) return fail(error ? dbErrorMessage(error) : "Video non trovato.");
  await supabase.storage.from("listing-videos").remove([data.storage_path]);
  revalidatePath(`/dashboard/annunci/${listing}`);
  return ok("Video eliminato.");
}

const KINDS = ["documentazione", "identita_venditore", "dati_tecnici"];

/** Verifica documentata dallo staff (o revoca). Richiede la descrizione dei documenti esaminati. */
export async function adminVerifyListing(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("listings.moderate", "/admin/moderazione");
  const id = str(fd, "listing_id", 40), kind = str(fd, "kind", 30), evidence = str(fd, "evidence", 1000);
  const revoke = bool(fd, "revoke");
  if (!id || !isUuid(id) || !kind || !KINDS.includes(kind)) return fail("Dati non validi.");
  if (!evidence || evidence.length < 10) return fail("Descrivi i documenti esaminati o il motivo della revoca (almeno 10 caratteri).", { evidence: "Obbligatorio." });
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_verify_listing", { listing_id: id, kind, evidence, revoke });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/admin/moderazione");
  return ok(revoke ? "Verifica revocata." : "Verifica registrata: il badge compare sulla scheda.");
}
