import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BUSINESS_COOKIE, LEAD_SOURCES, LEAD_STATUS } from "@/lib/business/context";

/** Esportazione CSV (compatibile con Excel: UTF-8 con BOM, separatore «;»). Solo dati dell'azienda autorizzata. */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.redirect(new URL("/accedi?next=/business/report", req.url));
  const { data: list } = await supabase.rpc("my_businesses");
  const chosen = (await cookies()).get(BUSINESS_COOKIE)?.value;
  const biz = (list ?? []).find((b) => b.profile_id === chosen) ?? list?.[0];
  if (!biz || !(biz.role === "proprietario" || biz.permissions.includes("esportazioni"))) return new NextResponse("Permesso negato", { status: 403 });
  const { data: plan } = await supabase.rpc("business_plan", { profile_id: biz.profile_id });
  if (!(plan as { exports_enabled?: boolean } | null)?.exports_enabled) return new NextResponse("Esportazioni non incluse nel piano", { status: 403 });
  const sp = req.nextUrl.searchParams;
  const tipo = sp.get("tipo") ?? "richieste";
  const from = /^\d{4}-\d{2}-\d{2}$/.test(sp.get("da") ?? "") ? new Date(`${sp.get("da")}T00:00:00Z`) : new Date(Date.now() - 90 * 864e5);
  const to = /^\d{4}-\d{2}-\d{2}$/.test(sp.get("a") ?? "") ? new Date(`${sp.get("a")}T23:59:59Z`) : new Date();
  let header: string[] = []; let rows: (string | number | null)[][] = [];
  if (tipo === "richieste" || tipo === "appuntamenti" || tipo === "completati" || tipo === "preventivi") {
    const { data, error } = await supabase.rpc("business_leads", { profile_id: biz.profile_id, p_from: from.toISOString(), p_to: to.toISOString() });
    if (error) return new NextResponse(error.message, { status: 403 });
    const filtered = (data ?? []).filter((l) =>
      tipo === "appuntamenti" ? l.source === "prenotazione" || l.source === "revisione" || l.lead_status === "appuntamento_fissato"
      : tipo === "completati" ? l.lead_status === "completato" || ["completata", "completato"].includes(l.source_status)
      : tipo === "preventivi" ? l.kind === "preventivo" || ["soccorso", "trasporto", "valutazione"].includes(l.source) || l.lead_status === "preventivo_inviato" : true);
    header = ["Data", "Canale", "Tipo", "Oggetto", "Veicolo", "Cliente", "Stato richiesta", "Stato CRM"];
    rows = filtered.map((l) => [l.received_at.slice(0, 16).replace("T", " "), LEAD_SOURCES[l.source], l.kind, l.title, l.vehicle, l.customer_name, l.source_status, LEAD_STATUS[l.lead_status]?.label ?? l.lead_status]);
  } else if (tipo === "mensile" || tipo === "annunci") {
    const { data, error } = await supabase.rpc("business_stats", { profile_id: biz.profile_id, p_from: from.toISOString(), p_to: to.toISOString() });
    if (error) return new NextResponse(error.message, { status: 403 });
    const s = data as { daily: { day: string; contacts: number; views: number }[]; top_listings: { title: string; status: string; period_views: number; total_views: number; contacts: number }[] };
    if (tipo === "mensile") {
      const m = new Map<string, { c: number; v: number }>();
      for (const d of s.daily) { const k = d.day.slice(0, 7); const x = m.get(k) ?? { c: 0, v: 0 }; x.c += d.contacts; x.v += d.views; m.set(k, x); }
      header = ["Mese", "Contatti", "Visualizzazioni del profilo"]; rows = [...m.entries()].map(([k, x]) => [k, x.c, x.v]);
    } else {
      header = ["Annuncio", "Stato", "Visite nel periodo", "Visite totali", "Richieste"]; rows = s.top_listings.map((l) => [l.title, l.status, l.period_views, l.total_views, l.contacts]);
    }
  } else return new NextResponse("Tipo non valido", { status: 400 });
  const esc = (v: string | number | null) => { const t = v === null || v === undefined ? "" : String(v); return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  const csv = "﻿" + [header, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
  await supabase.rpc("business_log_export", { profile_id: biz.profile_id, kind: tipo }).then(() => undefined, () => undefined);
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="autogarage24-${tipo}-${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
}
