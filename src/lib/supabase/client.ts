"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Client Supabase per i componenti eseguiti nel browser.
 * Usa SOLO la chiave pubblica: i permessi sono applicati dalle policy RLS.
 */
export function createClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createBrowserClient<Database>(url, publishableKey);
}
