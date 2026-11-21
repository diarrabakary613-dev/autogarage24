import type { ReactNode } from "react";
import { Container } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";

type Tone = "white" | "mist" | "ink";

const tones: Record<Tone, string> = {
  white: "bg-white",
  mist: "bg-mist",
  ink: "bg-ink text-white/80",
};

/** Sezione standard delle pagine pubbliche: sfondo, spaziature e contenitore. */
export function Section({
  id,
  tone = "white",
  className,
  containerClassName,
  labelledBy,
  children,
}: {
  id?: string;
  tone?: Tone;
  className?: string;
  containerClassName?: string;
  labelledBy?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn("scroll-mt-28 py-16 sm:py-24", tones[tone], className)}
    >
      <Container className={containerClassName}>{children}</Container>
    </section>
  );
}

/** Intestazione di sezione: etichetta, titolo e descrizione. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  align = "left",
  inverted = false,
  as: Tag = "h2",
  className,
  action,
}: {
  id?: string;
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  inverted?: boolean;
  as?: "h1" | "h2";
  className?: string;
  action?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "mb-10 flex flex-col gap-6 sm:mb-14",
        align === "center" ? "items-center text-center" : "md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className={cn("flex max-w-3xl flex-col gap-3", align === "center" && "items-center")}>
        {eyebrow && (
          <p className="flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-orange-700 uppercase [.bg-ink_&]:text-orange">
            <span aria-hidden className="h-px w-6 bg-current" />
            {eyebrow}
          </p>
        )}
        <Tag
          id={id}
          className={cn(
            "text-3xl leading-[1.1] font-extrabold text-balance sm:text-4xl lg:text-[2.75rem]",
            inverted ? "text-white" : "text-ink",
          )}
        >
          {title}
        </Tag>
        {description && (
          <p className={cn("text-lg leading-relaxed text-pretty", inverted ? "text-white/70" : "text-muted")}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
