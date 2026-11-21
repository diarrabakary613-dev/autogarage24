import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Container, Skeleton } from "@/components/ui/feedback";
import { ArticleView } from "@/components/blog/article-view";
import { publicArticle } from "@/lib/data/blog";
import { publicFileUrl } from "@/lib/storage";

export async function generateMetadata(props: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const a = await publicArticle(slug);
  if (!a) return { title: "Articolo non trovato", robots: { index: false } };
  const cover = publicFileUrl("blog-images", a.cover_path);
  const description = a.meta_description ?? a.excerpt ?? undefined;
  return {
    title: a.meta_title ? { absolute: a.meta_title } : a.title, description,
    alternates: { canonical: `/blog/${a.slug}` },
    openGraph: { type: "article", title: a.meta_title ?? a.title, description, publishedTime: a.published_at ?? undefined, modifiedTime: a.updated_at, authors: [a.author_name], images: cover ? [{ url: cover, alt: a.cover_alt ?? "" }] : undefined },
  };
}

export default function ArticlePage(props: PageProps<"/blog/[slug]">) {
  return <Suspense fallback={<Container className="max-w-3xl py-10"><Skeleton className="h-96" /></Container>}><Content params={props.params} /></Suspense>;
}

async function Content({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await publicArticle(slug);
  if (!a) notFound();
  return <ArticleView a={a} />;
}
