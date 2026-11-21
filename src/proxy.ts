import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { findRedirect } from "@/lib/seo/redirects";

export async function proxy(request: NextRequest) {
  if (request.method === "GET" || request.method === "HEAD") {
    const r = await findRedirect(request.nextUrl.pathname);
    if (r) {
      const target = r.to.startsWith("https://") ? new URL(r.to) : new URL(r.to, request.nextUrl.origin);
      if (!r.to.includes("?")) target.search = request.nextUrl.search;
      return NextResponse.redirect(target, r.code);
    }
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    // Esclude file statici e immagini per non rallentare il sito.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|mp4|webm|woff2?)$).*)",
  ],
};
