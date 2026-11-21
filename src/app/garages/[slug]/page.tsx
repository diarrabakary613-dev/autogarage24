import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, Skeleton } from "@/components/ui/feedback";
import { ProfilePage, profileMetadata } from "@/components/professionals/profile-page";

export async function generateMetadata(props: PageProps<"/garages/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  return profileMetadata(slug, "officina");
}

export default function Page(props: PageProps<"/garages/[slug]">) {
  return <Suspense fallback={<div className="bg-mist pb-16"><Container className="pt-10"><Skeleton className="h-[600px] rounded-2xl" /></Container></div>}><View params={props.params} /></Suspense>;
}

async function View({ params }: { params: PageProps<"/garages/[slug]">["params"] }) {
  const { slug } = await params;

  return <ProfilePage slug={slug} expectedType={["officina"]} />;
}
