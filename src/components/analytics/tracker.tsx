"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { captureAttribution, deviceClass, getAttribution, trackingRefused } from "@/lib/analytics/attribution";

/** Eventi ammessi lato browser (lo stesso elenco è applicato nel database). */
export type ClientEvent = "page_view" | "cta_click" | "lp_view" | "lp_cta" | "ricerca_auto" | "apertura_scheda_auto" | "ricerca_officine" | "ricerca_ricambi" | "apertura_profilo" | "calcolo_neopatentati" | "mappa_ricerca";

const PRIVATE = /^\/(admin|dashboard|auth|account-sospeso)(\/|$)/;

export function trackEvent(event: ClientEvent, meta: Record<string, string | number | boolean> = {}, isEntry = false) {
  if (typeof window === "undefined" || trackingRefused()) return;
  const path = window.location.pathname;
  if (PRIVATE.test(path) || !/^\/[A-Za-z0-9/_.-]{0,199}$/.test(path)) return;
  const a = getAttribution();
  try {
    void createClient().rpc("track_event", {
      p_event: event, p_path: path, p_landing: a?.landing ?? undefined, p_utm_source: a?.utm_source ?? undefined,
      p_utm_medium: a?.utm_medium ?? undefined, p_utm_campaign: a?.utm_campaign ?? undefined, p_utm_content: a?.utm_content ?? undefined,
      p_referrer_host: isEntry ? (a?.referrer_host ?? undefined) : undefined, p_device: deviceClass(), p_is_entry: isEntry, p_meta: meta,
    }).then(() => undefined, () => undefined);
  } catch {
    // Configurazione assente (sviluppo): la misurazione non deve mai disturbare la navigazione.
  }
}

/**
 * Misurazione senza cookie: pagina vista e clic sugli elementi con
 * data-track="cta". Nessun dato personale, nessun identificativo.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();
  const search = useSearchParams();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) captureAttribution(pathname, search.toString(), document.referrer);
    trackEvent("page_view", {}, first.current);
    first.current = false;
  }, [pathname, search]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-track='cta']");
      if (!el) return;
      trackEvent("cta_click", { cta: (el.dataset.trackLabel ?? el.textContent ?? "").trim().slice(0, 60) });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
