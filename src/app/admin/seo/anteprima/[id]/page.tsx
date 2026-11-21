import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Alert, Container, Skeleton } from "@/components/ui/feedback";
import { ArticleView } from "@/components/blog/article-view";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Article } from "@/lib/data/blog";

export const metadata: Metadata = { title: "Anteprima articolo", robots: { index: false, follow: false } };

export default function PreviewPage(props: PageProps<"/admin/seo/anteprima/[id]">) {
  return <Suspense fallback={<Skeleton className="h-96" />}><Content params={props.params} /></Suspense>;
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("seo.manage", "/admin/seo");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("blog_articles").select("*, blog_categories(slug, name)").eq("id", id).maybeSingle();
  if (!data) notFound();
  return (
    <>
      <Container className="max-w-3xl pt-6"><Alert tone="warning">Anteprima riservata allo staff · stato: {data.status}. Il pubblico vede l&apos;articolo solo quando è pubblicato o quando arriva la data programmata.</Alert></Container>
      <ArticleView a={data as unknown as Article} preview />
    </>
  );
}
