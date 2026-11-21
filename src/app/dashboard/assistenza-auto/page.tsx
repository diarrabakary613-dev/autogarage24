import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AlertOctagon, Phone } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { RequestForm } from "@/components/requests/request-form";
import { ProCard, type ProCardData } from "@/components/professionals/pro-card";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { dangerSignals, PROBLEM_CATEGORIES, suggestCategory, type ProblemCategory } from "@/lib/garage/symptoms";
import { searchProfessionals, parseProFilters, getCategories } from "@/lib/data/professionals";

export const metadata: Metadata = { title: "Assistenza per la mia auto", robots: { index: false } };

export default function AssistancePage(props: PageProps<"/dashboard/assistenza-auto">) {
  return (
    <>
      <PageHeader title="Assistenza per la mia auto" description="Descrivi il problema: ti aiutiamo a trovare il professionista adatto. Non è una diagnosi e non sostituisce il controllo di un meccanico." />
      <Suspense fallback={<Skeleton className="h-96" />}><Assistance searchParams={props.searchParams} /></Suspense>
    </>
  );
}

async function Assistance({ searchParams }: { searchParams: PageProps<"/dashboard/assistenza-auto">["searchParams"] }) {
  await requireUser("/dashboard/assistenza-auto");
  const sp = await searchParams;
  const s = (k: string, max = 1500) => (typeof sp[k] === "string" ? (sp[k] as string).slice(0, max) : "");
  const supabase = await createClient();
  const { data: vehicles } = await supabase.from("user_vehicles").select("id, make, model, version, year").is("deleted_at", null).order("is_primary", { ascending: false });
  const description = s("descrizione");
  const city = s("citta", 80);
  const chosenCat = (s("categoria") in PROBLEM_CATEGORIES ? s("categoria") : description ? suggestCategory(description) : "") as ProblemCategory | "";
  const danger = description ? dangerSignals(description) : [];
  const pro = s("pro", 40);

  return (
    <div className="flex flex-col gap-6">
      {danger.length > 0 && (
        <div role="alert" className="flex gap-3 rounded-2xl border-2 border-danger bg-danger-50 p-5">
          <AlertOctagon className="size-7 shrink-0 text-danger" aria-hidden />
          <div>
            <p className="text-lg font-bold text-danger">Attenzione: i sintomi descritti potrebbero essere pericolosi</p>
            <p className="mt-1 text-sm">Se sei alla guida, fermati appena possibile in un luogo sicuro, accendi le luci di emergenza e non proseguire. Contatta il soccorso stradale o un professionista qualificato. In caso di fumo o fiamme allontanati dal veicolo e chiama il <strong>112</strong>.</p>
            <p className="mt-1 text-xs text-muted">Segnali rilevati nel testo: {danger.join(", ")}. Non possiamo stabilire se l&apos;auto sia sicura da guidare.</p>
          </div>
        </div>
      )}
      <Card className="p-6">
        <form method="get" className="grid gap-4 sm:grid-cols-2">
          <Field id="as-v" label="Automobile"><Select id="as-v" name="auto" defaultValue={s("auto", 40)}>{(vehicles ?? []).map((v) => <option key={v.id} value={v.id}>{v.make} {v.model} {v.year ?? ""}</option>)}<option value="">Altra automobile</option></Select></Field>
          <Field id="as-c" label="Categoria del problema" hint="Se non sai, la suggeriamo dalla descrizione."><Select id="as-c" name="categoria" defaultValue={s("categoria")}><option value="">Suggerisci tu</option>{Object.entries(PROBLEM_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field>
          <Field id="as-d" label="Descrivi il problema" className="sm:col-span-2" hint="Rumori, spie accese, quando succede (a freddo, in frenata…)."><Textarea id="as-d" name="descrizione" rows={4} defaultValue={description} maxLength={1500} /></Field>
          <Field id="as-w" label="Da quando?" optional><Input id="as-w" name="da_quando" defaultValue={s("da_quando", 200)} /></Field>
          <Field id="as-l" label="Città o zona (se serve assistenza sul posto)" optional><Input id="as-l" name="citta" defaultValue={city} /></Field>
          <div className="sm:col-span-2"><button className="rounded-md bg-orange px-5 py-2.5 font-semibold text-ink">Trova professionisti adatti</button></div>
        </form>
      </Card>
      {description && chosenCat && !pro && <Suggestions cat={chosenCat} city={city} sp={sp} />}
      {pro && /^[0-9a-f-]{36}$/.test(pro) && (
        <Card className="p-6">
          <h2 className="mb-3 text-lg font-bold">Invia la richiesta di assistenza</h2>
          <RequestForm
            kinds={[{ value: "assistenza", label: "Richiesta di assistenza" }]}
            target={{ professional_profile_id: pro }}
            showVehicle
            vehicles={(vehicles ?? []).map((v) => ({ id: v.id, label: [v.make, v.model, v.version, v.year].filter(Boolean).join(" ") }))}
            workModes={[{ value: "sede", label: "Porto io l'auto in sede" }, { value: "mobile", label: "Intervento sul posto" }]}
            defaultSubject={`Assistenza: ${chosenCat ? PROBLEM_CATEGORIES[chosenCat].label : "problema auto"}`}
            defaultMessage={[description, s("da_quando", 200) && `Da quando: ${s("da_quando", 200)}`, city && `Zona: ${city}`].filter(Boolean).join("\n")}
            returnTo="/dashboard/assistenza-auto"
          />
        </Card>
      )}
      <Alert tone="info"><Phone className="mr-1 inline size-4" aria-hidden /> In caso di guasto in strada o incidente usa i numeri di soccorso stradale della tua assicurazione o il 112. AutoGarage24 non offre un servizio di emergenza.</Alert>
    </div>
  );
}

async function Suggestions({ cat, city, sp }: { cat: ProblemCategory; city: string; sp: Record<string, string | string[] | undefined> }) {
  const c = PROBLEM_CATEGORIES[cat];
  const [mech, gar, mCats, gCats] = await Promise.all([
    searchProfessionals("meccanico", { ...parseProFilters({}), categoria: c.category || undefined, citta: city || undefined }),
    searchProfessionals("officina", { ...parseProFilters({}), categoria: c.garageCategory, citta: city || undefined }),
    getCategories("meccanico"), getCategories("officina"),
  ]);
  const names = new Map([...mCats, ...gCats].map((x) => [x.slug, x.name]));
  const items = [...(gar.items as ProCardData[]).map((p) => ({ p, base: "/garages" })), ...(mech.items as ProCardData[]).map((p) => ({ p, base: "/meccanici" }))].slice(0, 9);
  const keep = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]);
  return (
    <section aria-labelledby="sug-t" className="flex flex-col gap-3">
      <h2 id="sug-t" className="text-lg font-bold">Professionisti per: {c.label}{city ? ` · ${city}` : ""}</h2>
      {items.length === 0 ? (
        <EmptyState title="Nessun professionista trovato" description="Prova senza indicare la città o cerca direttamente tra officine e meccanici." action={<div className="flex gap-2"><ButtonLink href="/garages" size="sm">Officine</ButtonLink><ButtonLink href="/meccanici" size="sm" variant="outline">Meccanici</ButtonLink></div>} />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map(({ p, base }) => { keep.set("pro", p.id); return (
            <li key={p.id} className="flex flex-col gap-2">
              <ProCard p={p} base={base} categoryNames={names} favorite={null} />
              <Link href={`/dashboard/assistenza-auto?${keep}`} className="rounded-md bg-ink px-4 py-2 text-center text-sm font-semibold text-white">Chiedi assistenza a {p.display_name}</Link>
            </li>
          ); })}
        </ul>
      )}
    </section>
  );
}
