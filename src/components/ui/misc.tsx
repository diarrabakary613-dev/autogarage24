import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Paginazione con link (funziona senza JavaScript e mantiene i filtri nell'URL). */
export function Pagination({
  page,
  pageSize,
  total,
  hrefFor,
}: {
  page: number;
  pageSize: number;
  total: number;
  hrefFor: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1);
  const item = "grid h-10 min-w-10 place-items-center rounded-md border px-3 text-sm font-semibold";
  return (
    <nav aria-label="Paginazione" className="mt-8 flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={cn(item, "border-line-strong bg-white hover:border-ink")} aria-label="Pagina precedente">
          <ChevronLeft className="size-4" aria-hidden />
        </Link>
      ) : null}
      {nums.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && nums[i - 1] !== p - 1 && <span className="px-1 text-muted">…</span>}
          <Link
            href={hrefFor(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(item, p === page ? "border-ink bg-ink text-white" : "border-line-strong bg-white hover:border-ink")}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < pages ? (
        <Link href={hrefFor(page + 1)} className={cn(item, "border-line-strong bg-white hover:border-ink")} aria-label="Pagina successiva">
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : null}
    </nav>
  );
}

/** Intestazione delle pagine dell'area personale e del pannello. */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="text-sm font-semibold text-orange-700">{eyebrow}</p>}
        <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

/** Schede di navigazione basate su link. */
export function TabLinks({ items, current }: { items: { href: string; label: string; key: string; count?: number }[]; current: string }) {
  return (
    <nav aria-label="Sezioni" className="-mx-1 mb-6 flex gap-1 overflow-x-auto border-b border-line px-1">
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          aria-current={it.key === current ? "page" : undefined}
          className={cn(
            "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold whitespace-nowrap",
            it.key === current ? "border-orange text-ink" : "border-transparent text-muted hover:text-ink",
          )}
        >
          {it.label}
          {typeof it.count === "number" && (
            <span className="rounded-full bg-mist px-1.5 text-xs text-graphite">{it.count}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}

/** Coppia etichetta/valore; i valori assenti sono indicati come "Non fornito". */
export function Spec({ label, value }: { label: ReactNode; value: ReactNode }) {
  const empty = value === null || value === undefined || value === "" || value === "—";
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={cn("text-right text-sm font-semibold", empty ? "font-normal text-muted italic" : "text-ink")}>
        {empty ? "Non fornito" : value}
      </dd>
    </div>
  );
}

/** Barra orizzontale semplice per i grafici di riepilogo (solo dati reali). */
export function BarList({ items, format }: { items: { label: string; value: number }[]; format: (v: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((i) => (
        <li key={i.label}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-graphite">{i.label}</span>
            <span className="font-semibold text-ink tabular-nums">{format(i.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-mist" aria-hidden>
            <div className="h-2 rounded-full bg-orange" style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
