import type { ReactNode } from "react";
import { Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Riquadro che dichiara con chiarezza una funzione non ancora attiva.
 * Elenca cosa arriverà, senza simulare ricerche o risultati.
 */
export function ComingSoon({
  title,
  description,
  features,
  phase,
  action,
  className,
}: {
  title: string;
  description: ReactNode;
  features?: readonly string[];
  phase: number;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-dashed border-line-strong bg-white p-6 sm:p-8", className)}>
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex max-w-2xl flex-col gap-3">
          <p className="flex w-fit items-center gap-1.5 rounded-full bg-mist px-3 py-1 text-xs font-semibold text-graphite">
            <Clock3 className="size-3.5 text-orange-700" aria-hidden />
            In preparazione · Fase {phase}
          </p>
          <h2 className="text-2xl font-extrabold">{title}</h2>
          <p className="leading-relaxed text-muted">{description}</p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {features && features.length > 0 && (
        <ul className="mt-6 grid gap-2.5 border-t border-line pt-6 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-graphite">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-orange" />
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
