"use client";

import { useRouter } from "next/navigation";
import { LISTING_SORTS, listingSearchHref, type ListingFilters, type ListingSort } from "@/lib/marketplace/filters";

/** Ordinamento dei risultati: aggiorna l'URL mantenendo i filtri. */
export function SortSelect({ base, filters }: { base: string; filters: ListingFilters }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">Ordina per</span>
      <select
        className="h-10 rounded-md border border-line-strong bg-white px-3 text-sm font-semibold"
        defaultValue={filters.ordina}
        onChange={(e) => router.push(listingSearchHref(base, filters, { ordina: e.target.value as ListingSort, pagina: 1 }))}
      >
        {Object.entries(LISTING_SORTS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
