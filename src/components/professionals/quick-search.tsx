"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LocateFixed, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Barra di ricerca unica: un campo di testo, «Cerca» e, se previsto, «vicino a me».
 * La posizione si chiede solo dopo il clic (consenso del browser); le coordinate
 * sono arrotondate (~1 km) e restano nell'URL della ricerca, non vengono salvate.
 */
export function QuickSearchBar({ action, param = "cerca", placeholder, label, defaultValue = "", nearLabel, nearRadius = 15, tone = "light", className, trackLabel }: {
  action: string; param?: string; placeholder: string; label: string; defaultValue?: string;
  nearLabel?: string | null; nearRadius?: number; tone?: "light" | "dark"; className?: string; trackLabel?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [geo, setGeo] = useState<"idle" | "loading" | "error">("idle");
  const id = `qs-${action.replace(/[^a-z0-9]/gi, "")}`;

  function nearMe() {
    if (!("geolocation" in navigator)) { setGeo("error"); return; }
    setGeo("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const sp = new URLSearchParams({ lat: pos.coords.latitude.toFixed(2), lng: pos.coords.longitude.toFixed(2), raggio: String(nearRadius), ordina: "distanza" });
        router.push(`${action}?${sp}#cerca`);
        setGeo("idle");
      },
      () => setGeo("error"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }

  const dark = tone === "dark";
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <form action={`${action}#cerca`} method="get" role="search" aria-label={label} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor={id} className="sr-only">{label}</label>
        <div className={cn("flex h-14 min-w-0 flex-1 items-center gap-3 rounded-full border-2 px-5 transition focus-within:border-orange",
          dark ? "border-white/25 bg-white/[0.06] text-white" : "border-line-strong bg-white text-ink")}>
          <Search className={cn("size-5 shrink-0", dark ? "text-white/60" : "text-muted")} aria-hidden />
          <input
            id={id}
            name={param}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            maxLength={60}
            enterKeyHint="search"
            className={cn("h-12 min-w-0 flex-1 bg-transparent text-base outline-none", dark ? "placeholder:text-white/55" : "placeholder:text-muted")}
          />
          {value && (
            <button type="button" onClick={() => setValue("")} aria-label="Cancella" className={cn("rounded-full p-1", dark ? "text-white/60 hover:text-white" : "text-muted hover:text-ink")}>
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>
        <button type="submit" className="h-14 shrink-0 rounded-full bg-orange px-8 text-base font-bold text-ink transition hover:bg-orange-600" data-track="cta" data-track-label={trackLabel ?? label}>
          Cerca
        </button>
      </form>
      {nearLabel && (
        <>
          <button
            type="button"
            onClick={nearMe}
            disabled={geo === "loading"}
            className={cn("flex h-12 w-full items-center justify-center gap-2 rounded-full border-2 px-5 font-semibold transition disabled:opacity-60 sm:w-fit",
              dark ? "border-white/25 text-white hover:border-white/60" : "border-line-strong bg-white text-ink hover:border-ink")}
          >
            <LocateFixed className="size-5 text-orange" aria-hidden />
            {geo === "loading" ? "Rilevamento della posizione…" : nearLabel}
          </button>
          {geo === "error" && (
            <p role="alert" className={cn("text-sm", dark ? "text-orange" : "text-danger")}>
              Posizione non disponibile: consenti l&apos;accesso alla posizione nel browser oppure scrivi l&apos;indirizzo, la città o il CAP.
            </p>
          )}
          <p className={cn("text-xs", dark ? "text-white/60" : "text-muted")}>La posizione la chiediamo solo se premi il pulsante e non la salviamo.</p>
        </>
      )}
    </div>
  );
}

/** Barra per officine e meccanici: nome dell'attività, indirizzo, città o CAP, oppure «vicino a me». */
export function ProQuickSearch({ base, defaultValue = "", kind = "officina", tone = "light", className }: {
  base: "/garages" | "/meccanici"; defaultValue?: string; kind?: "officina" | "meccanico"; tone?: "light" | "dark"; className?: string;
}) {
  return (
    <QuickSearchBar
      action={base}
      label={kind === "officina" ? "Cerca un'officina per nome, indirizzo, città o CAP" : "Cerca un meccanico per nome, indirizzo, città o CAP"}
      placeholder={kind === "officina" ? "Nome officina, indirizzo o CAP" : "Nome, indirizzo o CAP"}
      defaultValue={defaultValue}
      nearLabel={kind === "officina" ? "Officine vicino a me" : "Meccanici vicino a me"}
      tone={tone}
      className={className}
    />
  );
}
