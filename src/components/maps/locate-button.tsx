"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LocateFixed } from "lucide-react";

/**
 * Usa la posizione del dispositivo SOLO dopo il clic dell'utente (consenso del browser).
 * Le coordinate vengono arrotondate (~1 km) e restano nell'URL della ricerca, non vengono salvate.
 */
export function LocateButton() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const active = params.get("lat") && params.get("lng");
  function locate() {
    if (!("geolocation" in navigator)) { setState("error"); return; }
    setState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const sp = new URLSearchParams(params.toString());
        sp.set("lat", pos.coords.latitude.toFixed(2));
        sp.set("lng", pos.coords.longitude.toFixed(2));
        if (!sp.get("raggio")) sp.set("raggio", "15");
        sp.delete("pagina");
        router.push(`${pathname}?${sp}`);
        setState("idle");
      },
      () => setState("error"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }
  function clear() {
    const sp = new URLSearchParams(params.toString());
    ["lat", "lng", "raggio"].forEach((k) => sp.delete(k));
    if (sp.get("ordina") === "distanza") sp.delete("ordina");
    router.push(`${pathname}?${sp}`);
  }
  return (
    <div className="flex flex-col gap-1">
      {active ? (
        <button type="button" onClick={clear} className="inline-flex items-center gap-2 text-sm font-semibold text-orange-700 hover:underline"><LocateFixed className="size-4" aria-hidden /> Posizione attiva · rimuovi</button>
      ) : (
        <button type="button" onClick={locate} disabled={state === "loading"} className="inline-flex items-center gap-2 text-sm font-semibold text-orange-700 hover:underline disabled:opacity-60">
          <LocateFixed className="size-4" aria-hidden /> {state === "loading" ? "Rilevamento…" : "Usa la mia posizione"}
        </button>
      )}
      {state === "error" && <p className="text-xs text-danger">Posizione non disponibile: inserisci la città o il CAP.</p>}
      <p className="text-xs text-muted">Facoltativo: chiediamo la posizione solo se premi il pulsante e non la salviamo.</p>
    </div>
  );
}
