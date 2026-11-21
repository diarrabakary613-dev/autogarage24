"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleFavorite, type FavoriteKind } from "@/lib/actions/favorites";
import { cn } from "@/lib/utils";

/** Pulsante preferiti: se l'utente non è collegato, lo porta all'accesso e poi lo riporta qui. */
export function FavoriteButton({
  kind,
  id,
  initial,
  variant = "icon",
  label = "auto",
}: {
  kind: FavoriteKind;
  id: string;
  initial: boolean;
  variant?: "icon" | "button";
  label?: string;
}) {
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    start(async () => {
      const res = await toggleFavorite(kind, id);
      if (res.login) {
        router.push(`/accedi?next=${encodeURIComponent(pathname + window.location.search)}`);
        return;
      }
      if (!res.ok) setError(res.error ?? "Errore");
      else setSaved(Boolean(res.saved));
    });
  }

  const text = saved ? "Salvato nei preferiti" : "Aggiungi ai preferiti";
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-pressed={saved}
        aria-label={variant === "icon" ? `${text}: ${label}` : undefined}
        title={text}
        className={cn(
          "inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60",
          variant === "icon"
            ? "size-10 rounded-full bg-white/95 text-ink shadow-card hover:text-orange-700"
            : "h-11 rounded-md border border-line-strong bg-white px-4 text-sm font-semibold text-ink hover:border-ink",
        )}
      >
        <Heart className={cn("size-5", saved && "fill-orange text-orange")} aria-hidden />
        {variant === "button" && text}
      </button>
      {error && (
        <span role="alert" className="absolute top-full right-0 z-10 mt-1 w-48 rounded-md bg-danger-50 p-2 text-xs text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
