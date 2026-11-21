import Link from "next/link";
import { MapPin, Tag } from "lucide-react";
import { Badge } from "@/components/ui/feedback";
import { formatPrice } from "@/lib/format";
import { formatDate } from "@/lib/utils";
import { publicFileUrl } from "@/lib/storage";
import { NEO_TOPICS, OFFER_CATEGORIES, discountPct } from "@/lib/offers/labels";

export type OfferCardData = {
  slug: string; title: string; category: string; neo_topic: string | null; image_path: string | null; original_price_cents: number; promo_price_cents: number;
  ends_on: string; city: string | null; partner_name: string; distance_km: number | null; quantity_left: number | null;
};

export function OfferCard({ o }: { o: OfferCardData }) {
  const img = publicFileUrl("business-media", o.image_path);
  const pct = discountPct(o.original_price_cents, o.promo_price_cents);
  return (
    <Link href={`/offerte/${o.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition hover:border-ink">
      <div className="relative aspect-[16/10] bg-ink">
        {img
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={img} alt="" className="size-full object-cover" loading="lazy" />
          : <span className="grid size-full place-items-center text-orange"><Tag className="size-10" aria-hidden /></span>}
        {pct !== null && <span className="absolute left-3 top-3 rounded-full bg-orange px-2.5 py-1 text-sm font-extrabold text-ink">−{pct}%</span>}
        {o.neo_topic && <span className="absolute right-3 top-3 rounded-full bg-white px-2.5 py-1 text-xs font-bold">Neopatentati</span>}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">{OFFER_CATEGORIES[o.category as keyof typeof OFFER_CATEGORIES] ?? o.category}{o.neo_topic ? ` · ${NEO_TOPICS[o.neo_topic as keyof typeof NEO_TOPICS]}` : ""}</p>
        <h3 className="font-bold leading-snug group-hover:underline">{o.title}</h3>
        <p className="flex items-baseline gap-2"><span className="text-xl font-extrabold">{formatPrice(o.promo_price_cents)}</span><span className="text-sm text-muted line-through">{formatPrice(o.original_price_cents)}</span></p>
        <p className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{o.partner_name} · {o.city ?? "—"}{o.distance_km !== null ? ` · ${String(o.distance_km).replace(".", ",")} km` : ""}</span>
          <span>Fino al {formatDate(o.ends_on)}</span>
          {o.quantity_left !== null && <Badge tone={o.quantity_left <= 3 ? "warning" : "neutral"}>{o.quantity_left} disponibili</Badge>}
        </p>
      </div>
    </Link>
  );
}
