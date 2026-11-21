import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Container, Skeleton } from "@/components/ui/feedback";
import { PageHero } from "@/components/marketing/page-hero";
import { ArticleList } from "@/components/blog/article-list";
import { blogCategories, publicArticles } from "@/lib/data/blog";

export async function generateMetadata(props: PageProps<"/blog/categoria/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const c = (await blogCategories()).find((x) => x.slug === slug);
  if (!c) return { title: "Categoria non trovata", robots: { index: false } };
  const n = (await publicArticles(slug)).length;
  return { title: `${c.name} · Blog`, description: c.description ?? `Articoli della categoria ${c.name} sul blog di AutoGarage24.`, alternates: { canonical: `/blog/categoria/${slug}` }, robots: n ? undefined : { index: false, follow: true } };
}

export default function CategoryPage(props: PageProps<"/blog/categoria/[slug]">) {
  return <Suspense fallback={<Container className="py-10"><Skeleton className="h-64" /></Container>}><Content params={props.params} /></Suspense>;
}

async function Content({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = (await blogCategories()).find((x) => x.slug === slug);
  if (!c) notFound();
  return (
    <>
      <PageHero eyebrow="Blog" title={c.name} description={c.description ?? "Articoli della redazione di AutoGarage24."} crumbs={[{ name: "Blog", href: "/blog" }, { name: c.name, href: `/blog/categoria/${c.slug}` }]} />
      <Container className="py-10"><ArticleList category={c.slug} /></Container>
    </>
  );
}
