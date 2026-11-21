"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Navigation, Square } from "lucide-react";
import { shareLocation, stopLocation } from "@/lib/actions/roadside";

/**
 * Condivisione della posizione dell'operatore: parte solo dopo il clic e il consenso del browser,
 * invia un aggiornamento al massimo ogni 20 secondi e si ferma chiudendo la pagina o premendo «Interrompi».
 */
export function ShareLocation({ requestId, sharing }: { requestId: string; sharing: boolean }) {
  const [on, setOn] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const watch = useRef<number | null>(null);
  const last = useRef(0);
  useEffect(() => () => { if (watch.current !== null) navigator.geolocation.clearWatch(watch.current); }, []);
  function start() {
    if (!("geolocation" in navigator)) { setMsg("Geolocalizzazione non disponibile su questo dispositivo."); return; }
    setOn(true); setMsg("In attesa della posizione…");
    watch.current = navigator.geolocation.watchPosition(async (p) => {
      if (Date.now() - last.current < 20000) return;
      last.current = Date.now();
      const r = await shareLocation(requestId, p.coords.latitude, p.coords.longitude, p.coords.accuracy);
      setMsg(r.ok ? `Posizione inviata alle ${new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}` : r.error ?? "Errore");
      if (!r.ok) stop();
    }, () => { setMsg("Permesso negato o posizione non disponibile."); setOn(false); }, { enableHighAccuracy: true, maximumAge: 10000 });
  }
  async function stop() {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null; setOn(false);
    await stopLocation(requestId); setMsg("Condivisione interrotta: il cliente non vede più la tua posizione.");
  }
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line p-3">
      <p className="text-sm">Condividi la tua posizione con il cliente solo durante questo intervento. {sharing && !on ? "È visibile l'ultima posizione inviata." : ""}</p>
      {on ? <button type="button" onClick={stop} className="inline-flex w-fit items-center gap-2 rounded-full border border-ink px-4 py-2 text-sm font-semibold"><Square className="size-4" aria-hidden /> Interrompi la condivisione</button>
          : <button type="button" onClick={start} className="inline-flex w-fit items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"><Navigation className="size-4" aria-hidden /> Condividi la mia posizione</button>}
      {msg && <p className="text-xs text-muted" role="status">{msg}</p>}
    </div>
  );
}

/** Aggiorna la pagina del cliente ogni 20 secondi durante l'intervento attivo (nessun dato inventato: rilegge il database). */
export function AutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => { const t = setInterval(() => router.refresh(), seconds * 1000); return () => clearInterval(t); }, [router, seconds]);
  return null;
}
