/**
 * Informazioni generali del sito. I campi vuoti NON vengono mostrati:
 * nessun contatto o profilo social viene inventato.
 */
export type SocialLink = { name: string; href: string };

export const SITE = {
  name: "AutoGarage24",
  tagline: "Tutto il mondo dell'automobile. In un unico posto.",
  area: "Milano e provincia",
  /** Email pubblica di contatto (es. "info@autogarage24.it"). Da compilare. */
  contactEmail: null as string | null,
  /** Telefono pubblico. Da compilare. */
  contactPhone: null as string | null,
  /** Profili social ufficiali. Da compilare quando saranno attivi. */
  socials: [] as SocialLink[],
} as const;
