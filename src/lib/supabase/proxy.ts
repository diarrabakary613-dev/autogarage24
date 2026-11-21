import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { Database } from "./database.types";

/** Percorsi che richiedono un utente autenticato (controllo rapido). */
const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/business", "/aggiorna-password"];

/**
 * Rinnova la sessione Supabase a ogni richiesta e scrive i cookie aggiornati.
 * Esegue anche un controllo "ottimistico" sui percorsi protetti.
 * NB: questo NON sostituisce i controlli lato server nelle pagine e nelle
 * azioni (src/lib/auth/session.ts) né le policy RLS del database.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) return response;

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // Non inserire codice tra createServerClient e getClaims: serve a rinnovare il token.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);

  const path = request.nextUrl.pathname;
  if (!isAuthenticated && PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/accedi";
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return response;
}
