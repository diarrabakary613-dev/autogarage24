"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Search, Trash2 } from "lucide-react";
import { parseSaved, removeSavedSearch, savedSearchesSnapshot, serverSnapshot, subscribe } from "@/lib/marketplace/saved-searches";

const date = (iso: string) => new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));

/** Elenco delle ricerche salvate su questo dispositivo. */
export function SavedSearchesList() {
  const saved = parseSaved(useSyncExternalStore(subscribe, savedSearchesSnapshot, serverSnapshot));
  if (saved.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-3xl bg-white/[0.07] p-6 text-white">
        <p className="text-lg font-bold">Non hai ancora salvato ricerche.</p>
        <p className="text-white/70">Fai una ricerca e premi «Salva ricerca» nella scheda «Riprendi dove avevi lasciato!»: la ritroverai qui.</p>
        <Link href="/auto-per-neopatentati#cerca" className="flex h-12 items-center gap-2 rounded-full bg-orange px-6 font-bold text-ink hover:bg-orange-600">
          <Search className="size-5" aria-hidden /> Inizia una ricerca
        </Link>
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {saved.map((s) => (
        <li key={s.id} className="flex items-center gap-3 rounded-3xl bg-white/[0.07] p-4 text-white sm:p-5">
          <Link href={`/auto-per-neopatentati?${s.query}#ricerca`} className="min-w-0 flex-1">
            <span className="block font-bold hover:underline">{s.label}</span>
            <span className="text-sm text-white/60">Salvata il {date(s.savedAt)}</span>
          </Link>
          <button type="button" onClick={() => removeSavedSearch(s.id)} className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label={`Elimina la ricerca ${s.label}`}>
            <Trash2 className="size-5" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
