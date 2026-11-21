import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Client per i dati PUBBLICI (annunci pubblicati, profili approvati…), senza
 * cookie di sessione: agisce come visitatore anonimo, quindi le policy RLS
 * restituiscono solo contenuti pubblici. Restituisce null se Supabase non è configurato.
 */
export function createPublicClient() {
  if (!isSupabaseConfigured()) return null;
  const { url, publishableKey } = getSupabaseEnv();
  return createSupabaseClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
