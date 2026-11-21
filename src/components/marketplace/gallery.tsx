"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Car, ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Galleria con miniature, frecce, tastiera, swipe e schermo intero. */
export function Gallery({ images, alt }: { images: { url: string; id: string }[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const [full, setFull] = useState(false);
  const touch = useRef<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const n = images.length;
  const go = useCallback((d: number) => setIndex((i) => (i + d + n) % n), [n]);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (full && !el.open) el.showModal();
    if (!full && el.open) el.close();
  }, [full]);

  if (n === 0) {
    return (
      <div className="grid aspect-[16/10] place-items-center rounded-2xl bg-mist text-muted">
        <div className="flex flex-col items-center gap-2"><Car className="size-12" aria-hidden /><span className="text-sm">Nessuna fotografia disponibile</span></div>
      </div>
    );
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") go(-1);
    if (e.key === "ArrowRight") go(1);
  };
  const swipe = {
    onTouchStart: (e: React.TouchEvent) => { touch.current = e.touches[0].clientX; },
    onTouchEnd: (e: React.TouchEvent) => {
      if (touch.current === null) return;
      const dx = e.changedTouches[0].clientX - touch.current;
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      touch.current = null;
    },
  };
  const arrows = (big = false) => n > 1 && (
    <>
      <button type="button" onClick={() => go(-1)} aria-label="Foto precedente" className={cn("absolute top-1/2 left-3 grid -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-card hover:bg-white", big ? "size-12" : "size-10")}><ChevronLeft className="size-5" aria-hidden /></button>
      <button type="button" onClick={() => go(1)} aria-label="Foto successiva" className={cn("absolute top-1/2 right-3 grid -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-card hover:bg-white", big ? "size-12" : "size-10")}><ChevronRight className="size-5" aria-hidden /></button>
    </>
  );

  return (
    <div className="flex flex-col gap-3" role="region" aria-roledescription="galleria" aria-label={`Fotografie: ${alt}`} onKeyDown={onKey}>
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-mist" {...swipe}>
        <Image src={images[index].url} alt={`${alt} — foto ${index + 1} di ${n}`} fill priority={index === 0} sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover" />
        {arrows()}
        <button type="button" onClick={() => setFull(true)} className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-ink/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink">
          <Expand className="size-3.5" aria-hidden /> Schermo intero
        </button>
        <span className="absolute bottom-3 left-3 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-semibold text-white" aria-live="polite">{index + 1} / {n}</span>
      </div>
      {n > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Miniature">
          {images.map((img, i) => (
            <li key={img.id} className="shrink-0">
              <button type="button" onClick={() => setIndex(i)} aria-label={`Mostra foto ${i + 1}`} aria-current={i === index}
                className={cn("relative block h-16 w-24 overflow-hidden rounded-lg border-2", i === index ? "border-orange" : "border-transparent opacity-80 hover:opacity-100")}>
                <Image src={img.url} alt="" fill sizes="96px" className="object-cover" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <dialog ref={dialog} onClose={() => setFull(false)} onKeyDown={onKey} className="m-0 h-dvh max-h-none w-screen max-w-none bg-ink/95 p-0 backdrop:bg-ink/80" aria-label="Galleria a schermo intero">
        {full && (
          <div className="relative h-full w-full" {...swipe}>
            <Image src={images[index].url} alt={`${alt} — foto ${index + 1} di ${n}`} fill sizes="100vw" className="object-contain" />
            {arrows(true)}
            <button type="button" onClick={() => setFull(false)} aria-label="Chiudi" className="absolute top-4 right-4 grid size-11 place-items-center rounded-full bg-white text-ink"><X className="size-5" aria-hidden /></button>
            <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-sm text-white">{index + 1} / {n}</span>
          </div>
        )}
      </dialog>
    </div>
  );
}
