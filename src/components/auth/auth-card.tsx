import type { ReactNode } from "react";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-6 shadow-lift sm:p-9">
      <div className="mb-7">
        <h1 className="text-2xl font-extrabold sm:text-[1.75rem]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-muted">{subtitle}</p>}
      </div>
      {children}
      {footer && <div className="mt-7 border-t border-line pt-5 text-center text-sm text-muted">{footer}</div>}
    </div>
  );
}
