"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { Bell, Car, ChevronDown, Gauge, MapPin, SlidersHorizontal, Wallet, X } from "lucide-react";
import { BRANDS } from "@/config/brands";
import { NEO_FILTERS, type NeoFilter } from "@/lib/marketplace/filters";
import {
  forgetLastSearch, isSaved, lastSearchSnapshot, normalizeQuery, parseLast, parseSaved, rememberLastSearch,
  saveSearch, savedSearchesSnapshot, serverSnapshot, subscribe,
} from "@/lib/marketplace/saved-searches";
import { cn } from "@/lib/utils";

const BASE = "/auto-per-neopatentati";
const NEO_CHIPS: { value: NeoFilter; label: string }[] = [
  { value: "compatibili_da_verificare", label: "Compatibili e da verificare" },
  { value: "compatibili", label: "Solo compatibili" },
  { value: "da_verificare", label: "Da verificare" },
];
const BUDGETS = [3000, 5000, 8000, 10000, 12000, 15000, 20000];
const euro = (n: number) => `${new Intl.NumberFormat("it-IT").format(n)} €`;

function useCount(query: string) {
  const [state, setState] = useState<{ query: string; total: number | null } | null>(null);
  useEffect(() => {
    const ctrl = new AbortController();
    const t = window.setTimeout(() => {
      fetch(`/api/annunci/conteggio?${query}`, { signal: ctrl.signal })
        .then((r) => r.json() as Promise<{ total: number | null }>)
        .then((d) => setState({ query, total: typeof d.total === "number" ? d.total : null }))
        .catch(() => { if (!ctrl.signal.aborted) setState({ query, total: null }); });
    }, 250);
    return () => { ctrl.abort(); window.clearTimeout(t); };
  }, [query]);
  return state?.query === query ? state.total : undefined;
}

