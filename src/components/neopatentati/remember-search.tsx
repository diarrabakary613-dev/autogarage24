"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { normalizeQuery, rememberLastSearch } from "@/lib/marketplace/saved-searches";

/**
 * Ricorda come «ultima ricerca» quella aperta con i filtri avanzati o da un link
 * (solo sul dispositivo). Non mostra nulla.
 */
export function RememberSearch() {
  const sp = useSearchParams();
  const query = normalizeQuery(new URLSearchParams(sp.toString()));
  useEffect(() => {
    const p = new URLSearchParams(query);
    p.delete("neo");
    if (p.toString()) rememberLastSearch(query.includes("neo=") ? query : `neo=compatibili_da_verificare&${query}`);
  }, [query]);
  return null;
}
