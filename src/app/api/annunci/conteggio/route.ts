import { NextResponse, type NextRequest } from "next/server";
import { connection } from "next/server";
import { countListings } from "@/lib/data/listings";
import { parseListingFilters } from "@/lib/marketplace/filters";

/**
 * Numero di annunci pubblicati che rispettano i filtri passati nell'URL
 * (stessi parametri della pagina di ricerca). Usato dal pulsante «Mostra N annunci».
 * Solo dati pubblici: nessuna informazione sull'utente.
 */
export async function GET(request: NextRequest) {
  await connection();
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const total = await countListings(parseListingFilters(params));
  return NextResponse.json(
    { total },
    { status: total === null ? 503 : 200, headers: { "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60" } },
  );
}
