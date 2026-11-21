import { createClient } from "@supabase/supabase-js";

/**
 * Redirect gestiti dal SEO Manager, letti con la chiave pubblica (solo i redirect attivi sono visibili)
 * e tenuti in memoria per 60 secondi per non interrogare il database a ogni richiesta.
 */
type Rule = { to: string; code: 301 | 302 | 308 };
let cache: { at: number; map: Map<string, Rule> } | null = null;
let loading: Promise<Map<string, Rule>> | null = null;
const TTL = 60_000;
const SKIP = /^\/(admin|dashboard|business|api|auth|_next|accedi|registrati)(\/|$)/;

async function load(): Promise<Map<string, Rule>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return new Map();
  try {
    const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await sb.from("seo_redirects").select("from_path, to_path, status_code").eq("active", true).limit(5000);
    if (error) return cache?.map ?? new Map();
    return new Map((data ?? []).map((r) => [r.from_path, { to: r.to_path, code: (r.status_code === 302 ? 302 : r.status_code === 308 ? 308 : 301) as Rule["code"] }]));
  } catch { return cache?.map ?? new Map(); }
}

export function normalizePath(p: string): string {
  const lower = p.toLowerCase();
  return lower.length > 1 ? lower.replace(/\/+$/, "") : lower;
}

export async function findRedirect(pathname: string): Promise<Rule | null> {
  if (SKIP.test(pathname) || pathname === "/") return null;
  if (!cache || Date.now() - cache.at > TTL) {
    loading ??= load().then((map) => { cache = { at: Date.now(), map }; loading = null; return map; });
    await loading;
  }
  return cache?.map.get(normalizePath(pathname)) ?? null;
}
