import Image from "next/image";
import Link from "next/link";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/feedback";
import { FavoriteButton } from "@/components/marketplace/favorite-button";
import { formatPrice } from "@/lib/format";
import { PART_CONDITION_LABELS } from "@/lib/labels";
import { publicFileUrl } from "@/lib/storage";
import type { Enums } from "@/lib/supabase/database.types";

export type PartCardData = {
  id: string; slug: string; title: string; category_name: string | null; manufacturer_brand: string | null; oem_code: string | null;
  condition: Enums<"part_condition">; price_cents: number | null; quantity: number | null; city: string | null;
  seller_kind: Enums<"seller_kind">; seller_name: string | null; status: Enums<"part_status">; cover_path: string | null; exact_code?: boolean;
};

export function PartCard({ p, favorite }: { p: PartCardData; favorite: boolean }) {
  const img = publicFileUrl("listing-images", p.cover_path);
  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card hover:shadow-lift">
      <div className="relative aspect-[4/3] bg-mist">
        {img ? <Image src={img} alt="" fill sizes="(min-width: 1280px) 25vw, 50vw" className="object-cover" /> : <div className="grid h-full place-items-center text-muted"><Package className="size-10" aria-hidden /></div>}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Badge tone="dark">{PART_CONDITION_LABELS[p.condition]}</Badge>
          {p.status === "esaurito" && <Badge tone="danger">Esaurito</Badge>}
          {p.exact_code && <Badge tone="success">Codice corrispondente</Badge>}
        </div>
        <div className="absolute top-3 right-3 z-10"><FavoriteButton kind="part" id={p.id} initial={favorite} label={p.title} /></div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-semibold text-muted uppercase">{p.category_name}{p.manufacturer_brand ? ` · ${p.manufacturer_brand}` : ""}</p>
        <h3 className="line-clamp-2 font-bold"><Link href={`/ricambi/${p.slug}`} className="after:absolute after:inset-0">{p.title}</Link></h3>
        {p.oem_code && <p className="font-mono text-xs text-graphite">OEM {p.oem_code}</p>}
        <p className="mt-auto text-xl font-extrabold">{formatPrice(p.price_cents)}</p>
        <p className="text-xs text-muted">{p.seller_kind === "professionista" ? p.seller_name : "Venditore privato"}{p.city ? ` · ${p.city}` : ""}</p>
      </div>
    </article>
  );
}
