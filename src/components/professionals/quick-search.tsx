"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LocateFixed, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Barra di ricerca unica per officine e meccanici: nome dell'attività, indirizzo, città o CAP.
 * «Vicino a me» usa la posizione del dispositivo solo dopo il clic (consenso del browser);
 * le coordinate sono arrotondate (~1 km) e restano nell'URL, non vengono salvate.
 */
export function ProQuickSearch({ base, defaultValue = "", kind = "officina", tone = "light", className }: {
  base: "/garages" | "/meccanici"; defaultValue?: string; kind?: "officina" | "meccanico"; tone?: "light" | "dark"; className?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [geo, setGeo] = useState<"idle" | "loading" | "error">("idle");
  const noun = kind === "officina" ? "officine" : "meccanici";

  function nearMe() {
    if (!("geolocation" in navigator)) { setGeo("error"); return; }
    setGeo("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const sp = new URLSearchParams({ lat: pos.coords.latitude.toFixed(2), lng: pos.coords.longitude.toFixed(2), raggio: "15", ordina: "distanza" });
        router.push(`${base}?${sp}#cerca`);
        setGeo("idle");
      },
      () => setGeo("error"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }

  const dark = tone === "dark";
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <form action={`${base}#cerca`} method="get" role="search" aria-label={`Cerca ${noun}`} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor={`qs-${base}`} className="sr-only">Nome dell&apos;{kind === "officina" ? "officina" : "attività"}, indirizzo, città o CAP</label>
        <div className={cn("flex h-14 min-w-0 flex-1 items-center gap-3 rounded-full border-2 px-5 transition focus-within:border-orange",
          dark ? "border-white/25 bg-white/[0.06] text-white" : "border-line-strong bg-white text-ink")}>
          <Search className={cn("size-5 shrink-0", dark ? "text-white/60" : "text-muted")} aria-hidden />
          <input
            id={`qs-${base}`}
            name="cerca"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={kind === "officina" ? "Nome officina, indirizzo o CAP" : "Nome, indirizzo o CAP"}
            maxLength={60}
            autoComplete="street-address"
            enterKeyHint="search"
            className={cn("h-12 min-w-0 flex-1 bg-transparent text-base outline-none", dark ? "placeholder:text-white/55" : "placeholder:text-muted")}
          />
          {value && (
            <button type="button" onClick={() => setValue("")} aria-label="Cancella" className={cn("rounded-full p-1", dark ? "text-white/60 hover:text-white" : "text-muted hover:text-ink")}>
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>
        <button type="submit" className="h-14 shrink-0 rounded-full bg-orange px-8 text-base font-bold text-ink transition hover:bg-orange-600" data-track="cta" data-track-label={`Cerca ${noun}`}>
          Cerca
        </button>
      </form>
      <button
        type="button"
        onClick={nearMe}
        disabled={geo === "loading"}
        className={cn("flex h-12 w-full items-center justify-center gap-2 rounded-full border-2 px-5 font-semibold transition disabled:opacity-60 sm:w-fit",
          dark ? "border-white/25 text-white hover:border-white/60" : "border-line-strong bg-white text-ink hover:border-ink")}
      >
        <LocateFixed className="size-5 text-orange" aria-hidden />
        {geo === "loading" ? "Rilevamento della posizione…" : `${kind === "officina" ? "Officine" : "Meccanici"} vicino a me`}
      </button>
      {geo === "error" && (
        <p role="alert" className={cn("text-sm", dark ? "text-orange" : "text-danger")}>
          Posizione non disponibile: consenti l&apos;accesso alla posizione nel browser oppure scrivi l&apos;indirizzo, la città o il CAP.
        </p>
      )}
      <p className={cn("text-xs", dark ? "text-white/60" : "text-muted")}>La posizione la chiediamo solo se premi il pulsante e non la salviamo.</p>
    </div>
  );
}
