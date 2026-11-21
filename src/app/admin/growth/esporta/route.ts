import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/** Esportazione CSV degli indicatori aggregati (nessun dato personale). */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.permissions.includes("growth.manage")) return new NextResponse("Non trovato", { status: 404 });
  const sp = req.nextUrl.searchParams;
  const days = [7, 30, 90, 365].includes(Number(sp.get("giorni"))) ? Number(sp.get("giorni")) : 30;
  const clean = (v: string | null) => (v && /^[a-z0-9_.-]{1,80}$/.test(v) ? v : undefined);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_growth_center", { days, p_source: clean(sp.get("sorgente")), p_campaign: clean(sp.get("campagna")), p_role: clean(sp.get("ruolo")) });
  if (error || !data) return new NextResponse("Errore", { status: 500 });
  const g = data as { per_giorno: { giorno: string; n: number }[]; per_sorgente: { sorgente: string; n: number; attivati: number }[]; per_campagna: { campagna: string; n: number; attivati: number }[] };
  const esc = (v: string | number) => { const s = String(v); return /^[=+\-@]/.test(s) ? `'${s}` : s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s; };
  const lines = ["sezione,chiave,registrazioni,attivati",
    ...g.per_giorno.map((d) => ["giorno", d.giorno, d.n, ""].map(esc).join(",")),
    ...g.per_sorgente.map((d) => ["sorgente", d.sorgente, d.n, d.attivati].map(esc).join(",")),
    ...g.per_campagna.map((d) => ["campagna", d.campagna, d.n, d.attivati].map(esc).join(","))];
  return new NextResponse("﻿" + lines.join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="growth-${days}g.csv"`, "Cache-Control": "no-store" } });
}
