import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, Skeleton } from "@/components/ui/feedback";
import { ArticleList } from "@/components/blog/article-list";
import { PageHero } from "@/components/marketing/page-hero";
import { publicArticles } from "@/lib/data/blog";
import { seoMetadata } from "@/lib/seo/overrides";

export async function generateMetadata(): Promise<Metadata> {
  const articles = await publicArticles();
  return seoMetadata("/blog", {
    title: "Blog: guide su auto, manutenzione e neopatentati",
    description: "Guide pratiche di AutoGarage24 su manutenzione, revisione, acquisto della prima auto e servizi per l'automobile a Milano.",
    alternates: { canonical: "/blog" },
    // Finché non ci sono articoli la pagina non va indicizzata.
    robots: articles.length ? undefined : { index: false, follow: true },
  });
}

export default function BlogPage() {
  return (
    <>
      <PageHero eyebrow="Blog" title="Guide e consigli per la tua auto" description="Articoli pratici scritti dalla redazione di AutoGarage24." crumbs={[{ name: "Blog", href: "/blog" }]} />
      <Container className="py-10"><Suspense fallback={<Skeleton className="h-64" />}><List /></Suspense></Container>
    </>
  );
}

async function List() { return <ArticleList />; }
