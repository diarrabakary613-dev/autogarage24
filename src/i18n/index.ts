import { it, type Dictionary } from "./it";

export const SUPPORTED_LOCALES = ["it"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "it";

const dictionaries: Record<Locale, Dictionary> = { it };

/** Restituisce i testi per la lingua richiesta (oggi solo italiano). */
export function getDictionary(locale: Locale = DEFAULT_LOCALE): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

/** Scorciatoia per la lingua predefinita. */
export const t = getDictionary();
