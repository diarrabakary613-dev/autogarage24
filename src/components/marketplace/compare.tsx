"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { GitCompareArrows, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Selezione per il confronto (max 4), conservata nel browser e condivisibile via URL. */
const KEY = "ag24-confronto";
const MAX = 4;
type Item = { slug: string; title: string };
const listeners = new Set<() => void>();
let cache: Item[] | null = null;
let raw = "";

function read(): Item[] {
  try {
    const r = window.localStorage.getItem(KEY) ?? "[]";
    if (r !== raw || cache === null) { raw = r; const parsed = JSON.parse(r); cache = Array.isArray(parsed) ? parsed.slice(0, MAX) : []; }
  } catch { cache = cache ?? []; }
  return cache!;
}
function write(items: Item[]) {
  try { window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX))); } catch { /* archiviazione non disponibile */ }
  cache = items.slice(0, MAX);
  listeners.forEach((l) => l());
}
const EMPTY: Item[] = [];
function useCompare() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); window.addEventListener("storage", cb); return () => { listeners.delete(cb); window.removeEventListener("storage", cb); }; },
    read,
    () => EMPTY,
  );
}

export function CompareToggle({ slug, title, className }: { slug: string; title: string; className?: string }) {
  const items = useCompare();
  const active = items.some((i) => i.slug === slug);
  const full = !active && items.length >= MAX;
  return (
    <button
      type="button"
      disabled={full}
      aria-pressed={active}
      title={full ? "Puoi confrontare al massimo 4 automobili" : undefined}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); write(active ? items.filter((i) => i.slug !== slug) : [...items, { slug, title }]); }}
      className={cn("relative z-10 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50", active ? "border-ink bg-ink text-white" : "border-line-strong bg-white text-ink hover:border-ink", className)}
    >
      <GitCompareArrows className="size-3.5" aria-hidden /> {active ? "Nel confronto" : "Confronta"}
    </button>
  );
}

export function CompareBar() {
  const items = useCompare();
  if (items.length === 0) return null;
  return (
    <div className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-3xl flex-wrap items-center gap-2 rounded-2xl bg-ink p-3 text-white shadow-lift" role="region" aria-label="Automobili da confrontare">
      <ul className="flex min-w-0 flex-1 flex-wrap gap-1.5">
        {items.map((i) => (
          <li key={i.slug} className="flex max-w-[12rem] items-center gap-1 rounded-full bg-white/10 py-1 pr-1 pl-3 text-xs">
            <span className="truncate">{i.title}</span>
            <button type="button" onClick={() => write(items.filter((x) => x.slug !== i.slug))} aria-label={`Rimuovi ${i.title}`} className="grid size-5 place-items-center rounded-full hover:bg-white/20"><X className="size-3" aria-hidden /></button>
          </li>
        ))}
      </ul>
      <Link href={`/confronta?auto=${items.map((i) => i.slug).join(",")}`} className={cn("rounded-lg bg-orange px-4 py-2 text-sm font-bold text-ink", items.length < 2 && "pointer-events-none opacity-60")} aria-disabled={items.length < 2}>
        Confronta ({items.length})
      </Link>
    </div>
  );
}
