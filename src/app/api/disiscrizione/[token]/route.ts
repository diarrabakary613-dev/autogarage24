import { NextResponse, connection, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TOKEN = /^[A-Za-z0-9_-]{32,64}$/;

/**
 * Disiscrizione con un clic (RFC 8058) per le email promozionali.
 * Gmail, Outlook e gli altri programmi di posta inviano una richiesta POST a questo
 * indirizzo quando l'utente preme «Annulla iscrizione»: nessuna pagina di conferma.
 * La risposta è sempre la stessa, per non rivelare se il codice esiste.
 */
export async function POST(_request: NextRequest, ctx: RouteContext<"/api/disiscrizione/[token]">) {
  await connection();
  const { token } = await ctx.params;
  if (TOKEN.test(token)) {
    const supabase = await createClient();
    await supabase.rpc("marketing_unsubscribe", { p_token: token });
  }
  return new NextResponse(null, { status: 200, headers: { "Cache-Control": "no-store" } });
}

/** Se qualcuno apre l'indirizzo nel browser, va alla pagina di disiscrizione con conferma. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/disiscrizione/[token]">) {
  const { token } = await ctx.params;
  const target = TOKEN.test(token) ? `/disiscriviti/${token}` : "/";
  return NextResponse.redirect(new URL(target, request.nextUrl.origin));
}
