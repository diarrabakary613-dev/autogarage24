import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { FOOTER_NAV, HEADER_CTAS, MAIN_NAV } from "@/config/navigation";
import { PUBLIC_ROUTES } from "@/config/seo";
import { BRANDS, brandHref, findBrand } from "@/config/brands";
import { HOME } from "@/content/home";
import { SERVICES } from "@/content/services";

/** Elenca i percorsi delle pagine reali in src/app (gruppi "(x)" esclusi dall'URL). */
function appRoutes(dir = join(process.cwd(), "src/app")): Set<string> {
  const routes = new Set<string>();
  const walk = (d: string) => {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry === "page.tsx") {
        const rel = relative(dir, d).split(sep).filter((s) => s && !/^\(.*\)$/.test(s));
        routes.add("/" + rel.join("/"));
      }
    }
  };
  walk(dir);
  return routes;
}

const routes = appRoutes();
const pathOf = (href: string) => href.split(/[?#]/)[0] || "/";

describe("nessun link verso pagine inesistenti", () => {
  const links = [
    ...MAIN_NAV.map((i) => i.href),
    ...FOOTER_NAV.flatMap((g) => g.items.map((i) => i.href)),
    HEADER_CTAS.service.href,
    HEADER_CTAS.professional.href,
    HOME.hero.primaryCta.href,
    HOME.hero.secondaryCta.href,
    ...HOME.hero.quickLinks.map((q) => q.href),
    HOME.neopatentati.primaryCta.href,
    HOME.neopatentati.secondaryCta.href,
    ...HOME.professionals.cards.map((c) => c.href),
    ...HOME.professionals.sellersLinks.map((l) => l.href),
    ...Object.values(SERVICES).map((s) => s.href),
    ...BRANDS.map((b) => brandHref(b)),
    ...PUBLIC_ROUTES.map((r) => r.path),
  ];

  it.each([...new Set(links)])("%s", (href) => {
    expect(routes.has(pathOf(href)), `pagina mancante per ${href}`).toBe(true);
  });

  it("le sei pagine dedicate del brief esistono", () => {
    for (const p of ["/auto-per-neopatentati", "/auto-usate", "/garages", "/meccanici", "/ricambi", "/servizi-auto"]) {
      expect(routes.has(p)).toBe(true);
    }
  });
});

describe("marchi", () => {
  it("hanno slug unici e validi", () => {
    const slugs = BRANDS.map((b) => b.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("findBrand riconosce solo marche note", () => {
    expect(findBrand("BMW")?.name).toBe("BMW");
    expect(findBrand(" citroen ")?.name).toBe("Citroën");
    expect(findBrand("<script>")).toBeUndefined();
    expect(findBrand(undefined)).toBeUndefined();
  });

  it("i link del filtro usano il formato ?marca=", () => {
    expect(brandHref(BRANDS[0])).toBe("/auto-usate?marca=bmw");
  });
});
