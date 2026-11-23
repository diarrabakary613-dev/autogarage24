import Link from "next/link";
import { Suspense } from "react";
import { Store, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { Pagination } from "@/components/ui/misc";
import { MapView } from "@/components/maps/map-view";
import { LocateButton } from "@/components/maps/locate-button";
import { BRANDS } from "@/config/brands";
import { getCategories, parseProFilters, PRO_PAGE, PRO_SORTS, proHref, searchProfessionals, type ProType } from "@/lib/data/professionals";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { WORK_MODE_LABELS } from "@/lib/labels";
import { ProCard, type ProCardData } from "./pro-card";
import { ProQuickSearch } from "./quick-search";
import { geocodeItaly } from "@/lib/geo/geocode";
import type { ProFilters } from "@/lib/data/professionals";

type Params = Record<string, string | string[] | undefined>;

/** Ricerca professionisti con filtri combinabili (URL condivisibili), mappa e paginazione. */
/**
 * La barra unica («cerca») accetta il nome di un'attività oppure un luogo.
 * Prima si cerca per nome; se nessuna attività ha quel nome, il testo viene
 * localizzato (indirizzo, città o CAP) e si mostrano le attività più vicine.
 */
async function resolveSearch(type: Exclude<ProType, "venditore_ricambi">, f: ProFilters) {
  if (!f.cerca || f.lat !== undefined) return { f, result: await searchProfessionals(type, f), mode: null as null | "nome" | "luogo", place: null as string | null, geoFail: false };
  const text = f.cerca;
  if (!/^\d{5}$/.test(text)) {
    const byName = { ...f, q: text };
    const result = await searchProfessionals(type, byName);
    if (result.total > 0 || result.error) return { f: byName, result, mode: "nome" as const, place: null, geoFail: false };
  }
  const g = await geocodeItaly(/^\d{5}$/.test(text) ? `${text} Italia` : text);
  if (g) {
    const near: ProFilters = { ...f, lat: g.lat, lng: g.lng, raggio: f.raggio ?? 15, ordina: "distanza" };
    return { f: near, result: await searchProfessionals(type, near), mode: "luogo" as const, place: g.label, geoFail: false };
  }
  const fallback = /^\d{5}$/.test(text) ? { ...f, cap: text } : { ...f, citta: text };
  return { f: fallback, result: await searchProfessionals(type, fallback), mode: null, place: null, geoFail: true };
}

export async function ProSearch({ type, base, params, register }: { type: Exclude<ProType, "venditore_ricambi">; base: string; params: Params; register: string }) {
  const requested = parseProFilters(params);
  const [{ f, result: { items, total, error }, mode, place, geoFail }, categories, user] = await Promise.all([resolveSearch(type, requested), getCategories(type), getCurrentUser()]);
  let favs: Set<string> | null = null;
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase.from("favorites").select("professional_profile_id").not("professional_profile_id", "is", null);
    favs = new Set((data ?? []).map((d) => d.professional_profile_id as string));
  }
  const names = new Map(categories.map((c) => [c.slug, c.name]));
  const fromBar = Boolean(requested.cerca);
  const chips = ([
    ["cerca", requested.cerca && (mode === "luogo" ? `Vicino a «${requested.cerca}»` : `“${requested.cerca}”`)],
    ["q", !fromBar && f.q && `“${f.q}”`], ["citta", f.citta && `Città: ${f.citta}`], ["cap", f.cap && `CAP ${f.cap}`], ["regione", f.regione],
    ["categoria", f.categoria && (names.get(f.categoria) ?? f.categoria)], ["marca", f.marca && `Marca: ${f.marca}`],
    ["modalita", f.modalita && WORK_MODE_LABELS[f.modalita]], ["verificati", f.verificati && "Solo verificati"],
    ["raggio", f.lat !== undefined && !fromBar && `Entro ${f.raggio} km`],
  ] as [string, string | false | undefined][]).filter(([, l]) => l) as [string, string][];
  const points = (items as ProCardData[]).filter((p) => (p as unknown as { latitude: number | null }).latitude !== null).map((p) => {
    const x = p as unknown as { latitude: number; longitude: number };
    return { id: p.id, lat: x.latitude, lng: x.longitude, label: p.display_name, href: `${base}/${p.slug}`, approximate: type === "meccanico" && p.work_modes?.includes("mobile") };
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[290px_1fr] lg:gap-8">
      <ProQuickSearch base={base as "/garages" | "/meccanici"} kind={type} defaultValue={requested.cerca ?? ""} className="lg:col-span-2" />
      <form action={base} method="get" className="order-last flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 shadow-card lg:order-none" role="search" aria-label="Filtri avanzati">
        <p className="text-sm font-bold">Filtri avanzati</p>
        {requested.cerca && <input type="hidden" name="cerca" value={requested.cerca} />}
        {!fromBar && <Field id="pf-q" label={type === "officina" ? "Nome dell'officina" : "Nome del professionista"}><Input id="pf-q" name="q" defaultValue={f.q} /></Field>}
        <div className="grid grid-cols-[1fr_100px] gap-3">
          <Field id="pf-c" label="Città"><Input id="pf-c" name="citta" defaultValue={f.citta} placeholder="Milano" /></Field>
          <Field id="pf-cap" label="CAP"><Input id="pf-cap" name="cap" inputMode="numeric" defaultValue={f.cap} /></Field>
        </div>
        <Field id="pf-r" label="Regione"><Input id="pf-r" name="regione" defaultValue={f.regione} placeholder="Lombardia" /></Field>
        <Field id="pf-cat" label={type === "officina" ? "Tipologia o servizio" : "Specializzazione"}>
          <Select id="pf-cat" name="categoria" defaultValue={f.categoria ?? ""}><option value="">Tutte</option>{categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</Select>
        </Field>
        <Field id="pf-b" label="Marca trattata"><Select id="pf-b" name="marca" defaultValue={f.marca ?? ""}><option value="">Tutte</option>{BRANDS.map((b) => <option key={b.slug} value={b.name}>{b.name}</option>)}</Select></Field>
        {type === "meccanico" && (
          <Field id="pf-m" label="Modalità di intervento"><Select id="pf-m" name="modalita" defaultValue={f.modalita ?? ""}><option value="">Tutte</option>{Object.entries(WORK_MODE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
        )}
        <Checkbox id="pf-v" name="verificati" value="1" defaultChecked={f.verificati} label="Solo attività verificate da AutoGarage24" />
        {f.lat !== undefined && (
          <>
            {!fromBar && <><input type="hidden" name="lat" value={f.lat} /><input type="hidden" name="lng" value={f.lng} /></>}
            <Field id="pf-rad" label="Distanza massima"><Select id="pf-rad" name="raggio" defaultValue={String(f.raggio)}>{[5, 10, 15, 25, 50, 100].map((k) => <option key={k} value={k}>{k} km</option>)}</Select></Field>
          </>
        )}
        <Field id="pf-o" label="Ordina per"><Select id="pf-o" name="ordina" defaultValue={f.ordina}>{Object.entries(PRO_SORTS).filter(([k]) => k !== "distanza" || f.lat !== undefined).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
        <Suspense fallback={null}><LocateButton /></Suspense>
        <Button type="submit" className="w-full">Cerca</Button>
      </form>

      <section aria-labelledby="pro-res" className="flex min-w-0 flex-col gap-5">
        <h2 id="pro-res" className="text-lg font-bold" aria-live="polite">{error ? "Risultati non disponibili" : `${total} ${total === 1 ? "risultato" : "risultati"}`}</h2>
        {chips.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Filtri attivi">
            {chips.map(([k, l]) => (
              <li key={k}><Link href={proHref(base, requested, k === "raggio" ? { lat: undefined, lng: undefined, raggio: undefined, ordina: "nome", pagina: 1 } : { [k]: undefined, pagina: 1 })} className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-white px-3 py-1.5 text-sm">{l} <X className="size-3.5" aria-label="rimuovi" /></Link></li>
            ))}
            <li><Link href={base} className="px-2 py-1.5 text-sm font-semibold text-orange-700">Azzera filtri</Link></li>
          </ul>
        )}
        {mode === "luogo" && place && <p className="text-sm text-graphite">{type === "officina" ? "Officine" : "Professionisti"} entro {f.raggio} km da <strong>{place}</strong>, dalla più vicina.</p>}
        {mode === "nome" && <p className="text-sm text-graphite">Risultati per nome. Cercavi un luogo? Scrivi l&apos;indirizzo completo con la città, oppure usa «vicino a me».</p>}
        {geoFail && <Alert tone="warning">Non siamo riusciti a trovare «{requested.cerca}» né come nome né come indirizzo: mostriamo i risultati con quel nome di città. Prova a scrivere via, numero e città.</Alert>}
        {points.length > 0 && <MapView points={points} user={f.lat !== undefined ? { lat: f.lat, lng: f.lng! } : null} />}
        {error ? <Alert tone="error">Non è stato possibile completare la ricerca. Riprova tra poco.</Alert>
          : items.length === 0 ? (
            <EmptyState icon={<Store className="size-6" aria-hidden />} title="Nessun risultato" description={chips.length ? "Prova a modificare o rimuovere qualche filtro." : "I profili compaiono qui solo dopo la verifica del team AutoGarage24. Non mostriamo attività di esempio."} action={<Link href={register} className="font-semibold text-orange-700 hover:underline">Sei un professionista? Registrati →</Link>} />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {(items as ProCardData[]).map((p) => <li key={p.id}><ProCard p={p} base={base} categoryNames={names} favorite={favs ? favs.has(p.id) : false} /></li>)}
            </ul>
          )}
        <Pagination page={f.pagina} pageSize={PRO_PAGE} total={total} hrefFor={(n) => proHref(base, requested, { pagina: n })} />
      </section>
    </div>
  );
}
