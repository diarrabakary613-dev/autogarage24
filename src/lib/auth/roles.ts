/**
 * Ruoli applicativi di AutoGarage24.
 * Devono corrispondere all'enum `public.app_role` nel database.
 */
export const APP_ROLES = [
  "cliente",
  "officina",
  "meccanico",
  "venditore_auto",
  "venditore_ricambi",
  "admin",
  "super_admin",
  "moderatore",
  "operatore_assistenza",
  "soccorritore",
  "trasportatore",
  "centro_revisione",
  "intermediario_assicurativo",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

/** Ruoli che un utente può scegliere in registrazione. "admin" è escluso. */
export const SELF_ASSIGNABLE_ROLES = [
  "cliente",
  "officina",
  "meccanico",
  "venditore_auto",
  "venditore_ricambi",
  "soccorritore",
  "trasportatore",
  "centro_revisione",
] as const satisfies readonly AppRole[];

export type SelfAssignableRole = (typeof SELF_ASSIGNABLE_ROLES)[number];

export const PROFESSIONAL_ROLES = [
  "officina",
  "meccanico",
  "venditore_auto",
  "venditore_ricambi",
  "soccorritore",
  "trasportatore",
  "centro_revisione",
  "intermediario_assicurativo",
] as const satisfies readonly AppRole[];

export type ProfessionalRole = (typeof PROFESSIONAL_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  cliente: "Cliente",
  officina: "Officina",
  meccanico: "Meccanico indipendente",
  venditore_auto: "Venditore professionale di automobili",
  venditore_ricambi: "Venditore di ricambi",
  admin: "Amministratore",
  super_admin: "Super amministratore",
  moderatore: "Moderatore",
  operatore_assistenza: "Operatore assistenza",
  soccorritore: "Soccorso stradale",
  trasportatore: "Trasporto veicoli",
  centro_revisione: "Centro revisioni",
  intermediario_assicurativo: "Intermediario assicurativo",
};

/** Ruoli dello staff: accedono al pannello di amministrazione secondo i permessi. */
export const STAFF_ROLES = ["super_admin", "admin", "moderatore", "operatore_assistenza"] as const satisfies readonly AppRole[];

export function isStaffRole(value: unknown): boolean {
  return typeof value === "string" && (STAFF_ROLES as readonly string[]).includes(value);
}

export const ROLE_DESCRIPTIONS: Record<SelfAssignableRole, string> = {
  cliente: "Cerco un'auto, un professionista o un ricambio.",
  officina: "Gestisco un'officina o un centro di assistenza.",
  meccanico: "Lavoro come meccanico indipendente.",
  venditore_auto: "Vendo automobili come professionista.",
  venditore_ricambi: "Vendo ricambi nuovi o usati.",
  soccorritore: "Offro soccorso stradale, traino o assistenza sul posto.",
  trasportatore: "Trasporto veicoli con bisarca o carroattrezzi.",
  centro_revisione: "Gestisco un centro autorizzato alla revisione dei veicoli.",
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value);
}

export function isSelfAssignableRole(value: unknown): value is SelfAssignableRole {
  return typeof value === "string" && (SELF_ASSIGNABLE_ROLES as readonly string[]).includes(value);
}

export function isProfessionalRole(value: unknown): value is ProfessionalRole {
  return typeof value === "string" && (PROFESSIONAL_ROLES as readonly string[]).includes(value);
}

/**
 * Ruolo "principale" da mostrare in interfaccia quando un utente ne ha più d'uno.
 * Priorità: staff (super admin > admin > moderatore > operatore) > ruoli professionali > cliente.
 */
export function primaryRole(roles: readonly AppRole[]): AppRole {
  const staff = STAFF_ROLES.find((r) => roles.includes(r));
  if (staff) return staff;
  const pro = PROFESSIONAL_ROLES.find((r) => roles.includes(r));
  return pro ?? "cliente";
}
