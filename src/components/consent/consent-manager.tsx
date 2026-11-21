"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CONSENT_EVENT, CONSENT_KEY, parseConsent, type ConsentChoice, type ThirdParty } from "@/lib/consent";

function read(): ConsentChoice | null {
  try { return parseConsent(window.localStorage.getItem(CONSENT_KEY)); } catch { return null; }
}
function save(c: ConsentChoice) {
  try { window.localStorage.setItem(CONSENT_KEY, JSON.stringify(c)); } catch { /* archiviazione non disponibile: vale per questa visita */ }
}
function inject(id: string, src: string, inline?: string) {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id; s.async = true;
  if (src) s.src = src; else if (inline) s.text = inline;
  document.head.appendChild(s);
}

/** Carica gli strumenti di terze parti SOLO dopo il consenso esplicito; senza ID configurati non mostra nulla. */
export function ConsentManager({ ids }: { ids: ThirdParty }) {
  const [choice, setChoice] = useState<ConsentChoice | null>(null);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const hasAnalytics = Boolean(ids.ga4);
  const hasMarketing = Boolean(ids.googleAds || ids.metaPixel || ids.tiktokPixel);

  useEffect(() => {
    const c = read();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- stato letto dal browser dopo l'idratazione
    setChoice(c); setOpen(!c); setReady(true);
    const reopen = () => setOpen(true);
    window.addEventListener(CONSENT_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_EVENT, reopen);
  }, []);

  useEffect(() => {
    if (!choice) return;
    const gtagIds = [choice.analytics ? ids.ga4 : null, choice.marketing ? ids.googleAds : null].filter(Boolean) as string[];
    if (gtagIds.length) {
      inject("ag24-gtag", `https://www.googletagmanager.com/gtag/js?id=${gtagIds[0]}`);
      inject("ag24-gtag-init", "", `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());${gtagIds.map((g) => `gtag('config','${g}',{anonymize_ip:true});`).join("")}`);
    }
    if (choice.marketing && ids.metaPixel) {
      inject("ag24-meta", "", `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${ids.metaPixel}');fbq('track','PageView');`);
    }
    if (choice.marketing && ids.tiktokPixel) {
      inject("ag24-tiktok", "", `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;var o=d.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${ids.tiktokPixel}');ttq.page();}(window,document,'ttq');`);
    }
  }, [choice, ids]);

  const decide = useCallback((analytics: boolean, marketing: boolean) => {
    const prev = read();
    const c: ConsentChoice = { v: 1, analytics, marketing, at: new Date().toISOString() };
    save(c); setChoice(c); setOpen(false);
    // Revoca: gli script già caricati restano fino al prossimo caricamento della pagina.
    if (prev && ((prev.analytics && !analytics) || (prev.marketing && !marketing))) window.location.reload();
  }, []);

  if (!ready || !open) return null;
  return (
    <div role="dialog" aria-modal="false" aria-labelledby="consent-title" className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white p-4 shadow-2xl sm:inset-x-auto sm:bottom-4 sm:left-4 sm:max-w-md sm:rounded-xl sm:border">
      <p id="consent-title" className="font-bold">Strumenti di misurazione e pubblicità</p>
      <p className="mt-1 text-sm text-graphite">
        Con il tuo consenso usiamo {[hasAnalytics && "Google Analytics", hasMarketing && "strumenti pubblicitari (es. Meta, Google, TikTok)"].filter(Boolean).join(" e ")} per misurare le visite e le campagne. Questi strumenti usano cookie e inviano dati a terze parti. Senza consenso il sito funziona allo stesso modo. Dettagli nella <Link className="underline" href="/cookie">cookie policy</Link>.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => decide(false, false)} className="min-h-11 flex-1 rounded-lg border border-ink px-4 text-sm font-semibold">Rifiuta</button>
        <button type="button" onClick={() => decide(hasAnalytics, hasMarketing)} className="min-h-11 flex-1 rounded-lg bg-ink px-4 text-sm font-semibold text-white">Accetta</button>
      </div>
      {hasAnalytics && hasMarketing && (
        <button type="button" onClick={() => decide(true, false)} className="mt-2 text-sm font-semibold underline">Solo misurazione (senza pubblicità)</button>
      )}
    </div>
  );
}

/** Link nel footer per rivedere la scelta (visibile solo se esistono strumenti di terze parti). */
export function ConsentPreferencesLink() {
  return <button type="button" className="text-left hover:text-white hover:underline" onClick={() => window.dispatchEvent(new Event(CONSENT_EVENT))}>Preferenze cookie</button>;
}
