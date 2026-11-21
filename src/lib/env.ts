/**
 * Lettura centralizzata delle variabili d'ambiente pubbliche.
 * Le variabili NEXT_PUBLIC_* devono essere lette in modo statico
 * (process.env.NOME) perché Next.js le inserisce al momento della build.
 */

export class MissingEnvError extends Error {
  constructor(name: string) {
    super(
      `Variabile d'ambiente mancante: ${name}. ` +
        `Copia .env.example in .env.local e inserisci i valori (vedi docs/ENVIRONMENT.md).`,
    );
    this.name = "MissingEnvError";
  }
}

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") throw new MissingEnvError(name);
  return value.trim();
}

export function getSupabaseEnv() {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    publishableKey: required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  };
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

/** URL pubblico del sito, senza "/" finale. */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}
