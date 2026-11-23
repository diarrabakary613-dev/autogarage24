import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { deleteService, saveService } from "@/lib/actions/professional";
import { formatPrice } from "@/lib/format";
import { PRICE_TYPE_LABELS, WORK_MODE_LABELS } from "@/lib/labels";
import type { Tables } from "@/lib/supabase/database.types";
import { initialFormState, type FormState } from "@/lib/validation/form-state";

export const metadata: Metadata = { title: "Servizi", robots: { index: false } };

export default function ServicesPage(props: PageProps<"/dashboard/servizi">) {
  return (
    <>
      <PageHeader title="Catalogo servizi" description="I servizi compaiono sulla tua pagina pubblica. Se non indichi un prezzo mostriamo «Prezzo su preventivo»." />
      <Suspense fallback={<Skeleton className="h-96" />}><Services searchParams={props.searchParams} /></Suspense>
    </>
  );
}

async function Services({ searchParams }: { searchParams: PageProps<"/dashboard/servizi">["searchParams"] }) {
  const user = await requireUser("/dashboard/servizi");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: profiles } = await supabase.from("professional_profiles").select("id, display_name, professional_type").eq("user_id", user.id).in("professional_type", ["officina", "meccanico"]).is("deleted_at", null);
  if (!profiles?.length) return <EmptyState title="Serve un profilo di officina o meccanico" description="Il catalogo servizi è disponibile per officine e meccanici." action={<Link className="font-semibold text-orange-700" href="/professionisti/registrazione-garage">Registra la tua attività →</Link>} />;
  const p = profiles.find((x) => x.id === sp.profilo) ?? profiles[0];
  const [{ data: services }, { data: cats }] = await Promise.all([
    supabase.from("professional_services").select("*").eq("profile_id", p.id).order("position").order("created_at"),
    supabase.from("business_categories").select("slug, name").in("applies_to", [p.professional_type === "meccanico" ? "meccanico" : "officina", "entrambi"]).order("position"),
  ]);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <div className="flex flex-col gap-3">
        {!services?.length && <EmptyState title="Nessun servizio" description="Aggiungi il primo servizio con il modulo." />}
        {services?.map((s) => (
          <details key={s.id} className="rounded-2xl border border-line bg-white shadow-card">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-4">
              <span className="font-semibold">{s.name} {!s.active && <Badge tone="neutral">Non attivo</Badge>}</span>
              <span className="text-sm">{s.price_type === "su_preventivo" ? "Su preventivo" : `${s.price_type === "a_partire_da" ? "da " : ""}${formatPrice(s.price_cents)}`}</span>
            </summary>
            <div className="border-t border-line p-4">
              <ServiceForm profileId={p.id} cats={cats ?? []} s={s} />
              <ActionForm action={deleteService} submitLabel="Elimina servizio" variant="danger" size="sm" hidden={{ profile_id: p.id, service_id: s.id }} confirm="Eliminare il servizio?" className="mt-3" />
            </div>
          </details>
        ))}
      </div>
      <Card className="p-5 lg:sticky lg:top-24 lg:self-start">
        <h2 className="mb-3 font-bold">Nuovo servizio</h2>
        <ServiceForm profileId={p.id} cats={cats ?? []} />
      </Card>
    </div>
  );
}

function ServiceForm({ profileId, cats, s }: { profileId: string; cats: { slug: string; name: string }[]; s?: Tables<"professional_services"> }) {
  const k = s?.id ?? "new";
  return (
    <ActionForm action={saveService} submitLabel={s ? "Salva" : "Aggiungi"} hidden={{ profile_id: profileId, service_id: s?.id }} resetOnSuccess={!s}>
      {((st: FormState) => (
        <div className="grid gap-3">
          <Field id={`sv-n-${k}`} label="Nome" error={st.fieldErrors?.name}><Input id={`sv-n-${k}`} name="name" defaultValue={s?.name} placeholder="Es. Tagliando completo" /></Field>
          <Field id={`sv-c-${k}`} label="Categoria" optional><Select id={`sv-c-${k}`} name="category" defaultValue={s?.category ?? ""}><option value="">—</option>{cats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</Select></Field>
          <Field id={`sv-d-${k}`} label="Descrizione" optional><Textarea id={`sv-d-${k}`} name="description" rows={2} defaultValue={s?.description ?? ""} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id={`sv-pt-${k}`} label="Prezzo" error={st.fieldErrors?.price_type}><Select id={`sv-pt-${k}`} name="price_type" defaultValue={s?.price_type ?? "su_preventivo"}>{Object.entries(PRICE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
            <Field id={`sv-p-${k}`} label="Importo (€)" optional error={st.fieldErrors?.price}><Input id={`sv-p-${k}`} name="price" inputMode="decimal" defaultValue={s?.price_cents !== null && s?.price_cents !== undefined ? String(s.price_cents / 100).replace(".", ",") : ""} /></Field>
          </div>
          <Field id={`sv-du-${k}`} label="Durata indicativa" optional><Input id={`sv-du-${k}`} name="duration_text" defaultValue={s?.duration_text ?? ""} /></Field>
          <Field id={`sv-vt-${k}`} label="Veicoli o marche supportate" optional><Input id={`sv-vt-${k}`} name="vehicle_types" defaultValue={s?.vehicle_types ?? ""} /></Field>
          <Field id={`sv-wm-${k}`} label="Modalità" optional><Select id={`sv-wm-${k}`} name="work_mode" defaultValue={s?.work_mode ?? ""}><option value="">—</option>{Object.entries(WORK_MODE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
          <Checkbox id={`sv-a-${k}`} name="active" value="on" defaultChecked={s?.active ?? true} label="Servizio attivo" />
        </div>
      ))(initialFormState)}
    </ActionForm>
  );
}
