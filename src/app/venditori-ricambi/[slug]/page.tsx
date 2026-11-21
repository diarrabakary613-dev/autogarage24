import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, Skeleton } from "@/components/ui/feedback";
import { ProfilePage, profileMetadata } from "@/components/professionals/profile-page";

export async function generateMetadata(props: PageProps<"/venditori-ricambi/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  return profileMetadata(slug, "venditore_ricambi");
}

export default function Page(props: PageProps<"/venditori-ricambi/[slug]">) {
  return <Suspense fallback={<div className="bg-mist pb-16"><Container className="pt-10"><Skeleton className="h-[600px] rounded-2xl" /></Container></div>}><View params={props.params} /></Suspense>;
}

async function View({ params }: { params: PageProps<"/venditori-ricambi/[slug]">["params"] }) {
  const { slug } = await params;

  return <ProfilePage slug={slug} expectedType={["venditore_ricambi"]} />;
}
