import Image from "next/image";
import Link from "next/link";
import { Building2, Car, Fuel, Gauge, MapPin, Settings2, User } from "lucide-react";
import { Badge } from "@/components/ui/feedback";
import { formatKm, formatPrice } from "@/lib/format";
import { FUEL_LABELS, NEO_LABELS, TRANSMISSION_LABELS } from "@/lib/labels";
import { publicFileUrl } from "@/lib/storage";
import type { ListingCardData } from "@/lib/data/listings";
import { FavoriteButton } from "./favorite-button";
import { CompareToggle } from "./compare";

const NEO_TONE = { compatibile: "success", non_compatibile: "danger", da_verificare: "warning" } as const;

/** Card annuncio: tutti i dati provengono dal database, nessun valore inventato. */
export function ListingCard({ item, favorite, showNeo = false }: { item: ListingCardData; favorite: boolean | null; showNeo?: boolean }) {
  const img = publicFileUrl("listing-images", item.cover_path);
  const href = `/auto/${item.slug}`;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="relative aspect-[4/3] bg-mist">
        {img ? (
          <Image src={img} alt={`${item.make_name} ${item.model}`} fill sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-muted"><Car className="size-10" aria-hidden /></div>
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Badge tone="dark">
            {item.seller_kind === "professionista" ? <Building2 className="size-3" aria-hidden /> : <User className="size-3" aria-hidden />}
            {item.seller_kind === "professionista" ? "Professionista" : "Privato"}
          </Badge>
          {item.status === "venduto" && <Badge tone="danger">Venduto</Badge>}
        </div>
        {favorite !== null && item.id && (
          <div className="absolute top-3 right-3 z-10">
            <FavoriteButton kind="listing" id={item.id} initial={favorite} label={item.title ?? ""} />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">{item.make_name} · {item.year ?? "anno n.d."}</p>
          <h3 className="mt-0.5 line-clamp-2 text-lg leading-snug font-bold">
            <Link href={href} className="after:absolute after:inset-0">
              {item.model} {item.version && <span className="font-medium text-graphite">{item.version}</span>}
            </Link>
          </h3>
        </div>
        <p className="font-display text-2xl font-extrabold text-ink">
          {formatPrice(item.price_cents)}
          {item.negotiable && <span className="ml-2 align-middle text-xs font-semibold text-muted">trattabile</span>}
        </p>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm text-graphite">
          <li className="flex items-center gap-1.5"><Gauge className="size-4 text-muted" aria-hidden />{formatKm(item.mileage_km)}</li>
          <li className="flex items-center gap-1.5"><Fuel className="size-4 text-muted" aria-hidden />{item.fuel ? FUEL_LABELS[item.fuel] : "—"}</li>
          <li className="flex items-center gap-1.5"><Settings2 className="size-4 text-muted" aria-hidden />{item.transmission ? TRANSMISSION_LABELS[item.transmission] : "—"}</li>
          <li className="flex items-center gap-1.5"><MapPin className="size-4 text-muted" aria-hidden /><span className="truncate">{item.city ?? "—"}</span></li>
        </ul>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <span className="truncate text-xs text-muted">{item.seller_name}</span>
          {showNeo && item.neo_result && <Badge tone={NEO_TONE[item.neo_result]}>{NEO_LABELS[item.neo_result]}</Badge>}
          {item.slug && item.status === "pubblicato" && <CompareToggle slug={item.slug} title={`${item.make_name} ${item.model}`} />}
          {!showNeo && <span className="text-sm font-bold text-orange-700">Vedi dettagli →</span>}
        </div>
      </div>
    </article>
  );
}
