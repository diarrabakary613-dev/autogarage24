"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type MapPoint = { id: string; lat: number; lng: number; label: string; href?: string; radiusKm?: number | null; approximate?: boolean };

/**
 * Mappa OpenStreetMap (Leaflet): nessuna chiave API, tile pubbliche con attribuzione.
 * Mostra solo punti con coordinate reali; per i meccanici mobili può disegnare un'area
 * (raggio) invece dell'indirizzo, senza esporre la posizione privata.
 */
export function MapView({ points, user, className = "h-80" }: { points: MapPoint[]; user?: { lat: number; lng: number } | null; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !ref.current) return;
      map = L.map(ref.current, { scrollWheelZoom: false, attributionControl: true });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      const bounds: [number, number][] = [];
      for (const p of points) {
        const style = { color: "#F47B20", fillColor: "#F47B20", fillOpacity: 0.85, weight: 2 };
        if (p.approximate && p.radiusKm) {
          L.circle([p.lat, p.lng], { radius: p.radiusKm * 1000, color: "#F47B20", fillOpacity: 0.12, weight: 1 }).addTo(map).bindTooltip(p.label);
        }
        const m = L.circleMarker([p.lat, p.lng], { ...style, radius: 9 }).addTo(map);
        const el = document.createElement("div");
        const strong = document.createElement("strong");
        strong.textContent = p.label;
        el.appendChild(strong);
        if (p.href) {
          const a = document.createElement("a");
          a.href = p.href;
          a.textContent = "Apri la scheda";
          a.style.display = "block";
          el.appendChild(a);
        }
        m.bindPopup(el);
        bounds.push([p.lat, p.lng]);
      }
      if (user) {
        L.circleMarker([user.lat, user.lng], { radius: 7, color: "#111318", fillColor: "#111318", fillOpacity: 1 }).addTo(map).bindTooltip("La tua posizione");
        bounds.push([user.lat, user.lng]);
      }
      if (bounds.length > 1) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
      else if (bounds.length === 1) map.setView(bounds[0], points[0]?.approximate ? 11 : 15);
      else map.setView([45.4642, 9.19], 11); // Milano
    })();
    return () => { cancelled = true; map?.remove(); };
  }, [points, user]);
  return <div ref={ref} className={`z-0 w-full overflow-hidden rounded-2xl border border-line bg-mist ${className}`} role="region" aria-label="Mappa" />;
}
