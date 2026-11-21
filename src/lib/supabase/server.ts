import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Client Supabase per Server Components, Server Actions e Route Handlers.
 * Agisce con l'identità dell'utente collegato (cookie di sessione):
 * le policy RLS del database restano sempre attive.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chiamato da un Server Component: i cookie non sono scrivibili qui.
          // Il rinnovo della sessione è gestito da src/proxy.ts.
        }
      },
    },
  });
}
