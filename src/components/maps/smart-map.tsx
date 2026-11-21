"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Star } from "lucide-react";
import "leaflet/dist/leaflet.css";

export type SmartPoint = {
  id: string; kind: string; name: string; href: string; contactHref: string; lat: number; lng: number; approximate: boolean;
  city: string | null; address: string | null; distanceKm: number | null; rating: number | null; reviews: number; photo: string | null;
  subtitle: string | null; price: string | null; meta: string | null; directions: string | null;
};

export const KIND_STYLE: Record<string, { label: string; color: string }> = {
  officina: { label: "Officine", color: "#F47B20" },
  meccanico: { label: "Meccanici", color: "#1F7A4D" },
  venditore_auto: { label: "Concessionari e venditori", color: "#2457C5" },
  venditore_ricambi: { label: "Ricambi (venditori)", color: "#7A3FB8" },
  ricambio: { label: "Ricambi", color: "#7A3FB8" },
  auto: { label: "Automobili", color: "#111318" },
};

/** Mappa interattiva sincronizzata con l'elenco (selezione da entrambe le parti). */
export function SmartMap({ points, center }: { points: SmartPoint[]; center: { lat: number; lng: number; label: string } | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const markers = useRef(new Map<string, import("leaflet").CircleMarker>());
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let cancelled = false;
    const registry = markers.current;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !ref.current) return;
      map = L.map(ref.current, { scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
      const bounds: [number, number][] = [];
      registry.clear();
      for (const p of points) {
        const color = KIND_STYLE[p.kind]?.color ?? "#F47B20";
        const m = L.circleMarker([p.lat, p.lng], { radius: p.kind === "auto" ? 7 : 9, color: "#fff", weight: 2, fillColor: color, fillOpacity: 0.95 }).addTo(map);
        const el = document.createElement("div");
        const b = document.createElement("strong"); b.textContent = p.name; el.appendChild(b);
        if (p.subtitle) { const s = document.createElement("div"); s.textContent = p.subtitle; s.style.fontSize = "12px"; el.appendChild(s); }
        const a = document.createElement("a"); a.href = p.href; a.textContent = "Apri la scheda"; a.style.display = "block"; el.appendChild(a);
        m.bindPopup(el);
        m.on("click", () => { setSelected(p.id); document.getElementById(`mp-${p.id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }); });
        registry.set(p.id, m);
        bounds.push([p.lat, p.lng]);
      }
      if (center) {
        L.circleMarker([center.lat, center.lng], { radius: 6, color: "#111318", fillColor: "#fff", fillOpacity: 1, weight: 3 }).addTo(map).bindTooltip(center.label);
        bounds.push([center.lat, center.lng]);
      }
      if (bounds.length > 1) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
      else if (bounds.length === 1) map.setView(bounds[0], 13);
      else map.setView([45.4642, 9.19], 11);
    })();
    return () => { cancelled = true; registry.clear(); map?.remove(); };
  }, [points, center]);

  function focus(id: string) {
    setSelected(id);
    const m = markers.current.get(id);
    if (m) { m.openPopup(); (m as unknown as { _map?: import("leaflet").Map })._map?.panTo(m.getLatLng()); }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div ref={ref} className="z-0 h-[55vh] min-h-80 w-full overflow-hidden rounded-2xl border border-line bg-mist lg:h-[calc(100vh-8rem)]" role="region" aria-label="Mappa dei risultati" />
        <ul className="mt-2 flex flex-wrap gap-3 text-xs" aria-label="Legenda">
          {Object.entries(KIND_STYLE).filter(([k]) => k !== "venditore_ricambi" || points.some((p) => p.kind === k)).filter(([k]) => points.some((p) => p.kind === k)).map(([k, s]) => (
            <li key={k} className="inline-flex items-center gap-1"><span className="size-3 rounded-full" style={{ background: s.color }} aria-hidden />{s.label}</li>
          ))}
          <li className="text-muted">Posizioni approssimate (~1 km) quando l&apos;indirizzo non è pubblico.</li>
        </ul>
      </div>
      <ol className="flex flex-col gap-3" aria-label="Risultati">
        {points.map((p) => (
          <li key={p.id} id={`mp-${p.id}`}>
            <article className={`flex gap-3 rounded-2xl border bg-white p-3 shadow-card transition ${selected === p.id ? "border-ink ring-2 ring-orange/40" : "border-line"}`}>
              <button type="button" onClick={() => focus(p.id)} className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-mist" aria-label={`Mostra ${p.name} sulla mappa`}>
                {p.photo
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={p.photo} alt="" className="size-full object-cover" loading="lazy" />
                  : <MapPin className="m-auto size-6 text-muted" aria-hidden />}
                <span className="absolute left-1 top-1 size-3 rounded-full ring-2 ring-white" style={{ background: KIND_STYLE[p.kind]?.color }} aria-hidden />
              </button>
              <div className="min-w-0 flex-1 text-sm">
                <h3 className="truncate font-bold"><button type="button" onClick={() => focus(p.id)} className="text-left hover:underline">{p.name}</button></h3>
                <p className="text-xs text-muted">{KIND_STYLE[p.kind]?.label}{p.meta ? ` · ${p.meta}` : ""}</p>
                {p.subtitle && <p className="truncate text-xs">{p.subtitle}</p>}
                <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-graphite">
                  <span>{p.address ?? p.city ?? "—"}{p.approximate && !p.address ? " (zona)" : ""}</span>
                  {p.distanceKm !== null && <span>{String(p.distanceKm).replace(".", ",")} km</span>}
                  {p.reviews > 0 && p.rating !== null && <span className="inline-flex items-center gap-0.5"><Star className="size-3 fill-orange text-orange" aria-hidden />{String(p.rating).replace(".", ",")} ({p.reviews})</span>}
                  {p.price && <span className="font-semibold">{p.price}</span>}
                </p>
                <p className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
                  <Link className="text-orange-700 underline" href={p.href}>{p.kind === "auto" || p.kind === "ricambio" ? "Vedi l'annuncio" : "Vedi il profilo"}</Link>
                  <Link className="underline" href={p.contactHref}>Richiedi informazioni</Link>
                  {p.directions && <a className="inline-flex items-center gap-1 underline" href={p.directions} target="_blank" rel="noopener noreferrer"><Navigation className="size-3" aria-hidden />Indicazioni</a>}
                </p>
              </div>
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}
