import Link from "next/link";
import { PERIODS } from "@/lib/business/context";

/** Selettore del periodo: preset e intervallo personalizzato (GET). */
export function PeriodFilter({ base, current, da, a, maxDays }: { base: string; current: string; da: string; a: string; maxDays: number }) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-2 print:hidden">
      {Object.entries(PERIODS).map(([k, p]) => (
        <Link key={k} href={`${base}?periodo=${k}`} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${current === k ? "border-ink bg-ink text-white" : "border-line-strong bg-white"}`}>{p.label}</Link>
      ))}
      <form action={base} className="flex flex-wrap items-end gap-2">
        <label className="text-xs">Dal<input type="date" name="da" defaultValue={da} className="ml-1 rounded-md border border-line-strong px-2 py-1 text-sm" /></label>
        <label className="text-xs">Al<input type="date" name="a" defaultValue={a} className="ml-1 rounded-md border border-line-strong px-2 py-1 text-sm" /></label>
        <button className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${current === "personalizzato" ? "border-ink bg-ink text-white" : "border-line-strong bg-white"}`}>Applica</button>
      </form>
      <p className="w-full text-xs text-muted">Il tuo piano include lo storico degli ultimi {maxDays} giorni.</p>
    </div>
  );
}

export type Stats = {
  from: string; to: string; max_days: number; profile_views: number; listing_views: number; views_tracked_since: string | null; contacts: number; quote_requests: number;
  bookings: number; bookings_confirmed: number; appointments: number; pending: number; reviews: number; reviews_avg: number | null; completed: number;
  conv_contact_appt: number | null; conv_appt_done: number | null; by_source: Record<string, number>; by_kind: Record<string, number>; by_city: Record<string, number>;
  daily: { day: string; contacts: number; views: number }[]; top_listings: { id: string; title: string; slug: string; status: string; total_views: number; period_views: number; contacts: number }[];
  reviews_monthly: { month: string; count: number; avg: number }[];
};

export const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);

/** Barre orizzontali accessibili (valori reali, nessun dato inventato). */
export function Bars({ data, labels = {} }: { data: Record<string, number>; labels?: Record<string, string> }) {
  const entries = Object.entries(data).sort((x, y) => y[1] - x[1]);
  if (!entries.length) return <p className="text-sm text-muted">Nessun dato nel periodo.</p>;
  const max = Math.max(...entries.map((e) => e[1]), 1);
  return (
    <ul className="flex flex-col gap-1.5">{entries.map(([k, v]) => (
      <li key={k} className="grid grid-cols-[minmax(0,10rem)_1fr_2.5rem] items-center gap-2 text-sm">
        <span className="truncate">{labels[k] ?? k.replace(/_/g, " ")}</span>
        <span className="h-3 rounded-full bg-mist" aria-hidden><span className="block h-3 rounded-full bg-orange" style={{ width: `${(v / max) * 100}%` }} /></span>
        <span className="text-right tabular-nums">{v}</span>
      </li>))}</ul>
  );
}

/** Andamento giornaliero: colonne per contatti e visualizzazioni del profilo. */
export function Daily({ data }: { data: Stats["daily"] }) {
  if (!data.length) return <p className="text-sm text-muted">Nessun dato nel periodo.</p>;
  const max = Math.max(...data.map((d) => Math.max(d.contacts, d.views)), 1);
  return (
    <figure>
      <div className="flex h-36 items-end gap-px" role="img" aria-label={`Andamento giornaliero: ${data.reduce((a, d) => a + d.contacts, 0)} contatti e ${data.reduce((a, d) => a + d.views, 0)} visualizzazioni del profilo`}>
        {data.map((d) => (
          <div key={d.day} className="flex h-full flex-1 items-end gap-px" title={`${d.day}: ${d.contacts} contatti, ${d.views} visualizzazioni`}>
            <span className="flex-1 rounded-t bg-line-strong" style={{ height: `${(d.views / max) * 100}%` }} />
            <span className="flex-1 rounded-t bg-orange" style={{ height: `${(d.contacts / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <figcaption className="mt-1 flex gap-4 text-xs text-muted"><span><span className="mr-1 inline-block size-2 rounded-full bg-orange" />Contatti</span><span><span className="mr-1 inline-block size-2 rounded-full bg-line-strong" />Visualizzazioni del profilo</span><span>{data[0].day} → {data[data.length - 1].day}</span></figcaption>
    </figure>
  );
}
