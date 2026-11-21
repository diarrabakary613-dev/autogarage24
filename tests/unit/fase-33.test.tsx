import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { extractHeadings, Markdown, readingMinutes, slugifyHeading } from "@/lib/seo/markdown";
import { normalizePath } from "@/lib/seo/redirects";
import { categoryForType, NEO_BANDS } from "@/lib/seo/constants";

const html = (src: string) => renderToStaticMarkup(<Markdown source={src} />);

describe("SEO Engine", () => {
  it("markdown: titoli, elenchi, grassetto, link interni", () => {
    const out = html("## Revisione auto\n\nTesto con **grassetto** e [link](/revisione-auto).\n\n- uno\n- due");
    expect(out).toContain('<h2 id="revisione-auto"');
    expect(out).toContain("<strong>grassetto</strong>");
    expect(out).toContain('href="/revisione-auto"');
    expect(out).toContain("<ul");
  });
  it("markdown: nessun HTML grezzo né link pericolosi", () => {
    const out = html('<script>alert(1)</script>\n\n[x](javascript:alert(1)) [y](//evil.example) <img src=x onerror=alert(1)>');
    expect(out).not.toContain("<script>");
    expect(out).not.toContain("<img");
    expect(out).not.toContain("javascript:");
    expect(out).not.toContain('href="//evil');
    expect(out).toContain("&lt;script&gt;");
  });
  it("markdown: link esterni nofollow", () => {
    expect(html("[Fonte](https://www.mit.gov.it/)")).toContain('rel="noopener noreferrer nofollow"');
  });
  it("indice e tempo di lettura", () => {
    expect(extractHeadings("## Uno\n\n### Due\n\ntesto")).toEqual([{ id: "uno", text: "Uno", level: 2 }, { id: "due", text: "Due", level: 3 }]);
    expect(slugifyHeading("Perché è importante?")).toBe("perche-e-importante");
    expect(readingMinutes("parola ".repeat(400))).toBe(2);
  });
  it("redirect: percorsi normalizzati", () => {
    expect(normalizePath("/Vecchia-Pagina/")).toBe("/vecchia-pagina");
    expect(normalizePath("/")).toBe("/");
  });
  it("categorie locali e fasce neopatentati", () => {
    expect(categoryForType("officina")).toBe("officine");
    expect(categoryForType("admin")).toBeNull();
    expect(Object.keys(NEO_BANDS)).toHaveLength(4);
  });
});

import { validateFile } from "@/lib/storage";
describe("Caricamenti (Fase 34)", () => {
  it("limite del bucket applicato dopo la compressione", () => {
    expect(validateFile({ type: "image/jpeg", size: 6 * 1024 * 1024 }, "image")).toBeNull();
    expect(validateFile({ type: "image/jpeg", size: 6 * 1024 * 1024 }, "image", "business-media")).toMatch(/5 MB/);
    expect(validateFile({ type: "image/jpeg", size: 3 * 1024 * 1024 }, "image", "avatars")).toMatch(/2 MB/);
    expect(validateFile({ type: "application/x-msdownload", size: 10 }, "image")).toMatch(/Formato/);
  });
});
