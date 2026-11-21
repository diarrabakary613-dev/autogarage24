import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Car } from "lucide-react";
import { Badge, Container, EmptyState, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/marketing/page-hero";
import { createPublicClient } from "@/lib/supabase/public";
import { formatKm, formatPower, formatPrice } from "@/lib/format";
import { FUEL_LABELS, NEO_LABELS, TRANSMISSION_LABELS } from "@/lib/labels";
import { publicFileUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Confronta automobili", robots: { index: false, follow: true }, alternates: { canonical: "/confronta" } };

export default function ComparePage(props: PageProps<"/confronta">) {
  return (
    <div className="bg-mist pb-16">
      <Container className="py-8">
        <Breadcrumbs items={[{ name: "Auto usate", href: "/auto-usate" }, { name: "Confronta", href: "/confronta" }]} />
        <h1 className="mt-4 text-3xl font-extrabold">Confronta automobili</h1>
        <p className="mt-1 text-muted">Fino a 4 automobili affiancate. Le righe con valori diversi sono evidenziate.</p>
        <Suspense fallback={<Skeleton className="mt-6 h-96" />}><Table searchParams={props.searchParams} /></Suspense>
      </Container>
    </div>
  );
}

async function Table({ searchParams }: { searchParams: PageProps<"/confronta">["searchParams"] }) {
  const sp = await searchParams;
  const slugs = (typeof sp.auto === "string" ? sp.auto : "").split(",").filter((x) => /^[a-z0-9-]{3,140}$/.test(x)).slice(0, 4);
  const supabase = createPublicClient();
  const { data } = slugs.length && supabase ? await supabase.from("listing_search").select("*").in("slug", slugs) : { data: [] };
  const cars = slugs.map((s) => data?.find((d) => d.slug === s)).filter(Boolean) as NonNullable<typeof data>;
  if (cars.length === 0) {
    return <EmptyState className="mt-6" icon={<Car className="size-6" aria-hidden />} title="Nessuna automobile da confrontare" description="Usa il pulsante «Confronta» sulle schede degli annunci per aggiungerne fino a 4." action={<ButtonLink href="/auto-usate">Cerca automobili</ButtonLink>} />;
  }
  const rows: [string, (c: (typeof cars)[number]) => string][] = [
    ["Prezzo", (c) => formatPrice(c.price_cents)],
    ["Marca e modello", (c) => `${c.make_name} ${c.model}${c.version ? ` ${c.version}` : ""}`],
    ["Anno", (c) => (c.year ? String(c.year) : "Non indicato")],
    ["Chilometraggio", (c) => formatKm(c.mileage_km)],
    ["Potenza", (c) => (c.power_kw ? formatPower(c.power_kw) : "Non indicata")],
    ["Alimentazione", (c) => (c.fuel ? FUEL_LABELS[c.fuel] : "Non indicata")],
    ["Cambio", (c) => (c.transmission ? TRANSMISSION_LABELS[c.transmission] : "Non indicato")],
    ["Consumo", (c) => (c.consumption_l100 ? `${c.consumption_l100} l/100 km` : "Non documentato")],
    ["Venditore", (c) => `${c.seller_name} (${c.seller_kind === "professionista" ? "professionista" : "privato"})`],
    ["Località", (c) => c.city ?? "Non indicata"],
    ["Neopatentati", (c) => (c.neo_result ? NEO_LABELS[c.neo_result] : "Da verificare")],
  ];
  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
      <table className="w-full min-w-[640px] text-sm">
        <caption className="sr-only">Confronto tra {cars.length} automobili</caption>
        <thead>
          <tr>
            <th scope="col" className="w-40 p-4 text-left text-muted">Caratteristica</th>
            {cars.map((c) => (
              <th key={c.id} scope="col" className="p-4 text-left align-top">
                <div className="relative mb-2 aspect-[4/3] overflow-hidden rounded-lg bg-mist">
                  {publicFileUrl("listing-images", c.cover_path) ? <Image src={publicFileUrl("listing-images", c.cover_path)!} alt="" fill sizes="240px" className="object-cover" /> : <Car className="m-auto mt-8 size-8 text-muted" aria-hidden />}
                </div>
                <Link href={`/auto/${c.slug}`} className="font-bold hover:underline">{c.title}</Link>
                {c.status !== "pubblicato" && <Badge tone="danger" className="ml-2">Non disponibile</Badge>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, fn]) => {
            const values = cars.map(fn);
            const differs = new Set(values).size > 1;
            return (
              <tr key={label} className={cn("border-t border-line", differs && "bg-orange-50/60")}>
                <th scope="row" className="p-4 text-left font-medium text-muted">{label}{differs && <span className="sr-only"> (valori diversi)</span>}</th>
                {values.map((v, i) => <td key={cars[i].id} className="p-4 font-semibold">{v}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
