import type { ReactNode } from "react";
import { Car, CarFront, Cog, KeyRound, Package, Settings2, Wrench, type LucideIcon } from "lucide-react";
import type { ServiceKey } from "@/content/services";
import { cn } from "@/lib/utils";

/*
 * Illustrazioni originali di AutoGarage24 (SVG/CSS, nessun diritto di terzi).
 * Fanno da segnaposto eleganti finché non saranno disponibili fotografie e
 * video con diritti d'uso verificati (vedi src/config/media.ts).
 */

/** Profilo stilizzato di un'automobile con linee di movimento. */
export function CarLineArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 320" className={cn("h-auto w-full", className)} role="img" aria-label="Illustrazione stilizzata di un'automobile in movimento">
      <defs>
        <linearGradient id="ag-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#F47B20" stopOpacity="0.05" />
          <stop offset="0.6" stopColor="#F47B20" stopOpacity="0.22" />
          <stop offset="1" stopColor="#F47B20" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="ag-streak" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.55" />
        </linearGradient>
      </defs>

      {/* linee di velocità */}
      <g className="ag-streaks" stroke="url(#ag-streak)" strokeLinecap="round">
        <line x1="0" y1="150" x2="120" y2="150" strokeWidth="2" />
        <line x1="10" y1="186" x2="90" y2="186" strokeWidth="1.5" />
        <line x1="30" y1="222" x2="110" y2="222" strokeWidth="2" />
      </g>

      {/* strada */}
      <line x1="40" y1="262" x2="620" y2="262" stroke="#FFFFFF" strokeOpacity="0.18" strokeWidth="1.5" />
      <g className="ag-road" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round">
        <line x1="60" y1="290" x2="120" y2="290" />
        <line x1="200" y1="290" x2="260" y2="290" />
        <line x1="340" y1="290" x2="400" y2="290" />
        <line x1="480" y1="290" x2="540" y2="290" />
      </g>

      {/* carrozzeria */}
      <path
        d="M118 236 L124 200 Q130 178 160 172 L232 162 Q282 112 352 104 L432 102 Q484 104 520 150 L560 160 Q596 168 604 202 L606 236 Z"
        fill="url(#ag-body)"
        stroke="#FFFFFF"
        strokeOpacity="0.9"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* finestrini */}
      <path
        d="M252 162 Q292 124 350 118 L398 117 L402 162 Z M416 117 L432 117 Q470 120 498 158 L418 162 Z"
        fill="#FFFFFF"
        fillOpacity="0.06"
        stroke="#FFFFFF"
        strokeOpacity="0.55"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* linea di cintura e maniglia */}
      <path d="M150 196 L590 192" stroke="#F47B20" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="440" y1="176" x2="462" y2="176" stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" />
      {/* fari */}
      <path d="M584 176 L602 182" stroke="#F47B20" strokeWidth="4" strokeLinecap="round" />
      <path d="M126 196 L138 194" stroke="#FFFFFF" strokeOpacity="0.8" strokeWidth="4" strokeLinecap="round" />

      {/* ruote */}
      {[208, 516].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="236" r="40" fill="#111318" stroke="#FFFFFF" strokeOpacity="0.9" strokeWidth="2.5" />
          <circle cx={cx} cy="236" r="22" fill="none" stroke="#F47B20" strokeWidth="2" />
          <circle cx={cx} cy="236" r="5" fill="#FFFFFF" fillOpacity="0.8" />
        </g>
      ))}
    </svg>
  );
}

const SERVICE_ICONS: Record<ServiceKey, LucideIcon> = {
  "auto-per-neopatentati": KeyRound,
  "auto-usate": Car,
  garages: Wrench,
  meccanici: Cog,
  ricambi: Package,
  "servizi-auto": Settings2,
};

export function serviceIcon(key: ServiceKey): LucideIcon {
  return SERVICE_ICONS[key];
}

/**
 * Riquadro grafico per le card dei servizi: icona su sfondo con trama.
 * Variante scura o chiara per alternare il ritmo della pagina.
 */
export function ServiceArt({
  serviceKey,
  tone = "dark",
  className,
  children,
}: {
  serviceKey: ServiceKey;
  tone?: "dark" | "light" | "orange";
  className?: string;
  children?: ReactNode;
}) {
  const Icon = SERVICE_ICONS[serviceKey] ?? CarFront;
  const tones = {
    dark: "bg-ink text-white",
    light: "bg-mist text-ink",
    orange: "bg-orange text-white",
  } as const;
  return (
    <div aria-hidden className={cn("relative isolate overflow-hidden", tones[tone], className)}>
      <div
        className={cn(
          "absolute inset-0 -z-10 [background-size:28px_28px]",
          tone === "light"
            ? "[background-image:radial-gradient(rgb(17_19_24/0.09)_1px,transparent_1px)]"
            : "[background-image:radial-gradient(rgb(255_255_255/0.14)_1px,transparent_1px)]",
        )}
      />
      <div
        className={cn(
          "absolute -right-10 -bottom-16 -z-10 size-56 rounded-full blur-2xl",
          tone === "orange" ? "bg-white/25" : "bg-orange/35",
        )}
      />
      <Icon
        className={cn(
          "absolute -right-4 -bottom-6 size-40 stroke-[1.1] transition-transform duration-500 ease-out group-hover:-translate-y-1 group-hover:-rotate-6",
          tone === "light" ? "text-ink/12" : "text-white/16",
        )}
      />
      <span
        className={cn(
          "absolute top-5 left-5 grid size-11 place-items-center rounded-lg",
          tone === "orange" ? "bg-white text-orange-700" : "bg-orange text-white",
        )}
      >
        <Icon className="size-5" />
      </span>
      {children}
    </div>
  );
}
