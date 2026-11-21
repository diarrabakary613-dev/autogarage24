"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/validation/form-state";
import { FUEL_LABELS, TRANSMISSION_LABELS } from "@/lib/labels";
import { dbErrorMessage, fail, ok, str } from "./helpers";

/** Profilo neopatentato: solo dati utili alla ricerca, visibili esclusivamente al titolare. */
export async function saveDriverProfile(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/neopatentato");
  const date = str(fd, "license_obtained_on", 10);
  const today = new Date().toISOString().slice(0, 10);
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today)) return fail("Data non valida.", { license_obtained_on: "Inserisci una data passata." });
  const cat = str(fd, "license_category", 10) ?? "B";
  const budget = str(fd, "budget", 20);
  const cents = budget ? Math.round(Number(budget.replace(/\./g, "").replace(",", ".")) * 100) : null;
  if (budget && (!cents || cents <= 0)) return fail("Budget non valido.", { budget: "Budget non valido." });
  const fuel = str(fd, "fuel", 30);
  const tr = str(fd, "transmission", 30);
  const supabase = await createClient();
  const { error } = await supabase.from("driver_profiles").upsert({
    user_id: user.id,
    license_obtained_on: date,
    license_category: ["B", "B96", "BE", "altra"].includes(cat) ? cat : "B",
    budget_max_cents: cents,
    city_interest: str(fd, "city_interest", 80),
    preferences: { fuel: fuel && fuel in FUEL_LABELS ? fuel : null, transmission: tr && tr in TRANSMISSION_LABELS ? tr : null },
  });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/dashboard/neopatentato");
  return ok("Profilo neopatentato salvato.");
}

export async function deleteDriverProfile(): Promise<FormState> {
  const user = await requireUser("/dashboard/neopatentato");
  const supabase = await createClient();
  const { error } = await supabase.from("driver_profiles").delete().eq("user_id", user.id);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/dashboard/neopatentato");
  return ok("Dati cancellati.");
}
