import { NextResponse, type NextRequest } from "next/server";

/** Link di invito: porta alla registrazione con il codice (nessun cookie, nessun tracciamento). */
export async function GET(req: NextRequest, ctx: RouteContext<"/invita/[code]">) {
  const { code } = await ctx.params;
  const c = decodeURIComponent(code).toUpperCase();
  const url = new URL("/registrati", req.nextUrl.origin);
  if (/^[A-Z0-9]{6,12}$/.test(c)) url.searchParams.set("invito", c);
  const res = NextResponse.redirect(url, 307);
  res.headers.set("X-Robots-Tag", "noindex");
  return res;
}
