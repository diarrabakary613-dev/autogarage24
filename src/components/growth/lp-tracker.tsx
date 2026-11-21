"use client";

import { useEffect } from "react";
import { trackEvent } from "@/components/analytics/tracker";

/** Misura vista e clic della landing con la variante mostrata (nessun cookie, nessun identificativo). */
export function LpTracker({ slug, variant }: { slug: string; variant: "a" | "b" }) {
  useEffect(() => {
    trackEvent("lp_view", { lp: slug, variant });
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement | null)?.closest("[data-lp-cta]")) trackEvent("lp_cta", { lp: slug, variant });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [slug, variant]);
  return null;
}
