import Link from "next/link";
import { Heart } from "lucide-react";
import { EmptyState } from "@/components/ui/feedback";
import { TabLinks } from "@/components/ui/misc";
import { ListingCard } from "@/components/marketplace/listing-card";
import { FavoriteButton } from "@/components/marketplace/favorite-button";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ListingCardData } from "@/lib/data/listings";
import { formatPrice } from "@/lib/format";
import { PART_CONDITION_LABELS } from "@/lib/labels";

const TABS = { auto: "Automobili", officine: "Officine", meccanici: "Meccanici", ricambi: "Ricambi" } as const;
type Tab = keyof typeof TABS;

export async function Favorites({ searchParams, forced }: { searchParams: Promise<Record<string, string | string[] | undefined>>; forced?: Tab }) {
  await requireUser("/dashboard/preferiti");
  const sp = await searchParams;
  const tab: Tab = forced ?? (typeof sp.tab === "string" && sp.tab in TABS ? (sp.tab as Tab) : "auto");
  const supabase = await createClient();
  const { data: favs } = await supabase.from("favorites").select("listing_id, professional_profile_id, part_id, created_at").order("created_at", { ascending: false });
  const listingIds = (favs ?? []).map((f) => f.listing_id).filter(Boolean) as string[];
  const profileIds = (favs ?? []).map((f) => f.professional_profile_id).filter(Boolean) as string[];
  const partIds = (favs ?? []).map((f) => f.part_id).filter(Boolean) as string[];

  const [listings, profiles, parts] = await Promise.all([
    tab === "auto" && listingIds.length ? supabase.from("listing_search").select("*").in("id", listingIds) : Promise.resolve({ data: [] }),
    (tab === "officine" || tab === "meccanici") && profileIds.length
      ? supabase.from("professional_profiles").select("id, slug, display_name, professional_type, city, province").in("id", profileIds).eq("professional_type", tab === "officine" ? "officina" : "meccanico")
      : Promise.resolve({ data: [] }),
    tab === "ricambi" && partIds.length ? supabase.from("part_search").select("id, slug, title, price_cents, condition, city, status").in("id", partIds) : Promise.resolve({ data: [] }),
  ]);
  const items = { auto: listings.data?.length ?? 0, officine: 0, meccanici: 0, ricambi: parts.data?.length ?? 0 };

  return (
    <>
      {!forced && <TabLinks current={tab} items={(Object.keys(TABS) as Tab[]).map((k) => ({ key: k, label: TABS[k], href: `/dashboard/preferiti?tab=${k}` }))} />}
      {tab === "auto" && (items.auto === 0 ? <Empty what="automobili" href="/auto-usate" /> : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {(listings.data as ListingCardData[]).map((l) => <li key={l.id}><ListingCard item={l} favorite /></li>)}
        </ul>
      ))}
      {(tab === "officine" || tab === "meccanici") && ((profiles.data?.length ?? 0) === 0 ? <Empty what={tab} href={tab === "officine" ? "/garages" : "/meccanici"} /> : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {profiles.data!.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 shadow-card">
              <Link href={`/${p.professional_type === "officina" ? "garages" : "meccanici"}/${p.slug}`} className="min-w-0">
                <p className="truncate font-bold hover:underline">{p.display_name}</p>
                <p className="text-sm text-muted">{[p.city, p.province].filter(Boolean).join(" · ")}</p>
              </Link>
              <FavoriteButton kind="profile" id={p.id} initial label={p.display_name} />
            </li>
          ))}
        </ul>
      ))}
      {tab === "ricambi" && (items.ricambi === 0 ? <Empty what="ricambi" href="/ricambi" /> : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {parts.data!.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 shadow-card">
              <Link href={`/ricambi/${p.slug}`} className="min-w-0">
                <p className="truncate font-bold hover:underline">{p.title}</p>
                <p className="text-sm text-muted">{formatPrice(p.price_cents)} · {p.condition ? PART_CONDITION_LABELS[p.condition] : ""} · {p.city ?? ""}{p.status !== "pubblicato" ? " · non più disponibile" : ""}</p>
              </Link>
              <FavoriteButton kind="part" id={p.id!} initial label={p.title ?? ""} />
            </li>
          ))}
        </ul>
      ))}
    </>
  );
}

function Empty({ what, href }: { what: string; href: string }) {
  return <EmptyState icon={<Heart className="size-6" aria-hidden />} title={`Nessun preferito tra ${what}`} description="Tocca il cuore su un elemento per salvarlo qui." action={<Link href={href} className="font-semibold text-orange-700 hover:underline">Inizia a cercare →</Link>} />;
}
