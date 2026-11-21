/**
 * Ultima ricerca e ricerche salvate delle auto per neopatentati.
 *
 * Restano sul dispositivo dell'utente (localStorage): nessun dato inviato al
 * server e nessun account richiesto. Se il browser non consente la memoria
 * locale (navigazione privata, blocchi), le funzioni non fanno nulla.
 */
import { findBrand } from "@/config/brands";
import { NEO_FILTERS, type NeoFilter } from "@/lib/marketplace/filters";

export type SavedSearch = { id: string; query: string; label: string; savedAt: string };

const LAST_KEY = "ag24:neo:ultima-ricerca";
const SAVED_KEY = "ag24:neo:ricerche-salvate";
const MAX_SAVED = 20;
const EVENT = "ag24:ricerche";

/** Parametri ammessi nella ricerca rapida (gli altri filtri restano nella ricerca avanzata). */
export const QUICK_KEYS = ["neo", "marca", "modello", "citta", "cap", "prezzo_max"] as const;

function read(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
    window.dispatchEvent(new Event(EVENT));
  } catch { /* memoria locale non disponibile */ }
}

export function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => { window.removeEventListener(EVENT, onChange); window.removeEventListener("storage", onChange); };
}
export const lastSearchSnapshot = () => read(LAST_KEY);
export const savedSearchesSnapshot = () => read(SAVED_KEY);
export const serverSnapshot = () => null;

export function parseLast(raw: string | null): SavedSearch | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as SavedSearch;
    return typeof v?.query === "string" && typeof v?.label === "string" ? v : null;
  } catch { return null; }
}
export function parseSaved(raw: string | null): SavedSearch[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as SavedSearch[];
    return Array.isArray(v) ? v.filter((s) => typeof s?.query === "string" && typeof s?.label === "string").slice(0, MAX_SAVED) : [];
  } catch { return []; }
}

/** Descrizione leggibile di una ricerca, es. «Fiat Panda · Milano · Fino a 8.000 € · Solo compatibili». */
export function describeSearch(query: string): string {
  const p = new URLSearchParams(query);
  const parts: string[] = [];
  const marca = p.get("marca");
  const modello = p.get("modello");
  if (marca) parts.push([findBrand(marca)?.name ?? marca, modello].filter(Boolean).join(" "));
  else if (modello) parts.push(modello);
  const luogo = p.get("citta") ?? (p.get("cap") ? `CAP ${p.get("cap")}` : null);
  if (luogo) parts.push(luogo);
  const prezzo = Number(p.get("prezzo_max"));
  if (prezzo > 0) parts.push(`Fino a ${new Intl.NumberFormat("it-IT").format(prezzo)} €`);
  const neo = p.get("neo") as NeoFilter | null;
  parts.push(neo && neo in NEO_FILTERS ? NEO_FILTERS[neo] : NEO_FILTERS.compatibili_da_verificare);
  return parts.join(" · ");
}

export function rememberLastSearch(query: string) {
  write(LAST_KEY, JSON.stringify({ id: "ultima", query, label: describeSearch(query), savedAt: new Date().toISOString() } satisfies SavedSearch));
}
export function forgetLastSearch() {
  write(LAST_KEY, null);
}
export function saveSearch(query: string): void {
  const list = parseSaved(savedSearchesSnapshot()).filter((s) => s.query !== query);
  const item: SavedSearch = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, query, label: describeSearch(query), savedAt: new Date().toISOString() };
  write(SAVED_KEY, JSON.stringify([item, ...list].slice(0, MAX_SAVED)));
}
export function removeSavedSearch(id: string) {
  write(SAVED_KEY, JSON.stringify(parseSaved(savedSearchesSnapshot()).filter((s) => s.id !== id)));
}
export function isSaved(query: string, saved: SavedSearch[]): boolean {
  return saved.some((s) => s.query === query);
}

/** Tiene solo i parametri della ricerca rapida, in ordine stabile (così due ricerche uguali coincidono). */
export function normalizeQuery(params: URLSearchParams): string {
  const out = new URLSearchParams();
  for (const k of QUICK_KEYS) {
    const v = params.get(k)?.trim();
    if (v) out.set(k, v);
  }
  return out.toString();
}
