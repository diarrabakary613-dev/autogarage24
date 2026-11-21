/**
 * Marchi automobilistici mostrati nel logo marquee e nella griglia.
 *
 * I loghi ufficiali NON sono inclusi: i diritti d'uso non sono stati
 * verificati. I marchi sono presentati in forma tipografica e servono solo
 * come filtro di ricerca, senza suggerire partnership con i produttori.
 * Nella Fase 9 l'elenco diventerà gestibile dal pannello (tabella brand_catalog).
 */
export type Brand = { slug: string; name: string };

export const BRANDS: readonly Brand[] = [
  { slug: "bmw", name: "BMW" },
  { slug: "mercedes-benz", name: "Mercedes-Benz" },
  { slug: "audi", name: "Audi" },
  { slug: "volkswagen", name: "Volkswagen" },
  { slug: "toyota", name: "Toyota" },
  { slug: "peugeot", name: "Peugeot" },
  { slug: "renault", name: "Renault" },
  { slug: "fiat", name: "Fiat" },
  { slug: "ford", name: "Ford" },
  { slug: "opel", name: "Opel" },
  { slug: "citroen", name: "Citroën" },
  { slug: "hyundai", name: "Hyundai" },
  { slug: "kia", name: "Kia" },
  { slug: "nissan", name: "Nissan" },
] as const;

export function findBrand(slug: unknown): Brand | undefined {
  if (typeof slug !== "string") return undefined;
  const normalized = slug.trim().toLowerCase();
  return BRANDS.find((b) => b.slug === normalized);
}

/** Destinazione del filtro per marca nel marketplace. */
export function brandHref(brand: Brand, base = "/auto-usate") {
  return `${base}?marca=${brand.slug}`;
}
