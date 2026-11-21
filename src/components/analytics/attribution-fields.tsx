"use client";

import { useSyncExternalStore } from "react";
import { getAttribution, subscribeAttribution } from "@/lib/analytics/attribution";

/** Sorgente della visita (solo in memoria, mai se l'utente rifiuta il tracciamento) inviata con il modulo. */
export function AttributionFields() {
  const a = useSyncExternalStore(subscribeAttribution, getAttribution, () => null);
  return (
    <>
      <input type="hidden" name="landing" value={a?.landing ?? ""} />
      <input type="hidden" name="utm_source" value={a?.utm_source ?? ""} />
      <input type="hidden" name="utm_medium" value={a?.utm_medium ?? ""} />
      <input type="hidden" name="utm_campaign" value={a?.utm_campaign ?? ""} />
      <input type="hidden" name="utm_content" value={a?.utm_content ?? ""} />
    </>
  );
}
