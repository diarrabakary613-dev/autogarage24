import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, Skeleton } from "@/components/ui/feedback";
import { redirect } from "next/navigation";
import { ProfilePage, profileMetadata } from "@/components/professionals/profile-page";
import { getPublicProfile } from "@/lib/data/profile-detail";

export async function generateMetadata(props: PageProps<"/professionisti/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  return profileMetadata(slug, undefined);
}

export default function Page(props: PageProps<"/professionisti/[slug]">) {
  return <Suspense fallback={<div className="bg-mist pb-16"><Container className="pt-10"><Skeleton className="h-[600px] rounded-2xl" /></Container></div>}><View params={props.params} /></Suspense>;
}

async function View({ params }: { params: PageProps<"/professionisti/[slug]">["params"] }) {
  const { slug } = await params;
  // Indirizzo canonico per officine, meccanici e venditori di ricambi; qui restano i concessionari.
  const d = await getPublicProfile(slug);
  const t = d?.profile.professional_type;
  if (t === "officina") redirect(`/garages/${slug}`);
  if (t === "meccanico") redirect(`/meccanici/${slug}`);
  if (t === "venditore_ricambi") redirect(`/venditori-ricambi/${slug}`);
  return <ProfilePage slug={slug} expectedType={["venditore_auto", "officina", "meccanico", "venditore_ricambi"]} />;
}
