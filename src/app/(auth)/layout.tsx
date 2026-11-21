import type { ReactNode } from "react";

/** Impaginazione comune delle pagine di accesso e registrazione. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 items-start justify-center bg-mist px-4 py-10 sm:items-center sm:py-16">
      <div className="w-full max-w-lg">{children}</div>
    </div>
  );
}
