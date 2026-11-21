import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Logo testuale provvisorio di AutoGarage24.
 * Sostituibile con il logo definitivo (SVG) senza toccare il resto del sito.
 * Il contrasto arancio/bianco del marchio rientra nell'eccezione WCAG 1.4.3 per i logotipi.
 */
export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-2.5 rounded-md", className)}
    >
      <span
        aria-hidden
        className="grid size-9 place-items-center rounded-[10px] bg-orange font-display text-[0.95rem] font-extrabold text-white shadow-[inset_0_-2px_0_rgb(0_0_0/0.12)] transition-transform duration-300 group-hover:-rotate-6"
      >
        24
      </span>
      <span
        className={cn(
          "font-display text-lg font-extrabold tracking-tight",
          inverted ? "text-white" : "text-ink",
        )}
      >
        AutoGarage<span className="text-orange">24</span>
      </span>
      <span className="sr-only"> — torna alla home</span>
    </Link>
  );
}
