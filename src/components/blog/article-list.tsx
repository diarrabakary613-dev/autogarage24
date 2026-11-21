import Link from "next/link";
import { EmptyState } from "@/components/ui/feedback";
import { blogCategories, publicArticles } from "@/lib/data/blog";
import { formatDate } from "@/lib/utils";

export async function ArticleList({ category }: { category?: string }) {
  const [articles, cats] = await Promise.all([publicArticles(category), blogCategories()]);
  return (
    <>
      {cats.length > 0 && (
        <nav aria-label="Categorie" className="mb-6 flex flex-wrap gap-2 text-sm">
          <Link href="/blog" className={`rounded-full border px-3 py-1 ${!category ? "border-ink bg-ink text-white" : "border-line-strong"}`}>Tutti</Link>
          {cats.map((c) => <Link key={c.id} href={`/blog/categoria/${c.slug}`} className={`rounded-full border px-3 py-1 ${category === c.slug ? "border-ink bg-ink text-white" : "border-line-strong"}`}>{c.name}</Link>)}
        </nav>
      )}
      {!articles.length ? <EmptyState title="Nessun articolo pubblicato" description="La redazione sta preparando le prime guide." /> : (
        <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{articles.map((a) => (
          <li key={a.id}><Link href={`/blog/${a.slug}`} className="block h-full rounded-2xl border border-line bg-white p-5 shadow-card hover:border-ink">
            {a.blog_categories && <p className="text-xs font-semibold tracking-wide text-orange-700 uppercase">{a.blog_categories.name}</p>}
            <h2 className="mt-1 text-lg font-bold">{a.title}</h2>
            {a.excerpt && <p className="mt-2 text-sm text-graphite">{a.excerpt}</p>}
            <p className="mt-3 text-xs text-muted">{a.published_at ? formatDate(a.published_at) : ""} · {a.author_name}</p>
          </Link></li>
        ))}</ul>
      )}
    </>
  );
}

