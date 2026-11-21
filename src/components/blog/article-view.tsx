import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/feedback";
import { Breadcrumbs } from "@/components/marketing/page-hero";
import { JsonLd } from "@/components/marketing/json-ld";
import { extractHeadings, Markdown, readingMinutes } from "@/lib/seo/markdown";
import { publicFileUrl } from "@/lib/storage";
import { getSiteUrl } from "@/lib/env";
import { formatDate } from "@/lib/utils";
import type { Article } from "@/lib/data/blog";

/** Articolo: titolo H1, indice dai titoli H2/H3, dati strutturati Article coerenti con il contenuto visibile. */
export function ArticleView({ a, preview = false }: { a: Article; preview?: boolean }) {
  const cover = publicFileUrl("blog-images", a.cover_path);
  const toc = extractHeadings(a.content).filter((h) => h.level === 2);
  const site = getSiteUrl();
  return (
    <article>
      {!preview && (
        <JsonLd data={{
          "@context": "https://schema.org", "@type": "Article", headline: a.title, description: a.meta_description ?? a.excerpt ?? undefined,
          datePublished: a.published_at ?? undefined, dateModified: a.updated_at, author: { "@type": "Person", name: a.author_name },
          publisher: { "@type": "Organization", name: "AutoGarage24", url: site }, image: cover ?? undefined, mainEntityOfPage: `${site}/blog/${a.slug}`,
        }} />
      )}
      <Container className="max-w-3xl py-10">
        <Breadcrumbs items={[{ name: "Blog", href: "/blog" }, ...(a.blog_categories ? [{ name: a.blog_categories.name, href: `/blog/categoria/${a.blog_categories.slug}` }] : []), { name: a.title, href: `/blog/${a.slug}` }]} />
        <h1 className="mt-6 text-3xl leading-tight font-extrabold sm:text-4xl">{a.title}</h1>
        <p className="mt-3 text-sm text-muted">Di {a.author_name}{a.published_at ? ` · ${formatDate(a.published_at)}` : ""} · {readingMinutes(a.content)} min di lettura{a.updated_at && a.published_at && a.updated_at.slice(0, 10) > a.published_at.slice(0, 10) ? ` · aggiornato il ${formatDate(a.updated_at)}` : ""}</p>
        {a.excerpt && <p className="mt-4 text-lg text-graphite">{a.excerpt}</p>}
        {cover && <Image src={cover} alt={a.cover_alt ?? ""} width={1200} height={630} className="mt-6 h-auto w-full rounded-2xl object-cover" priority sizes="(min-width: 768px) 768px, 100vw" />}
        {toc.length >= 3 && (
          <nav aria-label="Indice dell'articolo" className="mt-6 rounded-xl border border-line bg-mist p-4 text-sm">
            <p className="font-bold">In questo articolo</p>
            <ol className="mt-2 list-decimal pl-5">{toc.map((h) => <li key={h.id}><a className="underline" href={`#${h.id}`}>{h.text}</a></li>)}</ol>
          </nav>
        )}
        <div className="mt-8"><Markdown source={a.content} /></div>
        <p className="mt-10 border-t border-line pt-4 text-sm text-muted">Le informazioni hanno scopo divulgativo: per scadenze, obblighi e costi verifica sempre le fonti ufficiali e chiedi a un professionista. <Link className="underline" href="/blog">Tutti gli articoli</Link></p>
      </Container>
    </article>
  );
}
