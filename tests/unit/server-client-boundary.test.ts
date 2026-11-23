import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Un componente server non può passare funzioni a un componente client
 * (React lo blocca in produzione con l'errore #441, «Qualcosa è andato storto»).
 * Qui si controlla il caso che aveva rotto le pagine con accesso: <ActionForm>{(s) => …}</ActionForm>
 * dentro un file server.
 */
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : p.endsWith(".tsx") ? [p] : [];
  });
}

describe("Confine server/client", () => {
  it("nessun file server passa una funzione come contenuto di ActionForm", () => {
    const offenders: string[] = [];
    for (const file of files(join(process.cwd(), "src"))) {
      const src = readFileSync(file, "utf8");
      if (/^\s*["']use client["']/.test(src) || !src.includes("<ActionForm")) continue;
      const re = /<ActionForm\b[^]*?>\s*\{\s*\(\w+\)\s*=>/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        if (!m[0].includes("</")) offenders.push(`${file}:${src.slice(0, m.index).split("\n").length}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
