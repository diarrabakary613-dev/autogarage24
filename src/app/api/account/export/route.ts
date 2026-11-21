import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

/** Esportazione dei dati personali (GDPR art. 15/20) in formato JSON leggibile. Solo per l'utente collegato. */
export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Servizio non configurato" }, { status: 503 });
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return NextResponse.json({ error: "Accesso richiesto" }, { status: 401 });
  const { data, error } = await supabase.rpc("export_my_data");
  if (error) return NextResponse.json({ error: "Esportazione non riuscita" }, { status: 500 });
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="autogarage24-dati-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
