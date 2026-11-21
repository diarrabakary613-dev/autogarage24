import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Formato di scrittura degli articoli (sottoinsieme di Markdown), trasformato in elementi React:
 * nessun HTML grezzo viene mai inserito nella pagina.
 *   ## Titolo / ### Sottotitolo · paragrafi separati da riga vuota · elenchi con "- " o "1. "
 *   **grassetto** · *corsivo* · [testo](/percorso-interno o https://…) · > citazione
 */
const SAFE_URL = /^(\/(?!\/)[A-Za-z0-9/_?=&#.-]*|https:\/\/[A-Za-z0-9.-]+\.[a-z]{2,}(\/[^\s)]*)?)$/;

export function renderInline(text: string, keyBase = "i"): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\[([^\]]{1,200})\]\(([^)\s]{1,500})\)|\*\*([^*]{1,300})\*\*|\*([^*]{1,300})\*/g;
  let last = 0; let m: RegExpExecArray | null; let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      const href = m[2];
      if (SAFE_URL.test(href)) {
        out.push(href.startsWith("/")
          ? <Link key={`${keyBase}-${k++}`} href={href} className="font-semibold text-orange-700 underline">{m[1]}</Link>
          : <a key={`${keyBase}-${k++}`} href={href} rel="noopener noreferrer nofollow" target="_blank" className="font-semibold text-orange-700 underline">{m[1]}</a>);
      } else out.push(m[1]);
    } else if (m[3] !== undefined) out.push(<strong key={`${keyBase}-${k++}`}>{m[3]}</strong>);
    else if (m[4] !== undefined) out.push(<em key={`${keyBase}-${k++}`}>{m[4]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export type Heading = { id: string; text: string; level: 2 | 3 };
export const slugifyHeading = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

export function extractHeadings(src: string): Heading[] {
  return src.split("\n").map((l) => l.trim()).filter((l) => /^#{2,3} /.test(l)).map((l) => {
    const level = l.startsWith("### ") ? 3 : 2;
    const text = l.replace(/^#{2,3} /, "").trim();
    return { id: slugifyHeading(text), text, level };
  });
}

export function Markdown({ source }: { source: string }) {
  const blocks = source.replace(/\r\n/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="flex flex-col gap-4 leading-relaxed text-graphite">
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (/^### /.test(b)) { const t = b.replace(/^### /, "").split("\n")[0]; return <h3 key={i} id={slugifyHeading(t)} className="mt-2 text-xl font-bold text-ink">{renderInline(t, `h${i}`)}</h3>; }
        if (/^## /.test(b)) { const t = b.replace(/^## /, "").split("\n")[0]; return <h2 key={i} id={slugifyHeading(t)} className="mt-4 text-2xl font-extrabold text-ink">{renderInline(t, `h${i}`)}</h2>; }
        if (lines.every((l) => /^[-*] /.test(l))) return <ul key={i} className="list-disc pl-6">{lines.map((l, j) => <li key={j}>{renderInline(l.slice(2), `u${i}-${j}`)}</li>)}</ul>;
        if (lines.every((l) => /^\d+\. /.test(l))) return <ol key={i} className="list-decimal pl-6">{lines.map((l, j) => <li key={j}>{renderInline(l.replace(/^\d+\. /, ""), `o${i}-${j}`)}</li>)}</ol>;
        if (lines.every((l) => l.startsWith("> "))) return <blockquote key={i} className="border-l-4 border-orange pl-4 italic">{renderInline(lines.map((l) => l.slice(2)).join(" "), `q${i}`)}</blockquote>;
        return <p key={i}>{lines.flatMap((l, j) => (j ? [<br key={`br${j}`} />, ...renderInline(l, `p${i}-${j}`)] : renderInline(l, `p${i}-${j}`)))}</p>;
      })}
    </div>
  );
}

/** Minuti di lettura stimati (200 parole al minuto). */
export function readingMinutes(src: string): number {
  return Math.max(1, Math.round(src.split(/\s+/).filter(Boolean).length / 200));
}
