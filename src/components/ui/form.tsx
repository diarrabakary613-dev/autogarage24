import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const controlBase =
  "w-full rounded-md border bg-white px-3.5 text-[0.95rem] text-ink placeholder:text-muted/80 " +
  "transition-[border-color,box-shadow] duration-150 " +
  "focus:border-orange focus:outline-none focus:ring-4 focus:ring-orange/15 " +
  "disabled:cursor-not-allowed disabled:bg-mist disabled:text-muted";

function controlState(invalid?: boolean) {
  return invalid
    ? "border-danger focus:border-danger focus:ring-danger/15"
    : "border-line-strong hover:border-slate/60";
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-sm font-semibold text-ink", className)} {...props} />;
}

type ControlProps = { invalid?: boolean };

export function Input({ className, invalid, ...props }: ComponentProps<"input"> & ControlProps) {
  return (
    <input
      className={cn(controlBase, "h-11", controlState(invalid), className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function Textarea({ className, invalid, ...props }: ComponentProps<"textarea"> & ControlProps) {
  return (
    <textarea
      className={cn(controlBase, "min-h-28 py-2.5", controlState(invalid), className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function Select({ className, invalid, ...props }: ComponentProps<"select"> & ControlProps) {
  return (
    <select
      className={cn(controlBase, "h-11 appearance-none bg-[length:16px] pr-9", controlState(invalid), className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23737780' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
      }}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

/**
 * Campo completo: etichetta + controllo + suggerimento + errore,
 * con gli attributi di accessibilità collegati.
 */
export function Field({
  id,
  label,
  hint,
  error,
  optional,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {optional && <span className="ml-1.5 font-normal text-muted">(facoltativo)</span>}
      </Label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Attributi da passare al controllo di un Field per collegare hint ed errori. */
export function describedBy(id: string, error?: string, hint?: boolean) {
  if (error) return { "aria-describedby": `${id}-error`, invalid: true } as const;
  if (hint) return { "aria-describedby": `${id}-hint`, invalid: false } as const;
  return { invalid: false } as const;
}

export function Checkbox({
  id,
  label,
  error,
  className,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { id: string; label: ReactNode; error?: string }) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          className="mt-0.5 size-5 shrink-0 cursor-pointer rounded border-line-strong accent-orange"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
        <label htmlFor={id} className="cursor-pointer text-sm leading-snug text-graphite">
          {label}
        </label>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="pl-8 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