/** Ricerca rapida in stile app: compatibilità, marca e modello, luogo, budget e contatore reale degli annunci. */
export function NeoQuickSearch() {
  const router = useRouter();
  const sp = useSearchParams();
  const [neo, setNeo] = useState<NeoFilter>(() => {
    const v = sp.get("neo");
    return v && v in NEO_FILTERS && v !== "non_compatibili" ? (v as NeoFilter) : "compatibili_da_verificare";
  });
  const [marca, setMarca] = useState(sp.get("marca") ?? "");
  const [modello, setModello] = useState(sp.get("modello") ?? "");
  const [luogo, setLuogo] = useState(sp.get("citta") ?? sp.get("cap") ?? "");
  const [budget, setBudget] = useState(sp.get("prezzo_max") ?? "");

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set("neo", neo);
    if (marca) p.set("marca", marca);
    if (modello.trim()) p.set("modello", modello.trim());
    const l = luogo.trim();
    if (/^\d{5}$/.test(l)) p.set("cap", l);
    else if (l) p.set("citta", l);
    if (budget) p.set("prezzo_max", budget);
    return normalizeQuery(p);
  }, [neo, marca, modello, luogo, budget]);
  const total = useCount(query);

  function submit(e: FormEvent) {
    e.preventDefault();
    rememberLastSearch(query);
    router.push(`${BASE}?${query}#ricerca`);
  }

  const buttonLabel = total === undefined ? "Mostra annunci" : total === null ? "Mostra annunci" : total === 1 ? "Mostra 1 annuncio" : `Mostra ${new Intl.NumberFormat("it-IT").format(total)} annunci`;
  const field = "flex h-14 w-full items-center gap-3 rounded-xl border-2 border-white/25 bg-white/[0.03] px-4 text-white transition focus-within:border-orange hover:border-white/50";

  return (
    <form onSubmit={submit} action={BASE} method="get" role="search" aria-label="Cerca la tua prima auto" className="flex flex-col gap-4">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="radiogroup" aria-label="Compatibilità con le regole per neopatentati">
        {NEO_CHIPS.map((c) => (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={neo === c.value}
            onClick={() => setNeo(c.value)}
            className={cn(
              "shrink-0 rounded-full border-2 px-5 py-2.5 text-sm font-semibold transition",
              neo === c.value ? "border-white bg-white text-ink" : "border-white/25 text-white hover:border-white/60",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      <input type="hidden" name="neo" value={neo} />

      <div className={field}>
        <Car className="size-5 shrink-0 text-white/60" aria-hidden />
        <label htmlFor="q-marca" className="sr-only">Marca</label>
        <div className="relative min-w-0 flex-1">
          <select id="q-marca" name="marca" value={marca} onChange={(e) => { setMarca(e.target.value); if (!e.target.value) setModello(""); }} className="h-12 w-full cursor-pointer appearance-none bg-transparent pr-8 text-base outline-none [&>option]:text-ink">
            <option value="">Marca &amp; Modello</option>
            {BRANDS.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-0 size-5 -translate-y-1/2 text-white/70" aria-hidden />
        </div>
        {marca && (
          <>
            <label htmlFor="q-modello" className="sr-only">Modello</label>
            <input id="q-modello" name="modello" value={modello} onChange={(e) => setModello(e.target.value)} placeholder="Modello (es. Panda)" maxLength={40} className="h-12 w-2/5 min-w-0 border-l border-white/20 bg-transparent pl-3 text-base outline-none placeholder:text-white/45" />
          </>
        )}
      </div>

      <div className={field}>
        <MapPin className="size-5 shrink-0 text-white/60" aria-hidden />
        <label htmlFor="q-luogo" className="sr-only">Città o CAP</label>
        <input id="q-luogo" name={/^\d{5}$/.test(luogo.trim()) ? "cap" : "citta"} value={luogo} onChange={(e) => setLuogo(e.target.value)} placeholder="Città o CAP" maxLength={60} autoComplete="address-level2" className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-white/70" />
        {luogo && <button type="button" onClick={() => setLuogo("")} className="rounded-full p-1 text-white/60 hover:text-white" aria-label="Cancella città o CAP"><X className="size-4" aria-hidden /></button>}
      </div>

      <div className={field}>
        <Wallet className="size-5 shrink-0 text-white/60" aria-hidden />
        <label htmlFor="q-budget" className="sr-only">Budget massimo</label>
        <div className="relative min-w-0 flex-1">
          <select id="q-budget" name="prezzo_max" value={budget} onChange={(e) => setBudget(e.target.value)} className="h-12 w-full cursor-pointer appearance-none bg-transparent pr-8 text-base outline-none [&>option]:text-ink">
            <option value="">Budget: qualsiasi prezzo</option>
            {BUDGETS.map((b) => <option key={b} value={b}>Fino a {euro(b)}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-0 size-5 -translate-y-1/2 text-white/70" aria-hidden />
        </div>
      </div>

      <button type="submit" className="flex h-14 w-full items-center justify-center rounded-full bg-orange px-6 text-lg font-bold text-ink shadow-lift transition hover:bg-orange-600" aria-live="polite" data-track="cta" data-track-label="Mostra annunci neopatentati">
        {buttonLabel}
      </button>
      <a href="#ricerca" className="flex items-center justify-center gap-2 text-base font-semibold text-orange hover:underline">
        <SlidersHorizontal className="size-4" aria-hidden /> Filtri avanzati
      </a>
    </form>
  );
}

/** Scheda «Riprendi dove avevi lasciato!»: ultima ricerca fatta su questo dispositivo, con il numero attuale di annunci. */
export function LastSearchCard() {
  const last = parseLast(useSyncExternalStore(subscribe, lastSearchSnapshot, serverSnapshot));
  const saved = parseSaved(useSyncExternalStore(subscribe, savedSearchesSnapshot, serverSnapshot));
  if (!last) return null;
  return <LastSearchBody query={last.query} label={last.label} saved={isSaved(last.query, saved)} />;
}

function LastSearchBody({ query, label, saved }: { query: string; label: string; saved: boolean }) {
  const total = useCount(query);
  return (
    <section aria-labelledby="ultima-ricerca" className="flex flex-col gap-3">
      <h2 id="ultima-ricerca" className="text-2xl font-extrabold text-white">Riprendi dove avevi lasciato!</h2>
      <div className="relative flex flex-col gap-4 rounded-3xl bg-white/[0.07] p-5 sm:p-6">
        <button type="button" onClick={forgetLastSearch} className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Rimuovi l'ultima ricerca">
          <X className="size-5" aria-hidden />
        </button>
        <p className="pr-12 text-lg font-bold text-white">La tua ultima ricerca:</p>
        {typeof total === "number" && (
          <span className="w-fit rounded-full border border-white/20 bg-ink px-4 py-1.5 text-sm font-semibold text-white">
            {total === 1 ? "1 annuncio disponibile" : `${new Intl.NumberFormat("it-IT").format(total)} annunci disponibili`}
          </span>
        )}
        <Link href={`${BASE}?${query}#ricerca`} className="text-white/80 underline-offset-4 hover:text-white hover:underline">{label}</Link>
        <button
          type="button"
          onClick={() => saveSearch(query)}
          disabled={saved}
          className="flex h-14 w-full items-center justify-center rounded-full bg-white px-6 text-lg font-bold text-ink transition hover:bg-white/90 disabled:cursor-default disabled:bg-white/15 disabled:text-white"
        >
          {saved ? "Ricerca salvata ✓" : "Salva ricerca"}
        </button>
      </div>
    </section>
  );
}

/** Collegamenti rapidi: valutazione dell'auto e garage digitale. */
export function NeoShortcuts() {
  const cards = [
    { href: "/valuta-la-tua-auto", title: "Scopri il valore della tua auto", text: "Stima gratuita e richiesta di valutazione ai professionisti.", Icon: Gauge, badge: null },
    { href: "/dashboard/garage", title: "Il mio Garage", text: "La tua auto, le scadenze e la manutenzione in un unico posto.", Icon: Car, badge: "Novità" },
    { href: "/dashboard/notifiche", title: "Notifiche", text: "Risposte dei venditori, appuntamenti e promemoria.", Icon: Bell, badge: null },
  ];
  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {cards.map(({ href, title, text, Icon, badge }) => (
        <li key={href}>
          <Link href={href} className="flex h-full flex-col gap-2 rounded-3xl bg-white/[0.07] p-5 text-white transition hover:bg-white/[0.12]">
            <span className="flex items-center gap-2">
              <Icon className="size-5 text-orange" aria-hidden />
              <span className="text-lg font-bold">{title}</span>
              {badge && <span className="rounded-full bg-orange/25 px-2.5 py-0.5 text-xs font-bold text-orange">{badge}</span>}
            </span>
            <span className="text-sm text-white/70">{text}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
