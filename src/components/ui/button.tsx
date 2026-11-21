import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap " +
  "transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-out " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange " +
  "disabled:pointer-events-none disabled:opacity-55 active:translate-y-px select-none";

const variants: Record<ButtonVariant, string> = {
  // Testo nero su arancione: contrasto 6.8:1 (il bianco sarebbe 2.7:1, sotto la soglia WCAG AA).
  primary: "bg-orange text-ink shadow-[0_1px_0_rgb(0_0_0/0.08)] hover:bg-orange-600",
  secondary: "bg-ink text-white hover:bg-graphite",
  outline: "border border-line-strong bg-white text-ink hover:border-ink hover:bg-mist",
  ghost: "text-graphite hover:bg-mist hover:text-ink",
  danger: "bg-danger text-white hover:bg-[#a72626]",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[0.95rem]",
  lg: "h-13 px-7 text-base",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
};

/** Link con l'aspetto di un pulsante (per la navigazione). */
export function ButtonLink({
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...props}>
      {icon}
      {children}
    </Link>
  );
}
