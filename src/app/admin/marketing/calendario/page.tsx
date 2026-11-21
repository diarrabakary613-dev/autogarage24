import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { AdminPage } from "@/components/admin/simple";
import { MarketingTabs, StatusBadge, KINDS } from "@/components/marketing-admin/shared";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CHANNELS } from "@/lib/marketing/brief";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Calendario editoriale", robots: { index: false } };
const MONTHS = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
const DOW = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const CH_COLOR: Record<string, string> = { instagram: "border-l-[#c13584]", facebook: "border-l-[#1877f2]", tiktok: "border-l-ink", youtube: "border-l-[#ff0000]", linkedin: "border-l-[#0a66c2]" };
const romeDay = (iso: string) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date(iso));

export default function CalendarPage(props: PageProps<"/admin/marketing/calendario">) {
  return <AdminPage title="Calendario editoriale" description="Pianificazione dei contenuti per Instagram, Facebook, TikTok, YouTube e LinkedIn. La pubblicazione sui social è manuale: nessuna integrazione automatica è attiva."><MarketingTabs current="calendario" /><Content searchParams={props.searchParams} /></AdminPage>;
}

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("marketing.manage", "/admin/marketing/calendario");
  const sp = await searchParams;
  const view = sp.vista === "lista" ? "lista" : "mese";
  const ch = typeof sp.canale === "string" && sp.canale in CHANNELS ? sp.canale : "";
  const today = romeDay(new Date().toISOString());
  const m = typeof sp.mese === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.mese) ? sp.mese : today.slice(0, 7);
  const [y, mo] = m.split("-").map(Number);
  const first = new Date(Date.UTC(y, mo - 1, 1));
  const days = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const prev = new Date(Date.UTC(y, mo - 2, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(y, mo, 1)).toISOString().slice(0, 7);
  const supabase = await createClient();
  let q = supabase.from("marketing_items").select("id, title, kind, channel, format, status, planned_at").not("planned_at", "is", null)
    .gte("planned_at", new Date(Date.UTC(y, mo - 1, 1) - 864e5).toISOString()).lt("planned_at", new Date(Date.UTC(y, mo, 1) + 864e5).toISOString()).order("planned_at");
  if (ch) q = q.eq("channel", ch);
  const { data } = await q;
  const items = (data ?? []).filter((i) => romeDay(i.planned_at!).startsWith(m));
  const byDay = new Map<string, typeof items>();
  for (const i of items) { const d = romeDay(i.planned_at!); byDay.set(d, [...(byDay.get(d) ?? []), i]); }
  const lead = (first.getUTCDay() + 6) % 7;
  const qs = (o: Record<string, string>) => new URLSearchParams({ mese: m, vista: view, ...(ch ? { canale: ch } : {}), ...o }).toString();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link className="rounded-md border border-line px-3 py-1.5 text-sm" href={`?${qs({ mese: prev })}`} aria-label="Mese precedente">←</Link>
          <h2 className="min-w-40 text-center text-lg font-bold">{MONTHS[mo - 1]} {y}</h2>
          <Link className="rounded-md border border-line px-3 py-1.5 text-sm" href={`?${qs({ mese: next })}`} aria-label="Mese successivo">→</Link>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href={`?${qs({ vista: "mese" })}`} className={`rounded-full border px-3 py-1 ${view === "mese" ? "border-ink bg-ink text-white" : "border-line"}`}>Calendario</Link>
          <Link href={`?${qs({ vista: "lista" })}`} className={`rounded-full border px-3 py-1 ${view === "lista" ? "border-ink bg-ink text-white" : "border-line"}`}>Lista</Link>
          <form method="get" className="flex gap-1"><input type="hidden" name="mese" value={m} /><input type="hidden" name="vista" value={view} />
            <select name="canale" defaultValue={ch} aria-label="Canale" className="rounded-md border border-line px-2"><option value="">Tutti i canali</option>{Object.entries(CHANNELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            <button className="rounded-md bg-ink px-3 text-white">Filtra</button></form>
          <ButtonLink size="sm" href={`/admin/marketing/contenuti?nuovo=1&data=${m}-01`}>Nuovo contenuto</ButtonLink>
        </div>
      </div>
      {view === "lista" ? (
        !items.length ? <EmptyState title="Nessun contenuto pianificato" description="Aggiungi una data prevista ai contenuti." /> : (
          <ul className="flex flex-col gap-2">{items.map((i) => (
            <li key={i.id}><Link href={`/admin/marketing/contenuti?id=${i.id}`} className={`flex flex-wrap items-center gap-3 rounded-xl border border-line border-l-4 bg-white p-3 hover:border-ink ${CH_COLOR[i.channel ?? ""] ?? "border-l-orange"}`}>
              <span className="w-36 text-sm tabular-nums text-muted">{formatDateTime(i.planned_at)}</span><span className="font-semibold">{i.title}</span>
              <span className="text-sm text-muted">{i.channel ? CHANNELS[i.channel as keyof typeof CHANNELS] : "—"} · {KINDS[i.kind as keyof typeof KINDS]}</span><StatusBadge status={i.status} />
            </Link></li>
          ))}</ul>
        )
      ) : (
        <Card className="overflow-x-auto p-2">
          <div className="grid min-w-[720px] grid-cols-7 gap-1">
            {DOW.map((d) => <div key={d} className="p-2 text-center text-xs font-bold text-muted">{d}</div>)}
            {Array.from({ length: lead }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: days }).map((_, i) => {
              const d = `${m}-${String(i + 1).padStart(2, "0")}`;
              const list = byDay.get(d) ?? [];
              return (
                <div key={d} className={`flex min-h-28 flex-col gap-1 rounded-lg border p-1.5 ${d === today ? "border-orange" : "border-line"}`}>
                  <Link href={`/admin/marketing/contenuti?nuovo=1&data=${d}`} className="text-xs font-semibold text-muted hover:text-ink" aria-label={`Nuovo contenuto il ${d}`}>{i + 1}</Link>
                  {list.map((it) => <Link key={it.id} href={`/admin/marketing/contenuti?id=${it.id}`} className={`truncate rounded border-l-4 bg-mist px-1.5 py-1 text-xs hover:bg-orange-50 ${CH_COLOR[it.channel ?? ""] ?? "border-l-orange"}`} title={it.title}>{it.title}</Link>)}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
