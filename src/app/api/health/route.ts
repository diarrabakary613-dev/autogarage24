import { NextResponse } from "next/server";
import { connection } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * Controllo di salute per il monitoraggio (uptime). Non espone dati personali né dettagli tecnici:
 * indica solo se l'applicazione risponde e se il database è raggiungibile.
 */
export async function GET() {
  await connection();
  const started = Date.now();
  const supabase = createPublicClient();
  let database: "ok" | "non_configurato" | "errore" = "non_configurato";
  if (supabase) {
    const { error } = await supabase.rpc("health_check");
    database = error ? "errore" : "ok";
  }
  const ok = database === "ok";
  return NextResponse.json({ status: ok ? "ok" : "degradato", database, ms: Date.now() - started, time: new Date().toISOString() }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
