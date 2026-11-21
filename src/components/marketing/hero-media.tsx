"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";
import type { MediaAsset, VideoAsset } from "@/config/media";

function subscribeReducedMotion(callback: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true, // sul server: nessun video finché il browser non conferma le preferenze
  );
}

/**
 * Media della hero: video (senza audio, in loop, con poster) se configurato,
 * altrimenti fotografia, altrimenti l'illustrazione passata come `fallback`.
 * - Con "riduci animazioni" attivo mostra solo l'immagine poster.
 * - Il video può essere messo in pausa dall'utente.
 * - Se il browser blocca la riproduzione automatica, resta visibile il poster.
 */
export function HeroMedia({
  video,
  image,
  fallback,
}: {
  video: VideoAsset | null;
  image: MediaAsset | null;
  fallback: ReactNode;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || reducedMotion) return;
    el.play().then(
      () => setPlaying(true),
      () => setPlaying(false), // riproduzione automatica non consentita
    );
  }, [reducedMotion]);

  if (video && !reducedMotion) {
    return (
      <div className="relative h-full w-full">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          poster={video.poster}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        >
          {video.srcWebm && <source src={video.srcWebm} type="video/webm" />}
          <source src={video.src} type="video/mp4" />
        </video>
        <button
          type="button"
          onClick={() => (playing ? videoRef.current?.pause() : videoRef.current?.play())}
          className="absolute right-4 bottom-4 grid size-10 place-items-center rounded-full bg-ink/70 text-white backdrop-blur transition-colors hover:bg-ink"
          aria-label={playing ? "Metti in pausa il video" : "Riproduci il video"}
        >
          {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
        </button>
      </div>
    );
  }

  if (video?.poster) {
    return <Image src={video.poster} alt="" fill priority sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />;
  }

  if (image) {
    return <Image src={image.src} alt={image.alt} fill priority sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />;
  }

  return <>{fallback}</>;
}
