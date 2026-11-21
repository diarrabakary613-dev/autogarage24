import type { ComponentProps, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "success" | "error" | "warning" | "info";

const alertTones: Record<Tone, { box: string; icon: ReactNode }> = {
  success: {
    box: "border-success/25 bg-success-50 text-[#145c33]",
    icon: <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden />,
  },
  error: {
    box: "border-danger/25 bg-danger-50 text-[#8c1f1f]",
    icon: <XCircle className="size-5 shrink-0 text-danger" aria-hidden />,
  },
  warning: {
    box: "border-warning/25 bg-warning-50 text-[#6e4000]",
    icon: <AlertTriangle className="size-5 shrink-0 text-warning" aria-hidden />,
  },
  info: {
    box: "border-info/20 bg-info-50 text-[#1b3f82]",
    icon: <Info className="size-5 shrink-0 text-info" aria-hidden />,
  },
};

/** Messaggio di conferma, errore, avviso o informazione. */
export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const t = alertTones[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-lg border px-4 py-3 text-sm", t.box, className)}
    >
      {t.icon}
      <div className="flex flex-col gap-0.5">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}

const badgeTones = {
  neutral: "bg-mist text-graphite border-line",
  orange: "bg-orange-50 text-orange-700 border-orange/25",
  success: "bg-success-50 text-success border-success/25",
  danger: "bg-danger-50 text-danger border-danger/25",
  warning: "bg-warning-50 text-warning border-warning/25",
  dark: "bg-ink text-white border-ink",
} as const;

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: keyof typeof badgeTones }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        badgeTones[tone],
        className,
      )}
      {...props}
    />
  );
}

/** Segnaposto animato durante il caricamento dei contenuti. */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-shimmer rounded-md bg-[linear-gradient(90deg,#eef0f3_0px,#f7f8fa_120px,#eef0f3_240px)] bg-[length:800px_100%]",
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-xl border border-line bg-white p-6 shadow-card", className)}
      {...props}
    />
  );
}

export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)} {...props} />;
}

/** Stato vuoto: quando non ci sono ancora dati reali da mostrare. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-dashed border-line-strong bg-mist/50 px-6 py-10 text-center",
        className,
      )}
    >
      {icon && <div className="text-muted">{icon}</div>}
      <p className="font-display text-lg font-bold text-ink">{title}</p>
      {description && <p className="max-w-md text-sm text-muted">{description}</p>}
      {action}
    </div>
  );
}
