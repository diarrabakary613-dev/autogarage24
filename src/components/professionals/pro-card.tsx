import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, MapPin, Star, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/feedback";
import { FavoriteButton } from "@/components/marketplace/favorite-button";
import { publicFileUrl } from "@/lib/storage";
import { WORK_MODE_LABELS } from "@/lib/labels";
import type { Enums } from "@/lib/supabase/database.types";

export type ProCardData = {
  id: string; slug: string; display_name: string; description: string | null; city: string | null; province: string | null;
  categories: string[] | null; work_modes: Enums<"work_mode">[] | null; experience_years: number | null; logo_path: string | null;
  distance_km: number | null; business_verified: boolean; identity_verified: boolean; rating_avg: number | null; rating_count: number;
};

/** Card professionista: badge e valutazioni solo se reali (verifica completata, recensioni pubblicate). */
export function ProCard({ p, base, categoryNames, favorite }: { p: ProCardData; base: string; categoryNames: Map<string, string>; favorite: boolean | null }) {
  const logo = publicFileUrl("business-media", p.logo_path);
  return (
    <article className="relative flex h-full flex-col gap-3 rounded-2xl border border-line bg-white p-5 shadow-card transition-shadow hover:shadow-lift">
      <div className="flex items-start gap-3">
        <span className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-mist">
          {logo ? <Image src={logo} alt="" fill sizes="56px" className="object-cover" /> : <Wrench className="size-6 text-muted" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold"><Link href={`${base}/${p.slug}`} className="after:absolute after:inset-0">{p.display_name}</Link></h3>
          <p className="flex items-center gap-1 text-sm text-muted"><MapPin className="size-3.5" aria-hidden />{[p.city, p.province].filter(Boolean).join(" · ") || "Località non indicata"}{p.distance_km !== null && ` · ${p.distance_km.toLocaleString("it-IT")} km`}</p>
        </div>
        {favorite !== null && <div className="relative z-10"><FavoriteButton kind="profile" id={p.id} initial={favorite} label={p.display_name} /></div>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {p.business_verified && <Badge tone="success"><BadgeCheck className="size-3" aria-hidden /> Attività verificata</Badge>}
        {!p.business_verified && p.identity_verified && <Badge tone="success"><BadgeCheck className="size-3" aria-hidden /> Identità verificata</Badge>}
        {p.rating_count > 0 && p.rating_avg !== null && <Badge tone="neutral"><Star className="size-3 fill-orange text-orange" aria-hidden /> {p.rating_avg.toLocaleString("it-IT")} ({p.rating_count})</Badge>}
        {p.work_modes?.map((m) => <Badge key={m} tone="neutral">{WORK_MODE_LABELS[m]}</Badge>)}
      </div>
      {p.description && <p className="line-clamp-2 text-sm text-graphite">{p.description}</p>}
      {(p.categories?.length ?? 0) > 0 && <p className="mt-auto text-xs text-muted">{p.categories!.slice(0, 4).map((c) => categoryNames.get(c) ?? c).join(" · ")}</p>}
      {p.experience_years !== null && <p className="text-xs text-muted">Esperienza dichiarata: {p.experience_years} anni</p>}
    </article>
  );
}
