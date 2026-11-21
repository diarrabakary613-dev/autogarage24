import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { TARGET_STATUS } from "@/lib/valuation/labels";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Richieste di valutazione ricevute", robots: { index: false } };

export default function ProValuationsPage(props: PageProps<"/dashboard/valutazioni/professionista">) {
  return (
    <>
      <PageHeader title="Richieste di valutazione ricevute" description="Auto che i clienti ti chiedono di valutare o acquistare. Vedi solo i dati e le foto che hanno scelto di condividere." />
      <Suspense fallback={<Skeleton className="h-64" />}><List searchParams={props.searchParams} /></Suspense>
    </>
  );
}

async function List({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser("/dashboard/valutazioni/professionista");
  const sp = await searchParams;
  const g = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim().toLowerCase() : "");
  const supabase = await createClient();
  const { data: profiles } = await supabase.from("professional_profiles").select("id").eq("user_id", user.id);
  const ids = (profiles ?? []).map((p) => p.id);
  if (!ids.length) return <EmptyState title="Sezione riservata ai professionisti" />;
  const { data } = await supabase.from("valuation_request_targets").select("request_id, status, created_at, valuation_requests(intent, status, vehicle_valuations(make, model, year, mileage_km, province))").in("profile_id", ids).order("created_at", { ascending: false }).limit(200);
  const rows = (data ?? []).map((t) => { const r = t.valuation_requests as unknown as { intent: string; status: string; vehicle_valuations: { make: string; model: string; year: number; mileage_km: number; province: string } }; return { ...t, r, v: r.vehicle_valuations }; })
    .filter((x) => (!g("marca") || x.v.make.toLowerCase().includes(g("marca"))) && (!g("modello") || x.v.model.toLowerCase().includes(g("modello")))
      && (!g("anno") || x.v.year >= Number(g("anno"))) && (!g("km") || x.v.mileage_km <= Number(g("km"))) && (!g("provincia") || x.v.province.toLowerCase() === g("provincia")));
  return (
    <>
      <form className="mb-4 grid gap-2 rounded-2xl border border-line bg-white p-3 sm:grid-cols-6">
        <Field id="f-m" label="Marca"><Input id="f-m" name="marca" defaultValue={g("marca")} /></Field>
        <Field id="f-o" label="Modello"><Input id="f-o" name="modello" defaultValue={g("modello")} /></Field>
        <Field id="f-a" label="Anno dal"><Input id="f-a" name="anno" type="number" defaultValue={g("anno")} /></Field>
        <Field id="f-k" label="Km fino a"><Input id="f-k" name="km" type="number" defaultValue={g("km")} /></Field>
        <Field id="f-p" label="Provincia"><Input id="f-p" name="provincia" maxLength={2} defaultValue={g("provincia").toUpperCase()} /></Field>
        <div className="flex items-end"><button className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">Filtra</button></div>
      </form>
      {!rows.length ? <EmptyState title="Nessuna richiesta" /> : (
        <ul className="flex flex-col gap-2">{rows.map((x) => (
          <li key={x.request_id}><Card className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div><p className="font-bold"><Link className="hover:underline" href={`/dashboard/valutazioni/professionista/${x.request_id}`}>{x.v.make} {x.v.model} {x.v.year}</Link></p>
              <p className="text-sm text-muted">{x.v.mileage_km.toLocaleString("it-IT")} km · {x.v.province} · {x.r.intent === "vendita" ? "valutazione e acquisto" : "solo valutazione"} · {formatDateTime(x.created_at)}</p></div>
            <Badge tone={x.r.status !== "aperta" ? "neutral" : TARGET_STATUS[x.status].tone}>{x.r.status !== "aperta" ? x.r.status : TARGET_STATUS[x.status].label}</Badge>
          </Card></li>))}</ul>
      )}
    </>
  );
}
