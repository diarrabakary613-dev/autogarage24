"use client";

import { useState } from "react";
import { Check, Copy, Mail, MessageCircle } from "lucide-react";

/** Condivisione del link di invito: copia, WhatsApp, email. Nessun invio automatico. */
export function ShareInvite({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const text = `Ti invito su AutoGarage24, la piattaforma per officine, auto e ricambi a Milano: ${url}`;
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { setCopied(false); }
  }
  const btn = "inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-strong bg-white px-4 text-sm font-semibold hover:border-ink";
  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-semibold" htmlFor="invite-url">Il tuo link di invito</label>
      <input id="invite-url" readOnly value={url} className="w-full rounded-lg border border-line-strong bg-mist px-3 py-2 font-mono text-sm" onFocus={(e) => e.currentTarget.select()} />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} className={btn}>{copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}{copied ? "Copiato" : "Copia link"}</button>
        <a className={btn} href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="size-4" aria-hidden />WhatsApp</a>
        <a className={btn} href={`mailto:?subject=${encodeURIComponent("Ti invito su AutoGarage24")}&body=${encodeURIComponent(text)}`}><Mail className="size-4" aria-hidden />Email</a>
      </div>
      <p aria-live="polite" className="sr-only">{copied ? "Link copiato negli appunti" : ""}</p>
    </div>
  );
}
