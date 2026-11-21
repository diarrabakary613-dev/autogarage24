import "server-only";
import { cacheLife, cacheTag } from "next/cache";

/**
 * Geocodifica di città o CAP con Nominatim (OpenStreetMap), lato server.
 * Nessuna chiave API. Policy d'uso: massimo 1 richiesta al secondo, User-Agent
 * identificabile, risultati in cache (qui: settimane). Per volumi elevati va
 * sostituito con un fornitore commerciale (vedi docs/MAPPE.md).
 * Restituisce null se il servizio non risponde: la ricerca ripiega sul filtro testuale.
 */
export async function geocodeItaly(query: string): Promise<{ lat: number; lng: number; label: string } | null> {
  "use cache";
  cacheLife("weeks");
  cacheTag("geocode");
  const q = query.trim().slice(0, 80);
  if (q.length < 2) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=it&limit=1&addressdetails=0&q=${encodeURIComponent(q)}`;
  try {
    const ctrl = AbortSignal.timeout(4000);
    const res = await fetch(url, {
      signal: ctrl,
      headers: { "User-Agent": `AutoGarage24/1.0 (${process.env.NEXT_PUBLIC_SITE_URL ?? "https://autogarage24.it"})`, "Accept-Language": "it" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { lat: string; lon: string; display_name: string }[];
    const hit = data[0];
    if (!hit) return null;
    const lat = Number(hit.lat), lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100, label: hit.display_name.split(",").slice(0, 2).join(",") };
  } catch {
    return null;
  }
}
