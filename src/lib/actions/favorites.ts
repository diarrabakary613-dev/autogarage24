"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "./helpers";
import type { TablesInsert } from "@/lib/supabase/database.types";

export type FavoriteKind = "listing" | "profile" | "part" | "offer";
const COLUMN = { listing: "listing_id", profile: "professional_profile_id", part: "part_id", offer: "offer_id" } as const;

/** Aggiunge o rimuove un preferito. Restituisce il nuovo stato o la necessità di accedere. */
export async function toggleFavorite(kind: FavoriteKind, id: string): Promise<{ ok: boolean; saved?: boolean; login?: boolean; error?: string }> {
  if (!isUuid(id) || !(kind in COLUMN)) return { ok: false, error: "Elemento non valido." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, login: true };
  if (user.accountStatus !== "attivo") return { ok: false, error: "Account non attivo." };
  const supabase = await createClient();
  const column = COLUMN[kind];

  const { data: existing } = await supabase.from("favorites").select("id").eq(column, id).maybeSingle();
  if (existing) {
    const { error } = await supabase.from("favorites").delete().eq("id", existing.id);
    if (error) return { ok: false, error: "Non è stato possibile aggiornare i preferiti." };
    revalidatePath("/dashboard/preferiti");
    return { ok: true, saved: false };
  }
  const row: TablesInsert<"favorites"> = { user_id: user.id };
  if (kind === "listing") row.listing_id = id;
  else if (kind === "profile") row.professional_profile_id = id;
  else if (kind === "offer") row.offer_id = id;
  else row.part_id = id;
  const { error } = await supabase.from("favorites").insert(row);
  if (error && error.code !== "23505") return { ok: false, error: "Non è stato possibile salvare il preferito." };
  revalidatePath("/dashboard/preferiti");
  return { ok: true, saved: true };
}
